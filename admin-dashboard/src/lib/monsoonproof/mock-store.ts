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
  SharedCase,
  SocietyId,
  UpdateWorkOrderStatusInput,
  VerifyRepairInput,
  WorkOrder,
} from './types';

type Listener = () => void;

const listeners = new Set<Listener>();

function nowIso(offsetMinutes = 0): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function newCommandId(): string {
  return uid('cmd');
}

function createSeedState(): MonsoonProofState {
  const societies = [
    { id: 'sea-view' as SocietyId, name: 'Sea View CHS' },
    { id: 'palm-heights' as SocietyId, name: 'Palm Heights' },
    { id: 'harbor-residences' as SocietyId, name: 'Harbor Residences' },
  ];

  const assets = [
    {
      id: 'asset_d03',
      code: 'D-03',
      name: 'Shared drainage line D-03',
      description:
        'Cross-society stormwater drainage segment serving Sea View CHS, Palm Heights, and Harbor Residences along the eastern boundary.',
      societyIds: ['sea-view', 'palm-heights', 'harbor-residences'] as SocietyId[],
    },
  ];

  const workers = [
    { id: 'w_ravi', name: 'Ravi Patil', specialty: 'Drainage & civil', available: true },
    { id: 'w_meena', name: 'Meena Shah', specialty: 'Plumbing', available: true },
    { id: 'w_omar', name: 'Omar Khan', specialty: 'Civil repair', available: false },
  ];

  const incidents: Incident[] = [
    {
      id: 'inc_sv_01',
      societyId: 'sea-view',
      flatLabel: 'B-204',
      title: 'Basement seepage after heavy rain',
      description:
        'Water backing up near the eastern service corridor. Smell of stagnant drainage. Suspected blockage on shared line D-03.',
      assetId: 'asset_d03',
      status: 'linked',
      sharedCaseId: 'case_d03_01',
      reportedBy: 'Priya Nair',
      createdAt: nowIso(-60 * 36),
      updatedAt: nowIso(-60 * 20),
      version: 2,
    },
    {
      id: 'inc_ph_01',
      societyId: 'palm-heights',
      flatLabel: 'Tower A Lobby',
      title: 'Lobby drain overflowing',
      description:
        'Lobby floor drain overflowing during monsoon showers. Facilities team traced flow toward D-03 junction.',
      assetId: 'asset_d03',
      status: 'linked',
      sharedCaseId: 'case_d03_01',
      reportedBy: 'Facilities Desk',
      createdAt: nowIso(-60 * 30),
      updatedAt: nowIso(-60 * 20),
      version: 2,
    },
    {
      id: 'inc_hr_01',
      societyId: 'harbor-residences',
      flatLabel: 'Garden Path',
      title: 'Garden path flooding near fence',
      description:
        'Standing water along the shared fence line after overnight rain. Manhole near D-03 emitting odor.',
      assetId: 'asset_d03',
      status: 'linked',
      sharedCaseId: 'case_d03_01',
      reportedBy: 'Security Booth',
      createdAt: nowIso(-60 * 28),
      updatedAt: nowIso(-60 * 20),
      version: 2,
    },
    {
      id: 'inc_sv_02',
      societyId: 'sea-view',
      flatLabel: 'C-101',
      title: 'Parking bay water logging',
      description: 'Parking bay P12 floods within 20 minutes of rain. May relate to D-03 capacity.',
      assetId: 'asset_d03',
      status: 'submitted',
      sharedCaseId: null,
      reportedBy: 'Amit Desai',
      createdAt: nowIso(-60 * 4),
      updatedAt: nowIso(-60 * 4),
      version: 1,
    },
    {
      id: 'inc_ph_02',
      societyId: 'palm-heights',
      flatLabel: 'B-508',
      title: 'Balcony drain slow',
      description: 'Unit balcony drain slow; likely local, not shared asset.',
      assetId: null,
      status: 'triaged',
      sharedCaseId: null,
      reportedBy: 'Resident App',
      createdAt: nowIso(-60 * 8),
      updatedAt: nowIso(-60 * 6),
      version: 1,
    },
  ];

  const sharedCases: SharedCase[] = [
    {
      id: 'case_d03_01',
      title: 'D-03 shared drainage blockage',
      summary:
        'Multiple monsoon reports across three societies point to obstruction / capacity failure on shared drainage line D-03.',
      assetId: 'asset_d03',
      status: 'handoff_pending',
      ownerSocietyId: 'sea-view',
      incidentIds: ['inc_sv_01', 'inc_ph_01', 'inc_hr_01'],
      handoffStatus: 'proposed',
      handoffToSocietyId: 'harbor-residences',
      handoffProposedBy: 'sea-view',
      handoffReason:
        'Downstream manhole and access pit sit inside Harbor Residences. Request federation coordination for excavation permit.',
      handoffDisputeReason: null,
      activeWorkOrderId: 'wo_d03_01',
      createdAt: nowIso(-60 * 20),
      updatedAt: nowIso(-60 * 2),
      version: 4,
    },
  ];

  const workOrders: WorkOrder[] = [
    {
      id: 'wo_d03_01',
      caseId: 'case_d03_01',
      title: 'CCTV survey + partial desilting of D-03',
      description:
        'Camera survey from Sea View access pit; clear silt pocket if accessible without full handoff excavation.',
      status: 'in_progress',
      assignedWorkerId: 'w_ravi',
      assignedWorkerName: 'Ravi Patil',
      evidence: [
        {
          id: 'ev_01',
          label: 'Access pit photo (Sea View)',
          url: 'https://placehold.co/640x400/164E41/F4F7F5?text=D-03+Access+Pit',
          uploadedAt: nowIso(-90),
          finalized: false,
        },
      ],
      reopenReason: null,
      createdAt: nowIso(-60 * 12),
      updatedAt: nowIso(-60 * 1),
      version: 3,
    },
  ];

  const caseEvents: CaseEvent[] = [
    {
      id: 'evt_01',
      caseId: 'case_d03_01',
      type: 'case_created',
      message: 'Shared case opened for D-03 drainage after cross-society pattern detected.',
      actorRole: 'society_manager',
      actorLabel: 'Sea View Manager',
      createdAt: nowIso(-60 * 20),
    },
    {
      id: 'evt_02',
      caseId: 'case_d03_01',
      type: 'incident_linked',
      message: 'Linked incidents from Sea View, Palm Heights, and Harbor Residences.',
      actorRole: 'society_manager',
      actorLabel: 'Sea View Manager',
      createdAt: nowIso(-60 * 19),
    },
    {
      id: 'evt_03',
      caseId: 'case_d03_01',
      type: 'work_order_created',
      message: 'Work order created: CCTV survey + partial desilting.',
      actorRole: 'society_manager',
      actorLabel: 'Sea View Manager',
      createdAt: nowIso(-60 * 12),
    },
    {
      id: 'evt_04',
      caseId: 'case_d03_01',
      type: 'work_order_assigned',
      message: 'Assigned to Ravi Patil.',
      actorRole: 'society_manager',
      actorLabel: 'Sea View Manager',
      createdAt: nowIso(-60 * 11),
    },
    {
      id: 'evt_05',
      caseId: 'case_d03_01',
      type: 'handoff_proposed',
      message:
        'Handoff proposed to Harbor Residences (pending — ownership not transferred until accept).',
      actorRole: 'society_manager',
      actorLabel: 'Sea View Manager',
      createdAt: nowIso(-60 * 2),
      meta: { to: 'harbor-residences' },
    },
  ];

  return {
    societies,
    assets,
    incidents,
    sharedCases,
    caseEvents,
    workOrders,
    workers,
    demoRole: 'society_manager',
    activeSocietyId: 'sea-view',
  };
}

