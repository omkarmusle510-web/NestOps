export const INCIDENT_CATEGORIES = [
  "water_supply",
  "drainage",
  "electrical",
  "lift",
  "road",
  "waste_management",
  "lighting",
  "other",
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];
export type OrganizationType = "society" | "federation" | "vendor";
export type MembershipRole =
  | "resident"
  | "society_manager"
  | "federation_representative"
  | "maintenance_worker";

export type SharedCaseStatus =
  | "open"
  | "handoff_pending"
  | "accepted"
  | "handoff_disputed"
  | "information_requested"
  | "in_progress"
  | "closed"
  | "reopened";

export interface Organization {
  organizationId: string;
  name: string;
  type: OrganizationType;
}

export interface Membership {
  uid: string;
  organizationId: string;
  role: MembershipRole;
  active: boolean;
}

export interface Building {
  buildingId: string;
  layoutId: string;
  societyOrgId: string;
  name: string;
}

export interface SharedAsset {
  assetId: string;
  name: string;
  scope: "building_common" | "layout_shared";
  ownerOrgId: string;
  relatedBuildingIds: string[];
  assetType: string;
}

export interface Incident {
  incidentId: string;
  reporterUid: string;
  buildingId: string;
  assetId: string;
  category: IncidentCategory;
  description: string;
  photoRefs: string[];
  status: string;
  createdAt: FirebaseFirestore.Timestamp;
  sharedCaseId?: string;
}

export interface SharedCase {
  caseId: string;
  assetId: string;
  linkedIncidentIds: string[];
  layoutId: string;
  currentOwnerOrgId: string;
  proposedRecipientOrgId: string | null;
  status: SharedCaseStatus;
  version: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  affectedBuildingIds: string[];
  affectedOrganizationIds: string[];
  affectedReporterUids: string[];
  assignedWorkerUids: string[];
  activeWorkOrderId?: string;
}

export type WorkOrderStatus =
  | "assigned"
  | "in_progress"
  | "awaiting_verification"
  | "completed";

export interface WorkOrder {
  workOrderId: string;
  caseId: string;
  assignedTo: string;
  assignedToOrgId: string;
  status: WorkOrderStatus;
  instructions: string;
  completionNote: string;
  evidenceIds: string[];
  version: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface Evidence {
  evidenceId: string;
  caseId: string;
  workOrderId: string;
  uploaderUid: string;
  storagePath: string;
  contentType: string;
  size: number;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface CaseEvent {
  eventId: string;
  actorUid: string;
  actorOrgId: string;
  action: string;
  reason: string;
  fromValue: string;
  toValue: string;
  timestamp: FirebaseFirestore.Timestamp;
  commandId: string;
}

export interface CommandReceipt {
  commandId: string;
  actorUid: string;
  commandType: string;
  result: Record<string, unknown>;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface CaseCommand {
  caseId: string;
  actorOrgId: string;
  commandId: string;
  expectedVersion: number;
}
