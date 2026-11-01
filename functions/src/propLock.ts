import { getStorage } from "firebase-admin/storage";
import {
  FieldValue,
  getFirestore,
  type DocumentSnapshot,
  type Transaction,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { onCall } from "firebase-functions/v2/https";
import {
  INCIDENT_CATEGORIES,
  type Building,
  type CaseCommand,
  type Evidence,
  type Incident,
  type Membership,
  type MembershipRole,
  type Organization,
  type SharedAsset,
  type SharedCase,
  type SharedCaseStatus,
  type WorkOrder,
  type WorkOrderStatus,
} from "./models";

const db = getFirestore();
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "INVALID_ARGUMENT"
  | "FAILED_PRECONDITION"
  | "VERSION_CONFLICT"
  | "DUPLICATE_COMMAND"
  | "INTERNAL";

const FIREBASE_ERROR_CODES: Record<
  ApiErrorCode,
  ConstructorParameters<typeof HttpsError>[0]
> = {
  UNAUTHENTICATED: "unauthenticated",
  PERMISSION_DENIED: "permission-denied",
  NOT_FOUND: "not-found",
  INVALID_ARGUMENT: "invalid-argument",
  FAILED_PRECONDITION: "failed-precondition",
  VERSION_CONFLICT: "failed-precondition",
  DUPLICATE_COMMAND: "already-exists",
  INTERNAL: "internal",
};

interface MembershipContext {
  membership: Membership;
  organization: Organization;
}

interface CommandReceiptData {
  actorUid: string;
  commandType: string;
  result: Record<string, unknown>;
}

interface TransactionCommand extends CaseCommand {
  actorUid: string;
  commandType: string;
  allowedRoles: MembershipRole[];
  allowMissingCase?: boolean;
}

interface CreateIncidentRequest {
  incidentId: string;
  buildingId: string;
  assetId: string;
  category: string;
  description: string;
  photoRefs: string[];
}

interface LinkIncidentsRequest extends CaseCommand {
  incidentIds: string[];
}

interface ProposeHandoffRequest extends CaseCommand {
  proposedRecipientOrgId: string;
  reason: string;
}

interface DecideHandoffRequest extends CaseCommand {
  decision: "accept" | "dispute" | "request_information";
  reason?: string;
}

interface CreateWorkOrderRequest extends CaseCommand {
  workOrderId: string;
  assignedTo: string;
  assignedToOrgId: string;
  instructions: string;
}

interface UpdateWorkOrderStatusRequest extends CaseCommand {
  workOrderId: string;
  status: "in_progress" | "awaiting_verification";
  completionNote?: string;
}

interface FinalizeEvidenceRequest extends CaseCommand {
  workOrderId: string;
  evidenceId: string;
  storagePath: string;
}

interface VerifyRepairRequest extends CaseCommand {
  workOrderId: string;
  action: "verify" | "reopen";
  reason?: string;
}

function raise(code: ApiErrorCode, message: string): never {
  throw new HttpsError(FIREBASE_ERROR_CODES[code], message, { apiCode: code });
}

function requireUid(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) {
    raise("UNAUTHENTICATED", "Sign in to perform this action.");
  }
  return uid;
}