let state: MonsoonProofState = createSeedState();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): MonsoonProofState {
  return state;
}

function emit(): void {
  listeners.forEach((l) => l());
}

function patchState(partial: Partial<MonsoonProofState>): void {
  state = { ...state, ...partial };
  emit();
}

function societyName(id: SocietyId): string {
  return state.societies.find((s) => s.id === id)?.name ?? id;
}

function appendEvent(
  caseId: string,
  type: CaseEvent['type'],
  message: string,
  meta?: Record<string, string>,
): void {
  const event: CaseEvent = {
    id: uid('evt'),
    caseId,
    type,
    message,
    actorRole: state.demoRole,
    actorLabel:
      state.demoRole === 'federation_rep'
        ? 'Federation Representative'
        : `${societyName(state.activeSocietyId)} Manager`,
    createdAt: nowIso(),
    meta,
  };
  state = { ...state, caseEvents: [event, ...state.caseEvents] };
}

function versionConflict(entityVersion: number, expectedVersion: number): CommandResult {
  if (entityVersion !== expectedVersion) {
    return {
      ok: false,
      conflict: true,
      error: `Version conflict: expected ${expectedVersion}, found ${entityVersion}. Refresh and retry.`,
    };
  }
  return { ok: true };
}

export function resetStore(): void {
  state = createSeedState();
  emit();
}

