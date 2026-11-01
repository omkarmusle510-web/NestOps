'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { getMonsoonProofApi, type MonsoonProofApi } from '@/lib/monsoonproof/api';
import type {
  CaseEvent,
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
  SharedAsset,
  SharedCase,
  Society,
  SocietyId,
  UpdateWorkOrderStatusInput,
  VerifyRepairInput,
  WorkOrder,
  DemoWorker,
} from '@/lib/monsoonproof/types';

interface MonsoonProofContextValue {
  state: MonsoonProofState;
  api: MonsoonProofApi;
  societies: Society[];
  assets: SharedAsset[];
  incidents: Incident[];
  sharedCases: SharedCase[];
  caseEvents: CaseEvent[];
  workOrders: WorkOrder[];
  workers: DemoWorker[];
  demoRole: DemoRole;
  activeSocietyId: SocietyId;
  setDemoRole: (role: DemoRole) => void;
  setActiveSociety: (id: SocietyId) => void;
  societyName: (id: SocietyId) => string;
  assetById: (id: string) => SharedAsset | undefined;
  getCaseEvents: (caseId: string) => CaseEvent[];
  pendingHandoffs: SharedCase[];
  overviewCounts: {
    incomingReports: number;
    openSharedCases: number;
    pendingHandoffs: number;
    activeWorkOrders: number;
  };
  createIncident: (input: Omit<CreateIncidentInput, 'commandId' | 'expectedVersion'>) => Promise<CommandResult<{ incident: Incident }>>;
  linkIncidentsToSharedCase: (input: Omit<LinkIncidentsInput, 'commandId'> & { expectedVersion?: number }) => Promise<CommandResult<{ case: SharedCase }>>;
  proposeHandoff: (input: Omit<ProposeHandoffInput, 'commandId'>) => Promise<CommandResult<{ case: SharedCase }>>;
  decideHandoff: (input: Omit<DecideHandoffInput, 'commandId'>) => Promise<CommandResult<{ case: SharedCase }>>;
  createWorkOrder: (input: Omit<CreateWorkOrderInput, 'commandId'>) => Promise<CommandResult<{ workOrder: WorkOrder }>>;
  updateWorkOrderStatus: (input: Omit<UpdateWorkOrderStatusInput, 'commandId'>) => Promise<CommandResult<{ workOrder: WorkOrder }>>;
  assignWorker: (workOrderId: string, expectedVersion: number, workerId: string) => Promise<CommandResult<{ workOrder: WorkOrder }>>;
  finalizeEvidenceUpload: (input: Omit<FinalizeEvidenceInput, 'commandId'>) => Promise<CommandResult<{ workOrder: WorkOrder }>>;
  addDemoEvidence: (workOrderId: string, label: string) => Promise<CommandResult<{ workOrder: WorkOrder }>>;
  verifyRepair: (input: Omit<VerifyRepairInput, 'commandId'>) => Promise<CommandResult<{ workOrder: WorkOrder }>>;
}

const MonsoonProofContext = createContext<MonsoonProofContextValue | null>(null);

const api = getMonsoonProofApi();

export function MonsoonProofProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(api.subscribe, api.getState, api.getState);

  const societyName = useCallback(
    (id: SocietyId) => state.societies.find((s) => s.id === id)?.name ?? id,
    [state.societies],
  );

  const assetById = useCallback(
    (id: string) => state.assets.find((a) => a.id === id),
    [state.assets],
  );

  const getCaseEvents = useCallback(
    (caseId: string) =>
      state.caseEvents
        .filter((e) => e.caseId === caseId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.caseEvents],
  );

  const pendingHandoffs = useMemo(
    () =>
      state.sharedCases.filter(
        (c) => c.handoffStatus === 'proposed' || c.handoffStatus === 'info_requested',
      ),
    [state.sharedCases],
  );

  const overviewCounts = useMemo(() => {
    const incomingReports = state.incidents.filter(
      (i) => i.status === 'submitted' || i.status === 'triaged',
    ).length;
    const openSharedCases = state.sharedCases.filter(
      (c) => c.status !== 'verified',
    ).length;
    const activeWorkOrders = state.workOrders.filter(
      (w) => w.status !== 'verified',
    ).length;
    return {
      incomingReports,
      openSharedCases,
      pendingHandoffs: pendingHandoffs.length,
      activeWorkOrders,
    };
  }, [state.incidents, state.sharedCases, state.workOrders, pendingHandoffs.length]);

  const value = useMemo<MonsoonProofContextValue>(
    () => ({
      state,
      api,
      societies: state.societies,
      assets: state.assets,
      incidents: state.incidents,
      sharedCases: state.sharedCases,
      caseEvents: state.caseEvents,
      workOrders: state.workOrders,
      workers: state.workers,
      demoRole: state.demoRole,
      activeSocietyId: state.activeSocietyId,
      setDemoRole: api.setDemoRole,
      setActiveSociety: api.setActiveSociety,
      societyName,
      assetById,
      getCaseEvents,
      pendingHandoffs,
      overviewCounts,
      createIncident: (input) =>
        api.createIncident({
          ...input,
          commandId: api.newCommandId(),
          expectedVersion: 0,
        }),
      linkIncidentsToSharedCase: (input) =>
        api.linkIncidentsToSharedCase({
          ...input,
          commandId: api.newCommandId(),
          expectedVersion: input.expectedVersion ?? 0,
        }),
      proposeHandoff: (input) =>
        api.proposeHandoff({ ...input, commandId: api.newCommandId() }),
      decideHandoff: (input) =>
        api.decideHandoff({ ...input, commandId: api.newCommandId() }),
      createWorkOrder: (input) =>
        api.createWorkOrder({ ...input, commandId: api.newCommandId() }),
      updateWorkOrderStatus: (input) =>
        api.updateWorkOrderStatus({ ...input, commandId: api.newCommandId() }),
      assignWorker: (workOrderId, expectedVersion, workerId) =>
        api.assignWorker(workOrderId, expectedVersion, workerId),
      finalizeEvidenceUpload: (input) =>
        api.finalizeEvidenceUpload({ ...input, commandId: api.newCommandId() }),
      addDemoEvidence: (workOrderId, label) => api.addDemoEvidence(workOrderId, label),
      verifyRepair: (input) =>
        api.verifyRepair({ ...input, commandId: api.newCommandId() }),
    }),
    [
      state,
      societyName,
      assetById,
      getCaseEvents,
      pendingHandoffs,
      overviewCounts,
    ],
  );

  return (
    <MonsoonProofContext.Provider value={value}>{children}</MonsoonProofContext.Provider>
  );
}

export function useMonsoonProof(): MonsoonProofContextValue {
  const ctx = useContext(MonsoonProofContext);
  if (!ctx) {
    throw new Error('useMonsoonProof must be used within MonsoonProofProvider');
  }
  return ctx;
}
