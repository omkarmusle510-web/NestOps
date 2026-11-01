const assert = require("node:assert/strict");
const { test } = require("node:test");

const projectId = process.env.GCLOUD_PROJECT || "demo-proplock";
process.env.GCLOUD_PROJECT = projectId;
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= "127.0.0.1:9199";

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp: initializeClientApp } = require("firebase/app");
const {
  connectAuthEmulator,
  initializeAuth,
  inMemoryPersistence,
  signInWithEmailAndPassword,
} = require("firebase/auth");
const {
  connectStorageEmulator,
  getStorage,
  ref,
  uploadBytes,
} = require("firebase/storage");

global.XMLHttpRequest = require("xhr2");

const app = initializeApp({
  projectId,
  storageBucket: `${projectId}.appspot.com`,
});
const db = getFirestore(app);

const callableUrl = (name) =>
  `http://127.0.0.1:5001/${projectId}/us-central1/${name}`;
const authSignupUrl =
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key";

async function createUser(label) {
  const email = `${label}@example.test`;
  const password = "Proplock-test-1234";
  const response = await fetch(authSignupUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, JSON.stringify(body));
  return { uid: body.localId, token: body.idToken, email, password };
}

async function callFunction(name, user, data) {
  return fetch(callableUrl(name), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  });
}

async function callOk(name, user, data) {
  const response = await callFunction(name, user, data);
  const body = await response.json();
  assert.equal(response.ok, true, `${name}: ${JSON.stringify(body)}`);
  return body.result;
}

async function callError(name, user, data, apiCode) {
  const response = await callFunction(name, user, data);
  const body = await response.json();
  assert.equal(response.ok, false, `${name} unexpectedly succeeded.`);
  assert.equal(body.error?.details?.apiCode, apiCode, JSON.stringify(body));
  return body.error;
}

async function addMembership(user, organizationId, role) {
  await db.collection("memberships").doc(`${user.uid}__${organizationId}`).set({
    uid: user.uid,
    organizationId,
    role,
    active: true,
  });
}