export function setDemoRole(role: DemoRole): void {
  patchState({ demoRole: role });
}

export function setActiveSociety(societyId: SocietyId): void {
  patchState({ activeSocietyId: societyId });
}

export function createIncident(input: CreateIncidentInput): CommandResult<{ incident: Incident }> {
  const incident: Incident = {
    id: uid('inc'),
    societyId: input.societyId,
    flatLabel: input.flatLabel,
    title: input.title,
    description: input.description,
    assetId: input.assetId ?? null,
    status: 'submitted',
    sharedCaseId: null,
    reportedBy: input.reportedBy,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    version: 1,
  };
  state = { ...state, incidents: [incident, ...state.incidents] };
  emit();
  return { ok: true, data: { incident } };
}

export function linkIncidentsToSharedCase(
  input: LinkIncidentsInput,
): CommandResult<{ case: SharedCase }> {
  const incidents = state.incidents.filter((i) => input.incidentIds.includes(i.id));
  if (incidents.length === 0) {
    return { ok: false, error: 'No incidents found to link.' };
  }

  if (input.caseId) {
    const existing = state.sharedCases.find((c) => c.id === input.caseId);
    if (!existing) return { ok: false, error: 'Shared case not found.' };
    const conflict = versionConflict(existing.version, input.expectedVersion);
    if (!conflict.ok) return conflict;

    const mergedIds = Array.from(new Set([...existing.incidentIds, ...input.incidentIds]));
    const updated: SharedCase = {
      ...existing,
      incidentIds: mergedIds,
      updatedAt: nowIso(),
      version: existing.version + 1,
    };

    state = {
      ...state,
      sharedCases: state.sharedCases.map((c) => (c.id === updated.id ? updated : c)),
      incidents: state.incidents.map((i) =>
        input.incidentIds.includes(i.id)
          ? {
              ...i,
              status: 'linked',
              sharedCaseId: updated.id,
              updatedAt: nowIso(),
              version: i.version + 1,
            }
          : i,
      ),
    };
    appendEvent(updated.id, 'incident_linked', `Linked ${input.incidentIds.length} incident(s) to case.`);
    emit();
    return { ok: true, data: { case: updated } };
  }

  const created: SharedCase = {
    id: uid('case'),
    title: input.title || `Shared case — ${assetsLabel(input.assetId)}`,
    summary: input.summary || 'Linked cross-society incidents on shared asset.',
    assetId: input.assetId,
    status: 'open',
    ownerSocietyId: input.ownerSocietyId,
    incidentIds: input.incidentIds,
    handoffStatus: 'none',
    handoffToSocietyId: null,
    handoffProposedBy: null,
    handoffReason: null,
    handoffDisputeReason: null,
    activeWorkOrderId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    version: 1,
  };

  state = {
    ...state,
    sharedCases: [created, ...state.sharedCases],
    incidents: state.incidents.map((i) =>
      input.incidentIds.includes(i.id)
        ? {
            ...i,
            status: 'linked',
            sharedCaseId: created.id,
            updatedAt: nowIso(),
            version: i.version + 1,
          }
        : i,
    ),
  };
  appendEvent(created.id, 'case_created', `Shared case created: ${created.title}`);
  appendEvent(created.id, 'incident_linked', `Linked ${input.incidentIds.length} incident(s).`);
  emit();
  return { ok: true, data: { case: created } };
}

