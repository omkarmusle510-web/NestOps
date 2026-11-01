import type {
  CommandResult,
  CreateIncidentInput,
  CreateWorkOrderInput,
  DecideHandoffInput,
  DemoRole,
  FinalizeEvidenceInput,
  Incident,
  LinkIncidentsInput,
  MonsoonProofState,
  ProposeHandoffInput,
  SharedCase,
  SocietyId,
  UpdateWorkOrderStatusInput,
  VerifyRepairInput,
  WorkOrder,
} from './types';
import * as mock from './mock-store';

/**
 * Service interface for MONSOONPROOF command/query API.
 * Mock implementation is default; swap getMonsoonProofApi() later for callable functions.
 */
export interface MonsoonProofApi {
  subscribe(listener: () => void): () => void;
  getState(): MonsoonProofState;

  setDemoRole(role: DemoRole): void;
  setActiveSociety(societyId: SocietyId): void;
  reset(): void;

  createIncident(input: CreateIncidentInput): Promise<CommandResult<{ incident: Incident }>>;
  linkIncidentsToSharedCase(
    input: LinkIncidentsInput,
  ): Promise<CommandResult<{ case: SharedCase }>>;
  proposeHandoff(input: ProposeHandoffInput): Promise<CommandResult<{ case: SharedCase }>>;
  decideHandoff(input: DecideHandoffInput): Promise<CommandResult<{ case: SharedCase }>>;
  createWorkOrder(input: CreateWorkOrderInput): Promise<CommandResult<{ workOrder: WorkOrder }>>;
  updateWorkOrderStatus(
    input: UpdateWorkOrderStatusInput,
  ): Promise<CommandResult<{ workOrder: WorkOrder }>>;
  assignWorker(
    workOrderId: string,
    expectedVersion: number,
    workerId: string,
  ): Promise<CommandResult<{ workOrder: WorkOrder }>>;
  finalizeEvidenceUpload(
    input: FinalizeEvidenceInput,
  ): Promise<CommandResult<{ workOrder: WorkOrder }>>;
  addDemoEvidence(
    workOrderId: string,
    label: string,
  ): Promise<CommandResult<{ workOrder: WorkOrder }>>;
  verifyRepair(input: VerifyRepairInput): Promise<CommandResult<{ workOrder: WorkOrder }>>;

  newCommandId(): string;
}

const mockApi: MonsoonProofApi = {
  subscribe: mock.subscribe,
  getState: mock.getSnapshot,
  setDemoRole: mock.setDemoRole,
  setActiveSociety: mock.setActiveSociety,
  reset: mock.resetStore,

  async createIncident(input) {
    return mock.createIncident(input);
  },
  async linkIncidentsToSharedCase(input) {
    return mock.linkIncidentsToSharedCase(input);
  },
  async proposeHandoff(input) {
    return mock.proposeHandoff(input);
  },
  async decideHandoff(input) {
    return mock.decideHandoff(input);
  },
  async createWorkOrder(input) {
    return mock.createWorkOrder(input);
  },
  async updateWorkOrderStatus(input) {
    return mock.updateWorkOrderStatus(input);
  },
  async assignWorker(workOrderId, expectedVersion, workerId) {
    return mock.assignWorker(workOrderId, expectedVersion, workerId);
  },
  async finalizeEvidenceUpload(input) {
    return mock.finalizeEvidenceUpload(input);
  },
  async addDemoEvidence(workOrderId, label) {
    return mock.addDemoEvidence(workOrderId, label);
  },
  async verifyRepair(input) {
    return mock.verifyRepair(input);
  },
  newCommandId: mock.newCommandId,
};

/** Default: mock API. Later switch via env to Firebase callables. */
export function getMonsoonProofApi(): MonsoonProofApi {
  return mockApi;
}

export type { MonsoonProofState };