async function uploadImage(user, path, ownerUid = user.uid) {
  const clientApp = initializeClientApp(
    {
      apiKey: "fake-api-key",
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: `${projectId}.appspot.com`,
    },
    `client-${user.uid}`,
  );
  const auth = initializeAuth(clientApp, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  await signInWithEmailAndPassword(auth, user.email, user.password);
  const storage = getStorage(clientApp);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  return uploadBytes(
    ref(storage, path),
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    {
      contentType: "image/png",
      customMetadata: { ownerUid },
    },
  );
}

test(
  "PROPLOCK enforces owner handoff, versioning, worker evidence, repair verification, and scoped rules",
  { timeout: 90000 },
  async () => {
    try {
      const [residentA, residentB, managerA, managerB, federationRep, worker] =
        await Promise.all([
          createUser("resident-a"),
          createUser("resident-b"),
          createUser("manager-a"),
          createUser("manager-b"),
          createUser("federation-rep"),
          createUser("repair-worker"),
        ]);

      const orgs = [
        { id: "society_a", type: "society" },
        { id: "society_b", type: "society" },
        { id: "federation_x", type: "federation" },
        { id: "vendor_1", type: "vendor" },
      ];
      await Promise.all(
        orgs.map(({ id, type }) =>
          db.collection("organizations").doc(id).set({
            organizationId: id,
            name: id,
            type,
          }),
        ),
      );
      await Promise.all([
        addMembership(residentA, "society_a", "resident"),
        addMembership(residentB, "society_b", "resident"),
        addMembership(managerA, "society_a", "society_manager"),
        addMembership(managerB, "society_b", "society_manager"),
        addMembership(federationRep, "federation_x", "federation_representative"),
        addMembership(worker, "vendor_1", "maintenance_worker"),
      ]);
      await Promise.all([
        db.collection("buildings").doc("building_a").set({
          buildingId: "building_a",
          layoutId: "layout_1",
          societyOrgId: "society_a",
          name: "Society A",
        }),
        db.collection("buildings").doc("building_b").set({
          buildingId: "building_b",
          layoutId: "layout_1",
          societyOrgId: "society_b",
          name: "Society B",
        }),
        db.collection("assets").doc("asset_d03").set({
          assetId: "asset_d03",
          name: "D-03 shared pump",
          scope: "layout_shared",
          ownerOrgId: "society_a",
          relatedBuildingIds: ["building_a", "building_b"],
          assetType: "water_pump",
        }),
      ]);

      for (const [incidentId, user, buildingId] of [
        ["incident_a", residentA, "building_a"],
        ["incident_b", residentB, "building_b"],
      ]) {
        await callOk("createIncident", user, {
          incidentId,
          buildingId,
          assetId: "asset_d03",
          category: "water_supply",
          description: "The shared pump is leaking.",
          photoRefs: [],
        });
      }

      const linked = await callOk("linkIncidentsToSharedCase", managerA, {
        caseId: "case_handoff",
        actorOrgId: "society_a",
        commandId: "link_case_handoff",
        expectedVersion: 0,
        incidentIds: ["incident_a", "incident_b"],
      });
      assert.equal(linked.case.currentOwnerOrgId, "society_a");
      assert.equal(linked.case.version, 1);

      const proposalRequest = {
        caseId: "case_handoff",
        actorOrgId: "society_a",
        commandId: "propose_handoff",
        expectedVersion: 1,
        proposedRecipientOrgId: "federation_x",
        reason: "The shared pump affects both societies.",
      };
      const proposed = await callOk("proposeHandoff", managerA, proposalRequest);
      assert.equal(proposed.case.currentOwnerOrgId, "society_a");
      assert.equal(proposed.case.proposedRecipientOrgId, "federation_x");
      assert.equal(proposed.case.status, "handoff_pending");
      assert.deepEqual(
        await callOk("proposeHandoff", managerA, proposalRequest),
        proposed,
        "same-command retry must return its original result",
      );
      await callError(
        "proposeHandoff",
        managerA,
        {
          ...proposalRequest,
          commandId: "stale_handoff",
          expectedVersion: 1,
        },
        "VERSION_CONFLICT",
      );

      const accepted = await callOk("decideHandoff", federationRep, {
        caseId: "case_handoff",
        actorOrgId: "federation_x",
        commandId: "accept_handoff",
        expectedVersion: 2,
        decision: "accept",
      });
      assert.equal(accepted.case.currentOwnerOrgId, "federation_x");
      assert.equal(accepted.case.proposedRecipientOrgId, null);

      await callOk("createWorkOrder", federationRep, {
        caseId: "case_handoff",
        actorOrgId: "federation_x",
        commandId: "create_work_order",
        expectedVersion: 3,
        workOrderId: "work_order_1",
        assignedTo: worker.uid,
        assignedToOrgId: "vendor_1",
        instructions: "Inspect and repair the shared pump.",
      });
      await callOk("updateWorkOrderStatus", worker, {
        caseId: "case_handoff",
        actorOrgId: "vendor_1",
        commandId: "start_work",
        expectedVersion: 4,
        workOrderId: "work_order_1",
        status: "in_progress",
      });

      const evidencePath =
        `propLock/evidence/case_handoff/work_order_1/${worker.uid}/repair.png`;
      await uploadImage(worker, evidencePath);
      await callOk("finalizeEvidenceUpload", worker, {
        caseId: "case_handoff",
        actorOrgId: "vendor_1",
        commandId: "finalize_evidence",
        expectedVersion: 5,
        workOrderId: "work_order_1",
        evidenceId: "evidence_1",
        storagePath: evidencePath,
      });
      await callOk("updateWorkOrderStatus", worker, {
        caseId: "case_handoff",
        actorOrgId: "vendor_1",
        commandId: "submit_for_verification",
        expectedVersion: 6,
        workOrderId: "work_order_1",
        status: "awaiting_verification",
        completionNote: "Replaced the damaged seal and tested the pump.",
      });
      const verified = await callOk("verifyRepair", federationRep, {
        caseId: "case_handoff",
        actorOrgId: "federation_x",
        commandId: "verify_repair",
        expectedVersion: 7,
        workOrderId: "work_order_1",
        action: "verify",
      });
      assert.equal(verified.case.status, "closed");
      assert.equal(verified.workOrder.status, "completed");
      const reopened = await callOk("verifyRepair", residentB, {
        caseId: "case_handoff",
        actorOrgId: "society_b",
        commandId: "reopen_repair",
        expectedVersion: 8,
        workOrderId: "work_order_1",
        action: "reopen",
        reason: "The leak returned after the repair.",
      });
      assert.equal(reopened.case.status, "reopened");
      assert.equal(reopened.workOrder.status, "completed");

      await callOk("createIncident", residentA, {
        incidentId: "incident_dispute",
        buildingId: "building_a",
        assetId: "asset_d03",
        category: "water_supply",
        description: "The pump vibration is increasing.",
        photoRefs: [],
      });
      await callOk("linkIncidentsToSharedCase", managerA, {
        caseId: "case_dispute",
        actorOrgId: "society_a",
        commandId: "link_case_dispute",
        expectedVersion: 0,
        incidentIds: ["incident_dispute"],
      });
      await callOk("proposeHandoff", managerA, {
        caseId: "case_dispute",
        actorOrgId: "society_a",
        commandId: "propose_dispute",
        expectedVersion: 1,
        proposedRecipientOrgId: "federation_x",
        reason: "The asset spans the shared layout.",
      });
      const disputed = await callOk("decideHandoff", federationRep, {
        caseId: "case_dispute",
        actorOrgId: "federation_x",
        commandId: "dispute_handoff",
        expectedVersion: 2,
        decision: "dispute",
        reason: "The report needs more local inspection.",
      });
      assert.equal(disputed.case.currentOwnerOrgId, "society_a");
      assert.equal(disputed.case.proposedRecipientOrgId, null);
      assert.equal(disputed.case.status, "handoff_disputed");

      const ownerCase = await db.collection("sharedCases").doc("case_handoff").get();
      assert.equal(ownerCase.data().currentOwnerOrgId, "federation_x");
      assert.equal(ownerCase.data().version, 9);
      assert.equal((await ownerCase.ref.collection("events").get()).size, 9);

      const directWriteResponse = await fetch(
        `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/sharedCases/case_handoff?updateMask.fieldPaths=currentOwnerOrgId`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${residentA.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: { currentOwnerOrgId: { stringValue: "society_b" } },
          }),
        },
      );
      assert.equal(directWriteResponse.ok, false, await directWriteResponse.text());

      const workerRoleResponse = await fetch(
        `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users?documentId=${worker.uid}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${worker.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields: { role: { stringValue: "worker" } } }),
        },
      );
      assert.equal(workerRoleResponse.ok, false, await workerRoleResponse.text());

      await assert.rejects(() => uploadImage(
        federationRep,
        `propLock/incidents/unauthorized/building_a/${federationRep.uid}/image.png`,
      ));
    } finally {
      await app.delete();
    }
  },
);