function assetsLabel(assetId: string): string {
  return state.assets.find((a) => a.id === assetId)?.code ?? assetId;
}

export function proposeHandoff(input: ProposeHandoffInput): CommandResult<{ case: SharedCase }> {
  const existing = state.sharedCases.find((c) => c.id === input.caseId);
  if (!existing) return { ok: false, error: 'Shared case not found.' };
  const conflict = versionConflict(existing.version, input.expectedVersion);
  if (!conflict.ok) return conflict;

  if (!input.reason.trim()) {
    return { ok: false, error: 'A reason is required to propose handoff.' };
  }

  if (existing.handoffStatus === 'proposed') {
    return { ok: false, error: 'A handoff is already pending acceptance.' };
  }

  const updated: SharedCase = {
    ...existing,
    // Ownership stays with current owner until accept
    status: 'handoff_pending',
    handoffStatus: 'proposed',
    handoffToSocietyId: input.toSocietyId,
    handoffProposedBy: input.fromSocietyId,
    handoffReason: input.reason.trim(),
    handoffDisputeReason: null,
    updatedAt: nowIso(),
    version: existing.version + 1,
  };

  state = {
    ...state,
    sharedCases: state.sharedCases.map((c) => (c.id === updated.id ? updated : c)),
  };
  appendEvent(
    updated.id,
    'handoff_proposed',
    `Handoff proposed to ${societyName(input.toSocietyId)}. Ownership not transferred until accept.`,
    { to: input.toSocietyId },
  );
  emit();
  return { ok: true, data: { case: updated } };
}

export function decideHandoff(input: DecideHandoffInput): CommandResult<{ case: SharedCase }> {
  const existing = state.sharedCases.find((c) => c.id === input.caseId);
  if (!existing) return { ok: false, error: 'Shared case not found.' };
  const conflict = versionConflict(existing.version, input.expectedVersion);
  if (!conflict.ok) return conflict;

  if (existing.handoffStatus !== 'proposed' && existing.handoffStatus !== 'info_requested') {
    return { ok: false, error: 'No pending handoff to decide.' };
  }

  if (input.action === 'dispute' || input.action === 'request_info') {
    if (!input.reason?.trim()) {
      return { ok: false, error: 'A reason is required for this action.' };
    }
  }

  let updated: SharedCase;

  if (input.action === 'accept') {
    if (!existing.handoffToSocietyId) {
      return { ok: false, error: 'Handoff target society missing.' };
    }
    updated = {
      ...existing,
      ownerSocietyId: existing.handoffToSocietyId,
      status: existing.activeWorkOrderId ? 'in_repair' : 'open',
      handoffStatus: 'accepted',
      handoffDisputeReason: null,
      updatedAt: nowIso(),
      version: existing.version + 1,
    };
    state = {
      ...state,
      sharedCases: state.sharedCases.map((c) => (c.id === updated.id ? updated : c)),
    };
    appendEvent(
      updated.id,
      'handoff_accepted',
      `Handoff accepted. Ownership transferred to ${societyName(updated.ownerSocietyId)}.`,
    );
  } else if (input.action === 'dispute') {
    updated = {
      ...existing,
      status: 'disputed',
      handoffStatus: 'disputed',
      handoffDisputeReason: input.reason!.trim(),
      updatedAt: nowIso(),
      version: existing.version + 1,
    };
    state = {
      ...state,
      sharedCases: state.sharedCases.map((c) => (c.id === updated.id ? updated : c)),
    };
    appendEvent(updated.id, 'handoff_disputed', `Handoff disputed: ${input.reason!.trim()}`);
  } else {
    updated = {
      ...existing,
      handoffStatus: 'info_requested',
      handoffDisputeReason: input.reason!.trim(),
      updatedAt: nowIso(),
      version: existing.version + 1,
    };
    state = {
      ...state,
      sharedCases: state.sharedCases.map((c) => (c.id === updated.id ? updated : c)),
    };
    appendEvent(updated.id, 'info_requested', `Information requested: ${input.reason!.trim()}`);
  }

  emit();
  return { ok: true, data: { case: updated } };
}

