# PROPLOCK backend contract

The callable functions are exported from the existing Firebase Functions v2
entry point. They use the existing Firebase project configuration and do not
select or deploy to a Firebase project. Configure a new project alias and its
Authentication, Firestore, and Storage services before deployment; never use the
original upstream project's Firebase project.

## Membership and roles

Membership documents use the deterministic ID `{uid}__{organizationId}` in
`memberships` and contain `uid`, `organizationId`, `role`, and `active`.
Memberships and elevated user roles must be provisioned by trusted
administration; there is no client-side membership or role-management API.

Supported membership roles are `resident`, `society_manager`,
`federation_representative`, and `maintenance_worker`. Organizations use type
`society`, `federation`, or `vendor`. A maintenance worker must be an active
member of a vendor organization.

Incident categories are `water_supply`, `drainage`, `electrical`, `lift`,
`road`, `waste_management`, `lighting`, and `other`.

## Callable functions

All functions require Firebase Authentication. Failures use Firebase's
standard callable error code and include the stable PROPLOCK error name in
`error.details.apiCode`. Error names are `UNAUTHENTICATED`,
`PERMISSION_DENIED`, `NOT_FOUND`, `INVALID_ARGUMENT`,
`FAILED_PRECONDITION`, `VERSION_CONFLICT`, `DUPLICATE_COMMAND`, and `INTERNAL`.

All case-changing commands require `caseId`, `actorOrgId`, `commandId`, and
`expectedVersion`. New cases use `expectedVersion: 0`. A repeated `commandId`
for the same authenticated user and command type returns the original result;
using it for another user or command type returns `DUPLICATE_COMMAND`.
Version conflicts never apply a partial update. Every committed command stores
a receipt and an event in `sharedCases/{caseId}/events`.

### `createIncident`

Request:

```json
{
  "incidentId": "incident_001",
  "buildingId": "building_01",
  "assetId": "asset_d03",
  "category": "water_supply",
  "description": "Water is leaking near the shared pump.",
  "photoRefs": []
}
```

`photoRefs` may contain at most five Storage paths owned by the reporter.
Response: `{ "incidentId": "...", "status": "submitted", "buildingId": "...", "assetId": "...", "category": "...", "createdAt": "..." }`.

### `linkIncidentsToSharedCase`

Request: `{ "caseId": "...", "actorOrgId": "...", "commandId": "...", "expectedVersion": 0, "incidentIds": ["..."] }`.
The case ID is client-generated. Selected incidents must be explicitly
provided, open/unlinked, share one category and one layout-shared asset, and
belong to buildings on the same layout.

Response: `{ "case": { "caseId": "...", "assetId": "...", "linkedIncidentIds": [], "layoutId": "...", "currentOwnerOrgId": "...", "proposedRecipientOrgId": null, "status": "open", "version": 1, "...": "..." } }`.

### `proposeHandoff`

Request: `{ "caseId": "...", "actorOrgId": "...", "commandId": "...", "expectedVersion": 1, "proposedRecipientOrgId": "...", "reason": "..." }`.
Response contains the updated `case`. Proposal sets `handoff_pending` but does
not transfer `currentOwnerOrgId`.

### `decideHandoff`

Request: `{ "caseId": "...", "actorOrgId": "...", "commandId": "...", "expectedVersion": 2, "decision": "accept" | "dispute" | "request_information", "reason": "..." }`.
Disputes and information requests require a reason. `accept` transfers
ownership only to the intended recipient. A dispute clears the proposed
recipient; an information request leaves ownership and the proposed recipient
unchanged.

### `createWorkOrder`

Request: `{ "caseId": "...", "actorOrgId": "...", "commandId": "...", "expectedVersion": 3, "workOrderId": "...", "assignedTo": "...", "assignedToOrgId": "...", "instructions": "..." }`.
Response contains the created `workOrder` and updated `case`.

### `updateWorkOrderStatus`

Request: `{ "caseId": "...", "actorOrgId": "...", "commandId": "...", "expectedVersion": 4, "workOrderId": "...", "status": "in_progress" | "awaiting_verification", "completionNote": "..." }`.
Only the assigned worker may make `assigned -> in_progress` and
`in_progress -> awaiting_verification` transitions. A completion note is
required for submission for verification.

### `finalizeEvidenceUpload`

Request: `{ "caseId": "...", "actorOrgId": "...", "commandId": "...", "expectedVersion": 5, "workOrderId": "...", "evidenceId": "...", "storagePath": "propLock/evidence/{caseId}/{workOrderId}/{uid}/{file}" }`.
The callable verifies the uploaded object and its owner metadata, writes the
evidence record, and increments the case and work-order versions.

### `verifyRepair`

Request: `{ "caseId": "...", "actorOrgId": "...", "commandId": "...", "expectedVersion": 6, "workOrderId": "...", "action": "verify" | "reopen", "reason": "..." }`.
Verification requires at least one valid evidence record and closes the case.
Reopening requires a reason and an affected resident or affected society
manager; it preserves the completed work order and prior events.

## Storage paths

Resident photos use
`propLock/incidents/{incidentId}/{buildingId}/{uid}/{fileName}`.
Contractor evidence uses
`propLock/evidence/{caseId}/{workOrderId}/{uid}/{fileName}`.
Both paths accept JPEG, PNG, or WebP up to 5 MiB. Upload custom metadata must
include `ownerUid` equal to the authenticated uploader UID. Storage rules deny
overwrites and restrict reads to case participants, affected reporters, or
assigned workers.

## Firestore records

The PROPLOCK collections are `organizations`, `memberships`, `buildings`,
`assets`, `incidents`, `sharedCases`, `workOrders`, `evidence`, and
`commandReceipts`. Case audit events are subcollection documents at
`sharedCases/{caseId}/events/{eventId}`. Cases also keep the affected reporter,
organization, building, and assigned-worker identifiers required for scoped
access checks.

## Emulator setup

The existing `firebase.json` configures Auth, Firestore, Storage, Functions,
and Emulator UI ports. Run the Functions build with `npm --prefix functions run
build`. Emulator tests should use a dedicated non-production project ID and
must seed membership documents using the deterministic IDs described above.