function requiredString(
  value: unknown,
  name: string,
  maxLength = 256,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maxLength
  ) {
    raise("INVALID_ARGUMENT", `${name} is required and must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function optionalReason(value: unknown, required: boolean): string {
  if (typeof value !== "string") {
    if (required) {
      raise("INVALID_ARGUMENT", "A reason is required.");
    }
    return "";
  }
  const reason = value.trim();
  if (required && reason.length === 0) {
    raise("INVALID_ARGUMENT", "A reason is required.");
  }
  if (reason.length > 1000) {
    raise("INVALID_ARGUMENT", "The reason must be at most 1000 characters.");
  }
  return reason;
}

function requiredVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    raise("INVALID_ARGUMENT", "expectedVersion must be a non-negative integer.");
  }
  return value as number;
}

function validateId(value: unknown, name: string): string {
  const id = requiredString(value, name, 128);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    raise("INVALID_ARGUMENT", `${name} contains unsupported characters.`);
  }
  return id;
}

function membershipRef(uid: string, organizationId: string) {
  return db.collection("memberships").doc(`${uid}__${organizationId}`);
}

function organizationRef(organizationId: string) {
  return db.collection("organizations").doc(organizationId);
}

function caseRef(caseId: string) {
  return db.collection("sharedCases").doc(caseId);
}

function caseEventRef(caseId: string) {
  return caseRef(caseId).collection("events").doc();
}

function receiptRef(commandId: string) {
  return db.collection("commandReceipts").doc(commandId);
}

function validateMembership(
  membershipSnapshot: DocumentSnapshot,
  organizationSnapshot: DocumentSnapshot,
  uid: string,
  organizationId: string,
): MembershipContext {
  if (!membershipSnapshot.exists || !organizationSnapshot.exists) {
    raise("PERMISSION_DENIED", "An active organization membership is required.");
  }
  const membership = membershipSnapshot.data() as Membership;
  const organization = organizationSnapshot.data() as Organization;
  if (
    membership.uid !== uid ||
    membership.organizationId !== organizationId ||
    membership.active !== true
  ) {
    raise("PERMISSION_DENIED", "An active organization membership is required.");
  }
  return { membership, organization };
}

function requireRole(
  membership: Membership,
  allowedRoles: MembershipRole[],
): void {
  if (!allowedRoles.includes(membership.role)) {
    raise("PERMISSION_DENIED", "Your organization role cannot perform this action.");
  }
}

function timestampString(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as FirebaseFirestore.Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

function eventValues(fromValue: unknown, toValue: unknown): [string, string] {
  return [JSON.stringify(fromValue), JSON.stringify(toValue)];
}

function appendCaseEvent(
  transaction: Transaction,
  command: CaseCommand & { actorUid: string },
  action: string,
  reason: string,
  fromValue: unknown,
  toValue: unknown,
): void {
  const [from, to] = eventValues(fromValue, toValue);
  const eventRef = caseEventRef(command.caseId);
  transaction.create(eventRef, {
    eventId: eventRef.id,
    actorUid: command.actorUid,
    actorOrgId: command.actorOrgId,
    action,
    reason,
    fromValue: from,
    toValue: to,
    timestamp: FieldValue.serverTimestamp(),
    commandId: command.commandId,
  });
}

async function runCaseCommand<R extends Record<string, unknown>>(
  command: TransactionCommand,
  handler: (
    transaction: Transaction,
    caseSnapshot: DocumentSnapshot,
    membershipContext: MembershipContext,
  ) => Promise<R>,
): Promise<R> {
  return db.runTransaction(async (transaction) => {
    const [membershipSnapshot, organizationSnapshot] = await Promise.all([
      transaction.get(membershipRef(command.actorUid, command.actorOrgId)),
      transaction.get(organizationRef(command.actorOrgId)),
    ]);
    const context = validateMembership(
      membershipSnapshot,
      organizationSnapshot,
      command.actorUid,
      command.actorOrgId,
    );
    requireRole(context.membership, command.allowedRoles);

    const receiptSnapshot = await transaction.get(receiptRef(command.commandId));
    if (receiptSnapshot.exists) {
      const previous = receiptSnapshot.data() as CommandReceiptData;
      if (
        previous.actorUid !== command.actorUid ||
        previous.commandType !== command.commandType
      ) {
        raise("DUPLICATE_COMMAND", "This commandId was already used for a different command.");
      }
      return previous.result as R;
    }

    const snapshot = await transaction.get(caseRef(command.caseId));
    if (!snapshot.exists && command.allowMissingCase !== true) {
      raise("NOT_FOUND", "The shared case was not found.");
    }
    if (snapshot.exists) {
      const currentCase = snapshot.data() as SharedCase;
      if (currentCase.version !== command.expectedVersion) {
        raise("VERSION_CONFLICT", "The shared case has changed. Refresh and retry with its current version.");
      }
    } else if (command.expectedVersion !== 0) {
      raise("VERSION_CONFLICT", "A new shared case must start with expectedVersion 0.");
    }

    const result = await handler(transaction, snapshot, context);
    transaction.create(receiptRef(command.commandId), {
      commandId: command.commandId,
      actorUid: command.actorUid,
      commandType: command.commandType,
      result,
      createdAt: FieldValue.serverTimestamp(),
    });
    return result;
  });
}

function validateCommandBase(
  data: CaseCommand,
  uid: string,
): CaseCommand & { actorUid: string } {
  return {
    caseId: validateId(data.caseId, "caseId"),
    actorOrgId: validateId(data.actorOrgId, "actorOrgId"),
    commandId: validateId(data.commandId, "commandId"),
    expectedVersion: requiredVersion(data.expectedVersion),
    actorUid: uid,
  };
}

function caseResponse(caseData: SharedCase): Record<string, unknown> {
  const value = caseData;
  return {
    ...value,
    createdAt: timestampString(value.createdAt),
    updatedAt: timestampString(value.updatedAt),
  };
}

function requireCurrentOwner(
  caseData: SharedCase,
  context: MembershipContext,
  roles: MembershipRole[],
): void {
  if (context.membership.organizationId !== caseData.currentOwnerOrgId) {
    raise("PERMISSION_DENIED", "Only the current owner organization can perform this action.");
  }
  if (
    (context.organization.type === "society" &&
      (context.membership.role !== "society_manager" || !roles.includes("society_manager"))) ||
    (context.organization.type === "federation" &&
      (context.membership.role !== "federation_representative" ||
        !roles.includes("federation_representative"))) ||
    !["society", "federation"].includes(context.organization.type)
  ) {
    raise("PERMISSION_DENIED", "An authorized owner representative is required.");
  }
}

function writeCaseUpdate(
  transaction: Transaction,
  caseId: string,
  caseData: SharedCase,
  updates: Partial<SharedCase>,
): SharedCase {
  const nextVersion = caseData.version + 1;
  transaction.update(caseRef(caseId), {
    ...updates,
    version: nextVersion,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return {
    ...caseData,
    ...updates,
    version: nextVersion,
    updatedAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
  };
}

function requireCaseStatus(
  caseData: SharedCase,
  allowed: SharedCaseStatus[],
): void {
  if (!allowed.includes(caseData.status)) {
    raise("FAILED_PRECONDITION", "The shared case is not in a state that allows this action.");
  }
}

async function readImageMetadata(storagePath: string, uploaderUid: string) {
  try {
    const [metadata] = await getStorage().bucket().file(storagePath).getMetadata();
    const size = Number(metadata.size);
    const contentType = metadata.contentType ?? "";
    if (
      metadata.metadata?.ownerUid !== uploaderUid ||
      !ALLOWED_IMAGE_TYPES.has(contentType) ||
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > MAX_IMAGE_BYTES
    ) {
      raise("INVALID_ARGUMENT", "The image must be an owned JPEG, PNG, or WebP file no larger than 5 MB.");
    }
    return { size, contentType };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    raise("NOT_FOUND", "The uploaded image could not be found.");
  }
}

function safeCall<T, R>(
  name: string,
  handler: (request: CallableRequest<T>) => Promise<R>,
) {
  return onCall(async (request: CallableRequest<T>) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error(`${name} failed.`, error);
      raise("INTERNAL", "The request could not be completed.");
    }
  });
}

export const createIncident = safeCall<CreateIncidentRequest, Record<string, unknown>>(
  "createIncident",
  async (request) => {
    const uid = requireUid(request);
    const incidentId = validateId(request.data?.incidentId, "incidentId");
    const buildingId = validateId(request.data?.buildingId, "buildingId");
    const assetId = validateId(request.data?.assetId, "assetId");
    const category = request.data?.category;
    const description = requiredString(request.data?.description, "description", 2000);
    if (!INCIDENT_CATEGORIES.includes(category as (typeof INCIDENT_CATEGORIES)[number])) {
      raise("INVALID_ARGUMENT", "category is not supported.");
    }
    if (!Array.isArray(request.data?.photoRefs) || request.data.photoRefs.length > 5) {
      raise("INVALID_ARGUMENT", "photoRefs must be an array containing at most five image paths.");
    }
    const photoRefs = request.data.photoRefs.map((path) =>
      requiredString(path, "photoRef", 1024),
    );
    for (const storagePath of photoRefs) {
      const parts = storagePath.split("/");
      if (
        parts.length !== 6 ||
        parts[0] !== "propLock" ||
        parts[1] !== "incidents" ||
        parts[2] !== incidentId ||
        parts[3] !== buildingId ||
        parts[4] !== uid ||
        !parts[5]
      ) {
        raise("INVALID_ARGUMENT", "Each photoRef must use this incident's authorized storage path.");
      }
    }
    await Promise.all(photoRefs.map((path) => readImageMetadata(path, uid)));

    return db.runTransaction(async (transaction) => {
      const [buildingSnapshot, assetSnapshot, existingIncident] = await Promise.all([
        transaction.get(db.collection("buildings").doc(buildingId)),
        transaction.get(db.collection("assets").doc(assetId)),
        transaction.get(db.collection("incidents").doc(incidentId)),
      ]);
      if (existingIncident.exists) {
        raise("FAILED_PRECONDITION", "An incident with this incidentId already exists.");
      }
      if (!buildingSnapshot.exists || !assetSnapshot.exists) {
        raise("NOT_FOUND", "The building or shared asset was not found.");
      }
      const building = buildingSnapshot.data() as Building;
      const asset = assetSnapshot.data() as SharedAsset;
      const actualMembershipSnapshot = await transaction.get(
        membershipRef(uid, building.societyOrgId),
      );
      const actualOrganizationSnapshot = await transaction.get(
        organizationRef(building.societyOrgId),
      );
      const context = validateMembership(
        actualMembershipSnapshot,
        actualOrganizationSnapshot,
        uid,
        building.societyOrgId,
      );
      requireRole(context.membership, ["resident"]);
      if (
        building.buildingId !== buildingId ||
        asset.assetId !== assetId ||
        !asset.relatedBuildingIds.includes(buildingId)
      ) {
        raise("FAILED_PRECONDITION", "The asset is not available for reports from this building.");
      }
      const incidentRef = db.collection("incidents").doc(incidentId);
      const now = new Date().toISOString();
      transaction.create(incidentRef, {
        incidentId,
        reporterUid: uid,
        buildingId,
        assetId,
        category,
        description,
        photoRefs,
        status: "submitted",
        createdAt: FieldValue.serverTimestamp(),
      });
      return {
        incidentId,
        status: "submitted",
        buildingId,
        assetId,
        category,
        createdAt: now,
      };
    });
  },
);

export const linkIncidentsToSharedCase = safeCall<
  LinkIncidentsRequest,
  Record<string, unknown>
>("linkIncidentsToSharedCase", async (request) => {
  const uid = requireUid(request);
  const command = validateCommandBase(request.data, uid);
  if (!Array.isArray(request.data?.incidentIds) || request.data.incidentIds.length === 0) {
    raise("INVALID_ARGUMENT", "Select at least one incident to link.");
  }
  const incidentIds = request.data.incidentIds.map((id) => validateId(id, "incidentId"));
  if (new Set(incidentIds).size !== incidentIds.length) {
    raise("INVALID_ARGUMENT", "incidentIds must not contain duplicates.");
  }
  return runCaseCommand(
    {
      ...command,
      commandType: "linkIncidentsToSharedCase",
      allowedRoles: ["society_manager"],
      allowMissingCase: true,
    },
    async (transaction, caseSnapshot, context) => {
      if (context.organization.type !== "society") {
        raise("PERMISSION_DENIED", "Only a society manager can link incidents.");
      }
      const incidentSnapshots = await Promise.all(
        incidentIds.map((id) => transaction.get(db.collection("incidents").doc(id))),
      );
      if (incidentSnapshots.some((snapshot) => !snapshot.exists)) {
        raise("NOT_FOUND", "One or more selected incidents were not found.");
      }
      const incidents = incidentSnapshots.map((snapshot) => snapshot.data() as Incident);
      const buildingIds = [...new Set(incidents.map((incident) => incident.buildingId))];
      const buildingSnapshots = await Promise.all(
        buildingIds.map((id) => transaction.get(db.collection("buildings").doc(id))),
      );
      if (buildingSnapshots.some((snapshot) => !snapshot.exists)) {
        raise("NOT_FOUND", "A building associated with a selected incident was not found.");
      }
      const buildings = new Map(
        buildingSnapshots.map((snapshot) => [snapshot.id, snapshot.data() as Building]),
      );
      const assetId = incidents[0].assetId;
      const category = incidents[0].category;
      if (
        incidents.some(
          (incident) =>
            incident.assetId !== assetId ||
            incident.category !== category ||
            !["submitted", "open"].includes(incident.status) ||
            (incident.sharedCaseId && incident.sharedCaseId !== command.caseId),
        )
      ) {
        raise("FAILED_PRECONDITION", "Selected incidents must be unlinked, open reports for the same asset and category.");
      }
      const assetSnapshot = await transaction.get(db.collection("assets").doc(assetId));
      if (!assetSnapshot.exists) {
        raise("NOT_FOUND", "The shared asset was not found.");
      }
      const asset = assetSnapshot.data() as SharedAsset;
      if (asset.scope !== "layout_shared") {
        raise("FAILED_PRECONDITION", "Only a shared-layout asset can be linked into a shared case.");
      }
      if (asset.ownerOrgId !== command.actorOrgId) {
        raise("PERMISSION_DENIED", "Only the shared asset's owner organization can create or extend its case.");
      }
      const layouts = new Set(
        buildingIds.map((id) => buildings.get(id)?.layoutId).filter(Boolean),
      );
      if (
        layouts.size !== 1 ||
        buildingIds.some((id) => !asset.relatedBuildingIds.includes(id))
      ) {
        raise("FAILED_PRECONDITION", "Selected incidents must belong to buildings on the same layout and shared asset.");
      }
      const layoutId = [...layouts][0] as string;
      const affectedOrganizationIds = [
        ...new Set(buildingIds.map((id) => buildings.get(id)!.societyOrgId)),
      ];
      if (!affectedOrganizationIds.includes(command.actorOrgId)) {
        raise("PERMISSION_DENIED", "The manager must belong to a society affected by these incidents.");
      }

      let nextCase: SharedCase;
      if (caseSnapshot.exists) {
        const existingCase = caseSnapshot.data() as SharedCase;
        if (existingCase.currentOwnerOrgId !== command.actorOrgId) {
          raise("PERMISSION_DENIED", "Only the current case owner can add linked incidents.");
        }
        requireCaseStatus(existingCase, ["open", "in_progress", "reopened"]);
        if (existingCase.assetId !== assetId || existingCase.layoutId !== layoutId) {
          raise("FAILED_PRECONDITION", "Selected incidents are incompatible with this shared case.");
        }
        if (incidentIds.some((id) => existingCase.linkedIncidentIds.includes(id))) {
          raise("FAILED_PRECONDITION", "A selected incident is already linked to this case.");
        }
        const newIncidentIds = [...existingCase.linkedIncidentIds, ...incidentIds];
        const newBuildingIds = [...new Set([...existingCase.affectedBuildingIds, ...buildingIds])];
        const newOrgIds = [
          ...new Set([...existingCase.affectedOrganizationIds, ...affectedOrganizationIds]),
        ];
        const newReporters = [
          ...new Set([...existingCase.affectedReporterUids, ...incidents.map((item) => item.reporterUid)]),
        ];
        nextCase = {
          ...existingCase,
          linkedIncidentIds: newIncidentIds,
          affectedBuildingIds: newBuildingIds,
          affectedOrganizationIds: newOrgIds,
          affectedReporterUids: newReporters,
          version: existingCase.version + 1,
          updatedAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
        };
        transaction.update(caseRef(command.caseId), {
          linkedIncidentIds: newIncidentIds,
          affectedBuildingIds: newBuildingIds,
          affectedOrganizationIds: newOrgIds,
          affectedReporterUids: newReporters,
          version: nextCase.version,
          updatedAt: FieldValue.serverTimestamp(),
        });
        appendCaseEvent(
          transaction,
          { ...command, actorUid: uid },
          "incidents_linked",
          "Incidents explicitly linked by an authorized society manager.",
          existingCase.linkedIncidentIds,
          newIncidentIds,
        );
      } else {
        if (command.expectedVersion !== 0) {
          raise("VERSION_CONFLICT", "A new shared case must start with expectedVersion 0.");
        }
        nextCase = {
          caseId: command.caseId,
          assetId,
          linkedIncidentIds: incidentIds,
          layoutId,
          currentOwnerOrgId: command.actorOrgId,
          proposedRecipientOrgId: null,
          status: "open",
          version: 1,
          createdAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
          updatedAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
          affectedBuildingIds: buildingIds,
          affectedOrganizationIds,
          affectedReporterUids: [...new Set(incidents.map((item) => item.reporterUid))],
          assignedWorkerUids: [],
        };
        transaction.create(caseRef(command.caseId), nextCase);
        appendCaseEvent(
          transaction,
          { ...command, actorUid: uid },
          "case_created",
          "Shared case created from explicitly selected compatible incidents.",
          null,
          { caseId: command.caseId, status: "open", version: 1 },
        );
      }
      for (const incident of incidents) {
        transaction.update(db.collection("incidents").doc(incident.incidentId), {
          sharedCaseId: command.caseId,
          status: "linked",
        });
      }
      return {
        case: caseResponse(nextCase),
      };
    },
  );
});

export const proposeHandoff = safeCall<
  ProposeHandoffRequest,
  Record<string, unknown>
>("proposeHandoff", async (request) => {
  const uid = requireUid(request);
  const command = validateCommandBase(request.data, uid);
  const recipientOrgId = validateId(
    request.data?.proposedRecipientOrgId,
    "proposedRecipientOrgId",
  );
  const reason = optionalReason(request.data?.reason, true);
  return runCaseCommand(
    {
      ...command,
      commandType: "proposeHandoff",
      allowedRoles: ["society_manager", "federation_representative"],
    },
    async (transaction, snapshot, context) => {
      const currentCase = snapshot.data() as SharedCase;
      requireCurrentOwner(currentCase, context, [
        "society_manager",
        "federation_representative",
      ]);
      requireCaseStatus(currentCase, ["open", "handoff_disputed", "information_requested"]);
      if (recipientOrgId === currentCase.currentOwnerOrgId) {
        raise("INVALID_ARGUMENT", "The recipient must differ from the current owner.");
      }
      const recipientSnapshot = await transaction.get(organizationRef(recipientOrgId));
      if (!recipientSnapshot.exists) {
        raise("NOT_FOUND", "The proposed recipient organization was not found.");
      }
      if ((recipientSnapshot.data() as Organization).type !== "federation") {
        raise("FAILED_PRECONDITION", "A handoff recipient must be a federation.");
      }
      const nextCase = writeCaseUpdate(transaction, command.caseId, currentCase, {
        proposedRecipientOrgId: recipientOrgId,
        status: "handoff_pending",
      });
      appendCaseEvent(
        transaction,
        { ...command, actorUid: uid },
        "handoff_proposed",
        reason,
        { ownerOrgId: currentCase.currentOwnerOrgId, status: currentCase.status },
        { ownerOrgId: currentCase.currentOwnerOrgId, recipientOrgId, status: "handoff_pending" },
      );
      return { case: caseResponse(nextCase) };
    },
  );
});

export const decideHandoff = safeCall<
  DecideHandoffRequest,
  Record<string, unknown>
>("decideHandoff", async (request) => {
  const uid = requireUid(request);
  const command = validateCommandBase(request.data, uid);
  const decision = request.data?.decision;
  if (!["accept", "dispute", "request_information"].includes(decision)) {
    raise("INVALID_ARGUMENT", "decision must be accept, dispute, or request_information.");
  }
  const reason = optionalReason(request.data?.reason, decision !== "accept");
  return runCaseCommand(
    {
      ...command,
      commandType: "decideHandoff",
      allowedRoles: ["federation_representative"],
    },
    async (transaction, snapshot, context) => {
      const currentCase = snapshot.data() as SharedCase;
      if (
        context.organization.type !== "federation" ||
        currentCase.status !== "handoff_pending" ||
        currentCase.proposedRecipientOrgId !== command.actorOrgId
      ) {
        raise("PERMISSION_DENIED", "Only the intended recipient can decide this pending handoff.");
      }
      if (decision === "accept") {
        const nextCase = writeCaseUpdate(transaction, command.caseId, currentCase, {
          currentOwnerOrgId: command.actorOrgId,
          proposedRecipientOrgId: null,
          status: "accepted",
        });
        appendCaseEvent(
          transaction,
          { ...command, actorUid: uid },
          "handoff_accepted",
          reason,
          { ownerOrgId: currentCase.currentOwnerOrgId, status: currentCase.status },
          { ownerOrgId: command.actorOrgId, proposedRecipientOrgId: null, status: "accepted" },
        );
        return { case: caseResponse(nextCase) };
      }
      if (decision === "dispute") {
        const nextCase = writeCaseUpdate(transaction, command.caseId, currentCase, {
          proposedRecipientOrgId: null,
          status: "handoff_disputed",
        });
        appendCaseEvent(
          transaction,
          { ...command, actorUid: uid },
          "handoff_disputed",
          reason,
          { ownerOrgId: currentCase.currentOwnerOrgId, status: currentCase.status },
          { ownerOrgId: currentCase.currentOwnerOrgId, proposedRecipientOrgId: null, status: "handoff_disputed" },
        );
        return { case: caseResponse(nextCase) };
      }
      const nextCase = writeCaseUpdate(transaction, command.caseId, currentCase, {
        status: "information_requested",
      });
      appendCaseEvent(
        transaction,
        { ...command, actorUid: uid },
        "information_requested",
        reason,
        { ownerOrgId: currentCase.currentOwnerOrgId, status: currentCase.status },
        {
          ownerOrgId: currentCase.currentOwnerOrgId,
          proposedRecipientOrgId: currentCase.proposedRecipientOrgId,
          status: "information_requested",
        },
      );
      return { case: caseResponse(nextCase) };
    },
  );
});

export const createWorkOrder = safeCall<
  CreateWorkOrderRequest,
  Record<string, unknown>
>("createWorkOrder", async (request) => {
  const uid = requireUid(request);
  const command = validateCommandBase(request.data, uid);
  const workOrderId = validateId(request.data?.workOrderId, "workOrderId");
  const assignedTo = validateId(request.data?.assignedTo, "assignedTo");
  const assignedToOrgId = validateId(request.data?.assignedToOrgId, "assignedToOrgId");
  const instructions = requiredString(request.data?.instructions, "instructions", 4000);
  return runCaseCommand(
    {
      ...command,
      commandType: "createWorkOrder",
      allowedRoles: ["society_manager", "federation_representative"],
    },
    async (transaction, snapshot, context) => {
      const currentCase = snapshot.data() as SharedCase;
      requireCurrentOwner(currentCase, context, [
        "society_manager",
        "federation_representative",
      ]);
      requireCaseStatus(currentCase, [
        "open",
        "accepted",
        "handoff_disputed",
        "information_requested",
        "reopened",
      ]);
      const [workerMembershipSnapshot, workerOrganizationSnapshot, orderSnapshot] =
        await Promise.all([
          transaction.get(membershipRef(assignedTo, assignedToOrgId)),
          transaction.get(organizationRef(assignedToOrgId)),
          transaction.get(db.collection("workOrders").doc(workOrderId)),
        ]);
      if (orderSnapshot.exists) {
        raise("FAILED_PRECONDITION", "A work order with this workOrderId already exists.");
      }
      const workerContext = validateMembership(
        workerMembershipSnapshot,
        workerOrganizationSnapshot,
        assignedTo,
        assignedToOrgId,
      );
      requireRole(workerContext.membership, ["maintenance_worker"]);
      if (workerContext.organization.type !== "vendor") {
        raise("FAILED_PRECONDITION", "A maintenance worker must belong to an active vendor organization.");
      }
      const nextVersion = currentCase.version + 1;
      const order: WorkOrder = {
        workOrderId,
        caseId: command.caseId,
        assignedTo,
        assignedToOrgId,
        status: "assigned",
        instructions,
        completionNote: "",
        evidenceIds: [],
        version: 1,
        createdAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
        updatedAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
      };
      const nextCase = {
        ...currentCase,
        status: "in_progress" as const,
        activeWorkOrderId: workOrderId,
        assignedWorkerUids: [
          ...new Set([...currentCase.assignedWorkerUids, assignedTo]),
        ],
        version: nextVersion,
        updatedAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
      };
      transaction.create(db.collection("workOrders").doc(workOrderId), order);
      transaction.update(caseRef(command.caseId), {
        status: "in_progress",
        activeWorkOrderId: workOrderId,
        assignedWorkerUids: nextCase.assignedWorkerUids,
        version: nextVersion,
        updatedAt: FieldValue.serverTimestamp(),
      });
      appendCaseEvent(
        transaction,
        { ...command, actorUid: uid },
        "work_order_created",
        "",
        currentCase.status,
        { status: "in_progress", workOrderId, assignedTo },
      );
      return {
        workOrder: {
          ...order,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        case: caseResponse(nextCase),
      };
    },
  );
});

export const updateWorkOrderStatus = safeCall<
  UpdateWorkOrderStatusRequest,
  Record<string, unknown>
>("updateWorkOrderStatus", async (request) => {
  const uid = requireUid(request);
  const command = validateCommandBase(request.data, uid);
  const workOrderId = validateId(request.data?.workOrderId, "workOrderId");
  const status = request.data?.status;
  if (status !== "in_progress" && status !== "awaiting_verification") {
    raise("INVALID_ARGUMENT", "status must be in_progress or awaiting_verification.");
  }
  const completionNote = request.data?.completionNote === undefined
    ? ""
    : requiredString(request.data.completionNote, "completionNote", 2000);
  if (status === "awaiting_verification" && completionNote.length === 0) {
    raise("INVALID_ARGUMENT", "A completionNote is required when submitting work for verification.");
  }
  return runCaseCommand(
    {
      ...command,
      commandType: "updateWorkOrderStatus",
      allowedRoles: ["maintenance_worker"],
    },
    async (transaction, snapshot, context) => {
      const currentCase = snapshot.data() as SharedCase;
      const orderRef = db.collection("workOrders").doc(workOrderId);
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) {
        raise("NOT_FOUND", "The work order was not found.");
      }
      const order = orderSnapshot.data() as WorkOrder;
      if (
        order.caseId !== command.caseId ||
        order.assignedTo !== uid ||
        order.assignedToOrgId !== command.actorOrgId ||
        context.membership.role !== "maintenance_worker"
      ) {
        raise("PERMISSION_DENIED", "Only the assigned worker can update this work order.");
      }
      if (currentCase.activeWorkOrderId !== workOrderId) {
        raise("FAILED_PRECONDITION", "This work order is not the active repair for the case.");
      }
      const validTransition =
        (order.status === "assigned" && status === "in_progress") ||
        (order.status === "in_progress" && status === "awaiting_verification");
      if (!validTransition) {
        raise("FAILED_PRECONDITION", "The work order status transition is not allowed.");
      }
      const nextOrder: WorkOrder = {
        ...order,
        status: status as WorkOrderStatus,
        completionNote: status === "awaiting_verification" ? completionNote : order.completionNote,
        version: order.version + 1,
        updatedAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
      };
      transaction.update(orderRef, {
        status: nextOrder.status,
        completionNote: nextOrder.completionNote,
        version: nextOrder.version,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const nextCase = writeCaseUpdate(transaction, command.caseId, currentCase, {
        status: status === "awaiting_verification" ? "in_progress" : currentCase.status,
      });
      appendCaseEvent(
        transaction,
        { ...command, actorUid: uid },
        "work_order_status_updated",
        completionNote,
        order.status,
        status,
      );
      return {
        workOrder: {
          ...nextOrder,
          updatedAt: new Date().toISOString(),
        },
        case: caseResponse(nextCase),
      };
    },
  );
});

export const finalizeEvidenceUpload = safeCall<
  FinalizeEvidenceRequest,
  Record<string, unknown>
>("finalizeEvidenceUpload", async (request) => {
  const uid = requireUid(request);
  const command = validateCommandBase(request.data, uid);
  const workOrderId = validateId(request.data?.workOrderId, "workOrderId");
  const evidenceId = validateId(request.data?.evidenceId, "evidenceId");
  const storagePath = requiredString(request.data?.storagePath, "storagePath", 1024);
  const pathParts = storagePath.split("/");
  if (
    pathParts.length !== 6 ||
    pathParts[0] !== "propLock" ||
    pathParts[1] !== "evidence" ||
    pathParts[2] !== command.caseId ||
    pathParts[3] !== workOrderId ||
    pathParts[4] !== uid ||
    !pathParts[5]
  ) {
    raise("INVALID_ARGUMENT", "storagePath must be owned by this uploader and match the case and work order.");
  }
  const image = await readImageMetadata(storagePath, uid);
  return runCaseCommand(
    {
      ...command,
      commandType: "finalizeEvidenceUpload",
      allowedRoles: ["maintenance_worker"],
    },
    async (transaction, snapshot, context) => {
      const currentCase = snapshot.data() as SharedCase;
      const orderRef = db.collection("workOrders").doc(workOrderId);
      const evidenceRef = db.collection("evidence").doc(evidenceId);
      const [orderSnapshot, evidenceSnapshot] = await Promise.all([
        transaction.get(orderRef),
        transaction.get(evidenceRef),
      ]);
      if (!orderSnapshot.exists) {
        raise("NOT_FOUND", "The work order was not found.");
      }
      if (evidenceSnapshot.exists) {
        raise("FAILED_PRECONDITION", "An evidence record with this evidenceId already exists.");
      }
      const order = orderSnapshot.data() as WorkOrder;
      if (
        order.caseId !== command.caseId ||
        order.assignedTo !== uid ||
        order.assignedToOrgId !== command.actorOrgId ||
        context.membership.role !== "maintenance_worker"
      ) {
        raise("PERMISSION_DENIED", "Only the assigned worker can attach evidence to this work order.");
      }
      if (
        currentCase.activeWorkOrderId !== workOrderId ||
        !["in_progress", "awaiting_verification"].includes(order.status)
      ) {
        raise("FAILED_PRECONDITION", "Evidence can only be attached to the active, unfinished work order.");
      }
      const evidence: Evidence = {
        evidenceId,
        caseId: command.caseId,
        workOrderId,
        uploaderUid: uid,
        storagePath,
        contentType: image.contentType,
        size: image.size,
        createdAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
      };
      const nextOrder = {
        ...order,
        evidenceIds: [...order.evidenceIds, evidenceId],
        version: order.version + 1,
        updatedAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
      };
      const nextCase = writeCaseUpdate(transaction, command.caseId, currentCase, {});
      transaction.create(evidenceRef, evidence);
      transaction.update(orderRef, {
        evidenceIds: nextOrder.evidenceIds,
        version: nextOrder.version,
        updatedAt: FieldValue.serverTimestamp(),
      });
      appendCaseEvent(
        transaction,
        { ...command, actorUid: uid },
        "evidence_submitted",
        "",
        { workOrderId, evidenceCount: order.evidenceIds.length },
        { workOrderId, evidenceId, evidenceCount: nextOrder.evidenceIds.length },
      );
      return {
        evidence: { ...evidence, createdAt: new Date().toISOString() },
        workOrder: { ...nextOrder, updatedAt: new Date().toISOString() },
        case: caseResponse(nextCase),
      };
    },
  );
});

export const verifyRepair = safeCall<
  VerifyRepairRequest,
  Record<string, unknown>
>("verifyRepair", async (request) => {
  const uid = requireUid(request);
  const command = validateCommandBase(request.data, uid);
  const workOrderId = validateId(request.data?.workOrderId, "workOrderId");
  const action = request.data?.action;
  if (action !== "verify" && action !== "reopen") {
    raise("INVALID_ARGUMENT", "action must be verify or reopen.");
  }
  const reason = optionalReason(request.data?.reason, action === "reopen");
  return runCaseCommand(
    {
      ...command,
      commandType: "verifyRepair",
      allowedRoles: [
        "society_manager",
        "federation_representative",
        "resident",
      ],
    },
    async (transaction, snapshot, context) => {
      const currentCase = snapshot.data() as SharedCase;
      const orderRef = db.collection("workOrders").doc(workOrderId);
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) {
        raise("NOT_FOUND", "The work order was not found.");
      }
      const order = orderSnapshot.data() as WorkOrder;
      if (order.caseId !== command.caseId) {
        raise("PERMISSION_DENIED", "The work order does not belong to this shared case.");
      }

      if (action === "verify") {
        requireCurrentOwner(currentCase, context, [
          "society_manager",
          "federation_representative",
        ]);
        if (
          currentCase.status !== "in_progress" ||
          currentCase.activeWorkOrderId !== workOrderId ||
          order.status !== "awaiting_verification"
        ) {
          raise("FAILED_PRECONDITION", "The active work order is not ready for verification.");
        }
        if (order.evidenceIds.length === 0) {
          raise("FAILED_PRECONDITION", "At least one repair evidence image is required before verification.");
        }
        const evidenceSnapshots = await Promise.all(
          order.evidenceIds.map((id) => transaction.get(db.collection("evidence").doc(id))),
        );
        if (
          evidenceSnapshots.some(
            (evidenceSnapshot) =>
              !evidenceSnapshot.exists ||
              (evidenceSnapshot.data() as Evidence).caseId !== command.caseId ||
              (evidenceSnapshot.data() as Evidence).workOrderId !== workOrderId,
          )
        ) {
          raise("FAILED_PRECONDITION", "The work order is missing valid evidence records.");
        }
        const nextOrder = {
          ...order,
          status: "completed" as const,
          version: order.version + 1,
          updatedAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
        };
        transaction.update(orderRef, {
          status: "completed",
          version: nextOrder.version,
          updatedAt: FieldValue.serverTimestamp(),
        });
        const nextCase = writeCaseUpdate(transaction, command.caseId, currentCase, {
          status: "closed",
        });
        appendCaseEvent(
          transaction,
          { ...command, actorUid: uid },
          "repair_verified",
          reason,
          { caseStatus: currentCase.status, workOrderStatus: order.status },
          { caseStatus: "closed", workOrderStatus: "completed" },
        );
        return {
          case: caseResponse(nextCase),
          workOrder: { ...nextOrder, updatedAt: new Date().toISOString() },
        };
      }

      requireCaseStatus(currentCase, ["closed"]);
      const isAffectedResident =
        context.membership.role === "resident" &&
        currentCase.affectedReporterUids.includes(uid);
      const isAffectedManager =
        context.membership.role === "society_manager" &&
        context.organization.type === "society" &&
        currentCase.affectedOrganizationIds.includes(command.actorOrgId);
      if (!isAffectedResident && !isAffectedManager) {
        raise("PERMISSION_DENIED", "Only an affected resident or society manager can reopen this case.");
      }
      if (currentCase.activeWorkOrderId !== workOrderId || order.status !== "completed") {
        raise("FAILED_PRECONDITION", "Only a completed repair can be reopened.");
      }
      const nextCase = writeCaseUpdate(transaction, command.caseId, currentCase, {
        status: "reopened",
      });
      appendCaseEvent(
        transaction,
        { ...command, actorUid: uid },
        "repair_reopened",
        reason,
        { caseStatus: currentCase.status, workOrderId, workOrderStatus: order.status },
        { caseStatus: "reopened", workOrderId, workOrderStatus: order.status },
      );
      return { case: caseResponse(nextCase), workOrder: order };
    },
  );
});
