// ──────────────────────────────────────
// MONSOONPROOF domain types
// ──────────────────────────────────────

export type SocietyId = 'sea-view' | 'palm-heights' | 'harbor-residences';

export type DemoRole = 'society_manager' | 'federation_rep';

export type IncidentStatus =
  | 'submitted'
  | 'triaged'
  | 'linked'
  | 'closed';

export type SharedCaseStatus =
  | 'open'
  | 'handoff_pending'
  | 'in_repair'
  | 'awaiting_verification'
  | 'verified'
  | 'disputed'
  | 'reopened';

export type HandoffStatus =
  | 'none'
  | 'proposed'
  | 'accepted'
  | 'disputed'
  | 'info_requested';

export type WorkOrderStatus =
  | 'draft'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_verification'
  | 'verified'
  | 'reopened';

export type CaseEventType =
  | 'case_created'
  | 'incident_linked'
  | 'handoff_proposed'
  | 'handoff_accepted'
  | 'handoff_disputed'
  | 'info_requested'
  | 'work_order_created'
  | 'work_order_assigned'
  | 'work_order_status'
  | 'evidence_finalized'
  | 'repair_verified'
  | 'repair_reopened'
  | 'note';

export interface Society {
  id: SocietyId;
  name: string;
}

export interface SharedAsset {
  id: string;
  code: string;
  name: string;
  description: string;
  societyIds: SocietyId[];
}

export interface Incident {
  id: string;
  societyId: SocietyId;
  flatLabel: string;
  title: string;
  description: string;
  assetId: string | null;
  status: IncidentStatus;
  sharedCaseId: string | null;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface SharedCase {
  id: string;
  title: string;
  summary: string;
  assetId: string;
  status: SharedCaseStatus;
  ownerSocietyId: SocietyId;
  incidentIds: string[];
  handoffStatus: HandoffStatus;
  handoffToSocietyId: SocietyId | null;
  handoffProposedBy: SocietyId | null;
  handoffReason: string | null;
  handoffDisputeReason: string | null;
  activeWorkOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CaseEvent {
  id: string;
  caseId: string;
  type: CaseEventType;
  message: string;
  actorRole: DemoRole | 'system';
  actorLabel: string;
  createdAt: string;
  meta?: Record<string, string>;
}

export interface WorkOrderEvidence {
  id: string;
  label: string;
  url: string;
  uploadedAt: string;
  finalized: boolean;
}

export interface WorkOrder {
  id: string;
  caseId: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  assignedWorkerId: string | null;
  assignedWorkerName: string | null;
  evidence: WorkOrderEvidence[];
  reopenReason: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DemoWorker {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
}

export interface CommandResult<T = void> {
  ok: boolean;
  error?: string;
  conflict?: boolean;
  data?: T;
}

export interface CommandBase {
  commandId: string;
  expectedVersion: number;
}

export interface CreateIncidentInput extends CommandBase {
  societyId: SocietyId;
  flatLabel: string;
  title: string;
  description: string;
  assetId?: string | null;
  reportedBy: string;
}

export interface LinkIncidentsInput extends CommandBase {
  caseId?: string;
  incidentIds: string[];
  assetId: string;
  title?: string;
  summary?: string;
  ownerSocietyId: SocietyId;
}

export interface ProposeHandoffInput extends CommandBase {
  caseId: string;
  toSocietyId: SocietyId;
  reason: string;
  fromSocietyId: SocietyId;
}

export type HandoffDecisionAction = 'accept' | 'dispute' | 'request_info';

export interface DecideHandoffInput extends CommandBase {
  caseId: string;
  action: HandoffDecisionAction;
  reason?: string;
}

export interface CreateWorkOrderInput extends CommandBase {
  caseId: string;
  title: string;
  description: string;
  assignedWorkerId?: string | null;
}

export interface UpdateWorkOrderStatusInput extends CommandBase {
  workOrderId: string;
  status: WorkOrderStatus;
  reason?: string;
}

export interface FinalizeEvidenceInput extends CommandBase {
  workOrderId: string;
  evidenceId: string;
}

export interface VerifyRepairInput extends CommandBase {
  workOrderId: string;
  action: 'verify' | 'reopen';
  reason?: string;
}

export interface MonsoonProofState {
  societies: Society[];
  assets: SharedAsset[];
  incidents: Incident[];
  sharedCases: SharedCase[];
  caseEvents: CaseEvent[];
  workOrders: WorkOrder[];
  workers: DemoWorker[];
  demoRole: DemoRole;
  activeSocietyId: SocietyId;
}