export function createWorkOrder(
  input: CreateWorkOrderInput,
): CommandResult<{ workOrder: WorkOrder }> {
  const existing = state.sharedCases.find((c) => c.id === input.caseId);
  if (!existing) return { ok: false, error: 'Shared case not found.' };
  const conflict = versionConflict(existing.version, input.expectedVersion);
  if (!conflict.ok) return conflict;

  const worker = input.assignedWorkerId
    ? state.workers.find((w) => w.id === input.assignedWorkerId)
    : null;

  const workOrder: WorkOrder = {
    id: uid('wo'),
    caseId: input.caseId,
    title: input.title,
    description: input.description,
    status: worker ? 'assigned' : 'draft',
    assignedWorkerId: worker?.id ?? null,
    assignedWorkerName: worker?.name ?? null,
    evidence: [],
    reopenReason: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    version: 1,
  };

  const updatedCase: SharedCase = {
    ...existing,
    status: 'in_repair',
    activeWorkOrderId: workOrder.id,
    updatedAt: nowIso(),
    version: existing.version + 1,
  };

  state = {
    ...state,
    workOrders: [workOrder, ...state.workOrders],
    sharedCases: state.sharedCases.map((c) => (c.id === updatedCase.id ? updatedCase : c)),
  };
  appendEvent(input.caseId, 'work_order_created', `Work order created: ${workOrder.title}`);
  if (worker) {
    appendEvent(input.caseId, 'work_order_assigned', `Assigned to ${worker.name}.`);
  }
  emit();
  return { ok: true, data: { workOrder } };
}

export function updateWorkOrderStatus(
  input: UpdateWorkOrderStatusInput,
): CommandResult<{ workOrder: WorkOrder }> {
  const existing = state.workOrders.find((w) => w.id === input.workOrderId);
  if (!existing) return { ok: false, error: 'Work order not found.' };
  const conflict = versionConflict(existing.version, input.expectedVersion);
  if (!conflict.ok) return conflict;

  if (input.status === 'reopened' && !input.reason?.trim()) {
    return { ok: false, error: 'A reason is required to reopen.' };
  }

  let assignedWorkerId = existing.assignedWorkerId;
  let assignedWorkerName = existing.assignedWorkerName;

  // Allow assignment via status update when worker id passed in reason field as assign:<id>
  if (input.status === 'assigned' && input.reason?.startsWith('assign:')) {
    const workerId = input.reason.slice('assign:'.length);
    const worker = state.workers.find((w) => w.id === workerId);
    if (!worker) return { ok: false, error: 'Worker not found.' };
    assignedWorkerId = worker.id;
    assignedWorkerName = worker.name;
  }

  const updated: WorkOrder = {
    ...existing,
    status: input.status,
    assignedWorkerId,
    assignedWorkerName,
    reopenReason: input.status === 'reopened' ? input.reason!.trim() : existing.reopenReason,
    updatedAt: nowIso(),
    version: existing.version + 1,
  };

  let sharedCases = state.sharedCases;
  const parent = state.sharedCases.find((c) => c.id === existing.caseId);
  if (parent) {
    let caseStatus = parent.status;
    if (input.status === 'awaiting_verification') caseStatus = 'awaiting_verification';
    if (input.status === 'in_progress' || input.status === 'assigned') caseStatus = 'in_repair';
    if (input.status === 'reopened') caseStatus = 'reopened';
    sharedCases = state.sharedCases.map((c) =>
      c.id === parent.id
        ? { ...c, status: caseStatus, updatedAt: nowIso(), version: c.version + 1 }
        : c,
    );
  }

  state = {
    ...state,
    workOrders: state.workOrders.map((w) => (w.id === updated.id ? updated : w)),
    sharedCases,
  };
  appendEvent(
    existing.caseId,
    'work_order_status',
    `Work order status → ${input.status.replace(/_/g, ' ')}.`,
  );
  emit();
  return { ok: true, data: { workOrder: updated } };
}

export function assignWorker(
  workOrderId: string,
  expectedVersion: number,
  workerId: string,
): CommandResult<{ workOrder: WorkOrder }> {
  return updateWorkOrderStatus({
    commandId: newCommandId(),
    expectedVersion,
    workOrderId,
    status: 'assigned',
    reason: `assign:${workerId}`,
  });
}

export function finalizeEvidenceUpload(
  input: FinalizeEvidenceInput,
): CommandResult<{ workOrder: WorkOrder }> {
  const existing = state.workOrders.find((w) => w.id === input.workOrderId);
  if (!existing) return { ok: false, error: 'Work order not found.' };
  const conflict = versionConflict(existing.version, input.expectedVersion);
  if (!conflict.ok) return conflict;

  const evidence = existing.evidence.map((e) =>
    e.id === input.evidenceId ? { ...e, finalized: true } : e,
  );
  if (!existing.evidence.some((e) => e.id === input.evidenceId)) {
    return { ok: false, error: 'Evidence item not found.' };
  }

  const updated: WorkOrder = {
    ...existing,
    evidence,
    status: 'awaiting_verification',
    updatedAt: nowIso(),
    version: existing.version + 1,
  };

  state = {
    ...state,
    workOrders: state.workOrders.map((w) => (w.id === updated.id ? updated : w)),
    sharedCases: state.sharedCases.map((c) =>
      c.id === existing.caseId
        ? {
            ...c,
            status: 'awaiting_verification',
            updatedAt: nowIso(),
            version: c.version + 1,
          }
        : c,
    ),
  };
  appendEvent(existing.caseId, 'evidence_finalized', 'Completion evidence finalized for verification.');
  emit();
  return { ok: true, data: { workOrder: updated } };
}

export function addDemoEvidence(
  workOrderId: string,
  label: string,
): CommandResult<{ workOrder: WorkOrder }> {
  const existing = state.workOrders.find((w) => w.id === workOrderId);
  if (!existing) return { ok: false, error: 'Work order not found.' };

  const item = {
    id: uid('ev'),
    label,
    url: `https://placehold.co/640x400/147D72/F4F7F5?text=${encodeURIComponent(label.slice(0, 24))}`,
    uploadedAt: nowIso(),
    finalized: false,
  };

  const updated: WorkOrder = {
    ...existing,
    evidence: [...existing.evidence, item],
    updatedAt: nowIso(),
    version: existing.version + 1,
  };
  state = {
    ...state,
    workOrders: state.workOrders.map((w) => (w.id === updated.id ? updated : w)),
  };
  emit();
  return { ok: true, data: { workOrder: updated } };
}

export function verifyRepair(
  input: VerifyRepairInput,
): CommandResult<{ workOrder: WorkOrder }> {
  const existing = state.workOrders.find((w) => w.id === input.workOrderId);
  if (!existing) return { ok: false, error: 'Work order not found.' };
  const conflict = versionConflict(existing.version, input.expectedVersion);
  if (!conflict.ok) return conflict;

  if (input.action === 'reopen' && !input.reason?.trim()) {
    return { ok: false, error: 'A reason is required to reopen.' };
  }

  if (input.action === 'verify') {
    const hasFinalEvidence = existing.evidence.some((e) => e.finalized);
    if (!hasFinalEvidence && existing.status !== 'awaiting_verification') {
      return { ok: false, error: 'Finalize evidence and confirm before verifying.' };
    }
  }

  const updated: WorkOrder = {
    ...existing,
    status: input.action === 'verify' ? 'verified' : 'reopened',
    reopenReason: input.action === 'reopen' ? input.reason!.trim() : null,
    updatedAt: nowIso(),
    version: existing.version + 1,
  };

  state = {
    ...state,
    workOrders: state.workOrders.map((w) => (w.id === updated.id ? updated : w)),
    sharedCases: state.sharedCases.map((c) =>
      c.id === existing.caseId
        ? {
            ...c,
            status: input.action === 'verify' ? 'verified' : 'reopened',
            updatedAt: nowIso(),
            version: c.version + 1,
          }
        : c,
    ),
  };

  if (input.action === 'verify') {
    appendEvent(existing.caseId, 'repair_verified', 'Repair verified and case closed for verification.');
  } else {
    appendEvent(existing.caseId, 'repair_reopened', `Repair reopened: ${input.reason!.trim()}`);
  }

  emit();
  return { ok: true, data: { workOrder: updated } };
}

export { newCommandId };
