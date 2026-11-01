import 'dart:async';

import '../models/monsoonproof_enums.dart';
import '../models/monsoonproof_models.dart';
import 'demo_seed.dart';
import 'monsoonproof_api.dart';

class MockMonsoonProofApi implements MonsoonProofApi {
  MockMonsoonProofApi() {
    _seed();
  }

  final Map<String, Incident> _incidents = {};
  final Map<String, SharedCase> _cases = {};
  final Map<String, List<CaseEvent>> _events = {};
  final Map<String, WorkOrder> _workOrders = {};
  final Set<String> _seenCommands = {};

  final _incidentsController = StreamController<List<Incident>>.broadcast();
  final _casesController = StreamController<List<SharedCase>>.broadcast();
  final Map<String, StreamController<SharedCase?>> _caseControllers = {};
  final Map<String, StreamController<List<CaseEvent>>> _eventControllers = {};
  final Map<String, StreamController<WorkOrder?>> _woControllers = {};
  final _workOrdersController = StreamController<List<WorkOrder>>.broadcast();

  int _seq = 100;

  void _seed() {
    final now = DateTime.now();
    for (final i in MonsoonProofDemoSeed.buildIncidents(now)) {
      _incidents[i.id] = i;
    }
    for (final c in MonsoonProofDemoSeed.buildCases(now)) {
      _cases[c.id] = c;
      _events[c.id] = [];
    }
    for (final e in MonsoonProofDemoSeed.buildEvents(now)) {
      _events.putIfAbsent(e.caseId, () => []).add(e);
    }
    for (final w in MonsoonProofDemoSeed.buildWorkOrders(now)) {
      _workOrders[w.id] = w;
    }
  }

  String _nextId(String prefix) {
    _seq += 1;
    return '${prefix}_$_seq';
  }

  Future<void> _latency() => Future.delayed(const Duration(milliseconds: 350));

  bool _isDuplicate(String commandId) => _seenCommands.contains(commandId);

  void _markCommand(String commandId) => _seenCommands.add(commandId);

  void _emitIncidents() {
    if (!_incidentsController.isClosed) {
      _incidentsController.add(_incidents.values.toList());
    }
  }

  void _emitCases() {
    if (!_casesController.isClosed) {
      _casesController.add(_cases.values.toList());
    }
    for (final entry in _caseControllers.entries) {
      if (!entry.value.isClosed) {
        entry.value.add(_cases[entry.key]);
      }
    }
  }

  void _emitEvents(String caseId) {
    final ctrl = _eventControllers[caseId];
    if (ctrl != null && !ctrl.isClosed) {
      final list = List<CaseEvent>.from(_events[caseId] ?? [])
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      ctrl.add(list);
    }
  }

  void _emitWorkOrders() {
    if (!_workOrdersController.isClosed) {
      _workOrdersController.add(_workOrders.values.toList());
    }
    for (final entry in _woControllers.entries) {
      if (!entry.value.isClosed) {
        entry.value.add(_workOrders[entry.key]);
      }
    }
  }

  void _addEvent({
    required String caseId,
    required CaseEventType type,
    required String actorId,
    required String actorName,
    required String summary,
    Map<String, dynamic>? meta,
  }) {
    final event = CaseEvent(
      id: _nextId('evt'),
      caseId: caseId,
      type: type,
      actorId: actorId,
      actorName: actorName,
      summary: summary,
      createdAt: DateTime.now(),
      meta: meta,
    );
    _events.putIfAbsent(caseId, () => []).add(event);
    _emitEvents(caseId);
  }

  @override
  Stream<List<Incident>> watchIncidentsForReporter(String reporterId) async* {
    yield _incidents.values.where((i) => i.reporterId == reporterId).toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    yield* _incidentsController.stream.map(
      (all) => all.where((i) => i.reporterId == reporterId).toList()
        ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt)),
    );
  }

  @override
  Stream<List<Incident>> watchIncidentsForSociety(String societyId) async* {
    yield _incidents.values.where((i) => i.societyId == societyId).toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    yield* _incidentsController.stream.map(
      (all) => all.where((i) => i.societyId == societyId).toList()
        ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt)),
    );
  }

  @override
  Future<List<Incident>> listIncidentsForReporter(String reporterId) async {
    await _latency();
    return _incidents.values.where((i) => i.reporterId == reporterId).toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  @override
  Future<Incident?> getIncident(String incidentId) async {
    await _latency();
    return _incidents[incidentId];
  }

  @override
  Stream<SharedCase?> watchCase(String caseId) {
    final ctrl = _caseControllers.putIfAbsent(
      caseId,
      () => StreamController<SharedCase?>.broadcast(),
    );
    scheduleMicrotask(() {
      if (!ctrl.isClosed) ctrl.add(_cases[caseId]);
    });
    return ctrl.stream;
  }

  @override
  Future<SharedCase?> getCase(String caseId) async {
    await _latency();
    return _cases[caseId];
  }

  @override
  Future<List<SharedCase>> listCases() async {
    await _latency();
    return _cases.values.toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  @override
  Stream<List<CaseEvent>> watchCaseEvents(String caseId) {
    final ctrl = _eventControllers.putIfAbsent(
      caseId,
      () => StreamController<List<CaseEvent>>.broadcast(),
    );
    scheduleMicrotask(() {
      if (!ctrl.isClosed) {
        final list = List<CaseEvent>.from(_events[caseId] ?? [])
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
        ctrl.add(list);
      }
    });
    return ctrl.stream;
  }

  @override
  Stream<List<WorkOrder>> watchWorkOrdersForWorker(String workerId) async* {
    yield _workOrders.values.where((w) => w.workerId == workerId).toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    yield* _workOrdersController.stream.map(
      (all) => all.where((w) => w.workerId == workerId).toList()
        ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt)),
    );
  }

  @override
  Stream<List<WorkOrder>> watchWorkOrdersForCase(String caseId) async* {
    yield _workOrders.values.where((w) => w.caseId == caseId).toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    yield* _workOrdersController.stream.map(
      (all) => all.where((w) => w.caseId == caseId).toList()
        ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt)),
    );
  }

  @override
  Future<WorkOrder?> getWorkOrder(String workOrderId) async {
    await _latency();
    return _workOrders[workOrderId];
  }

  @override
  Stream<WorkOrder?> watchWorkOrder(String workOrderId) {
    final ctrl = _woControllers.putIfAbsent(
      workOrderId,
      () => StreamController<WorkOrder?>.broadcast(),
    );
    scheduleMicrotask(() {
      if (!ctrl.isClosed) ctrl.add(_workOrders[workOrderId]);
    });
    return ctrl.stream;
  }

  @override
  Future<List<SharedAsset>> listSharedAssets({String? societyId}) async {
    await _latency();
    final assets = MonsoonProofDemoSeed.sharedAssets;
    if (societyId == null) return List.from(assets);
    return assets.where((a) => a.societyIds.contains(societyId)).toList();
  }

  @override
  Future<CommandResult> createIncident(CreateIncidentRequest request) async {
    await _latency();
    if (_isDuplicate(request.commandId)) {
      return CommandResult.ok(entityId: 'idempotent');
    }
    _markCommand(request.commandId);

    final now = DateTime.now();
    final id = _nextId('inc');
    final incident = Incident(
      id: id,
      reporterId: request.reporterId,
      reporterName: request.reporterName,
      societyId: request.societyId,
      societyName: request.societyName,
      building: request.building,
      floor: request.floor,
      unit: request.unit,
      category: request.category,
      description: request.description,
      photoUrl: request.photoUrl,
      sharedAssetId: request.sharedAssetId,
      status: IncidentStatus.reported,
      version: 1,
      createdAt: now,
      updatedAt: now,
      latestUpdate: 'Issue reported. Pending review.',
    );
    _incidents[id] = incident;
    _emitIncidents();
    return CommandResult.ok(entityId: id, newVersion: 1);
  }

  @override
  Future<CommandResult> linkIncidentsToSharedCase({
    required String commandId,
    required List<String> incidentIds,
    required String sharedAssetId,
    required String ownerOrgId,
    required String ownerOrgName,
    String? title,
  }) async {
    await _latency();
    if (_isDuplicate(commandId)) return CommandResult.ok(entityId: 'idempotent');
    _markCommand(commandId);

    final now = DateTime.now();
    final caseId = _nextId('case');
    final sharedCase = SharedCase(
      id: caseId,
      title: title ?? 'Shared case · ${MonsoonProofDemoSeed.assetById(sharedAssetId)?.code ?? sharedAssetId}',
      sharedAssetId: sharedAssetId,
      incidentIds: List.from(incidentIds),
      ownerOrgId: ownerOrgId,
      ownerOrgName: ownerOrgName,
      status: CaseStatus.open,
      handoffStatus: HandoffStatus.none,
      latestUpdate: 'Shared case created.',
      version: 1,
      createdAt: now,
      updatedAt: now,
    );
    _cases[caseId] = sharedCase;
    _events[caseId] = [];

    for (final id in incidentIds) {
      final incident = _incidents[id];
      if (incident != null) {
        _incidents[id] = incident.copyWith(
          sharedCaseId: caseId,
          sharedAssetId: sharedAssetId,
          status: IncidentStatus.linked,
          version: incident.version + 1,
          updatedAt: now,
          latestUpdate: 'Linked to shared case.',
        );
      }
    }

    _addEvent(
      caseId: caseId,
      type: CaseEventType.incidentsLinked,
      actorId: 'system',
      actorName: 'System',
      summary: 'Linked ${incidentIds.length} incident(s) to shared case.',
    );
    _emitIncidents();
    _emitCases();
    return CommandResult.ok(entityId: caseId, newVersion: 1);
  }

  @override
  Future<CommandResult> proposeHandoff({
    required String commandId,
    required String caseId,
    required int expectedVersion,
    required String proposedOwnerOrgId,
    required String proposedOwnerOrgName,
    required String actorId,
    required String actorName,
    String? reason,
  }) async {
    await _latency();
    if (_isDuplicate(commandId)) return CommandResult.ok(entityId: caseId);
    final existing = _cases[caseId];
    if (existing == null) return CommandResult.failed('Case not found');
    if (existing.version != expectedVersion) return CommandResult.versionConflict();
    _markCommand(commandId);

    // Proposed handoff does NOT transfer ownership.
    final updated = existing.copyWith(
      proposedOwnerOrgId: proposedOwnerOrgId,
      proposedOwnerOrgName: proposedOwnerOrgName,
      handoffStatus: HandoffStatus.proposed,
      status: CaseStatus.handoffPending,
      latestUpdate: 'Handoff pending — ownership remains with ${existing.ownerOrgName}.',
      version: existing.version + 1,
      updatedAt: DateTime.now(),
    );
    _cases[caseId] = updated;
    _addEvent(
      caseId: caseId,
      type: CaseEventType.handoffProposed,
      actorId: actorId,
      actorName: actorName,
      summary: 'Proposed handoff to $proposedOwnerOrgName. Ownership unchanged until accepted.'
          '${reason != null && reason.isNotEmpty ? ' Reason: $reason' : ''}',
    );
    _emitCases();
    return CommandResult.ok(entityId: caseId, newVersion: updated.version);
  }

  @override
  Future<CommandResult> decideHandoff({
    required String commandId,
    required String caseId,
    required int expectedVersion,
    required String action,
    required String actorId,
    required String actorName,
    String? reason,
  }) async {
    await _latency();
    if (_isDuplicate(commandId)) return CommandResult.ok(entityId: caseId);
    final existing = _cases[caseId];
    if (existing == null) return CommandResult.failed('Case not found');
    if (existing.version != expectedVersion) return CommandResult.versionConflict();
    if (existing.handoffStatus != HandoffStatus.proposed) {
      return CommandResult.failed('No pending handoff to decide');
    }
    _markCommand(commandId);

    final now = DateTime.now();
    SharedCase updated;
    if (action == 'accept') {
      updated = existing.copyWith(
        ownerOrgId: existing.proposedOwnerOrgId,
        ownerOrgName: existing.proposedOwnerOrgName,
        handoffStatus: HandoffStatus.accepted,
        status: CaseStatus.inProgress,
        latestUpdate: 'Handoff accepted. New owner: ${existing.proposedOwnerOrgName}.',
        version: existing.version + 1,
        updatedAt: now,
        clearProposed: true,
      );
      _addEvent(
        caseId: caseId,
        type: CaseEventType.handoffAccepted,
        actorId: actorId,
        actorName: actorName,
        summary: 'Handoff accepted. Ownership transferred to ${existing.proposedOwnerOrgName}.',
      );
    } else {
      updated = existing.copyWith(
        handoffStatus: HandoffStatus.rejected,
        status: CaseStatus.inProgress,
        latestUpdate: 'Handoff rejected. Ownership remains with ${existing.ownerOrgName}.',
        version: existing.version + 1,
        updatedAt: now,
        clearProposed: true,
      );
      _addEvent(
        caseId: caseId,
        type: CaseEventType.handoffRejected,
        actorId: actorId,
        actorName: actorName,
        summary: 'Handoff rejected.'
            '${reason != null && reason.isNotEmpty ? ' Reason: $reason' : ''}',
      );
    }
    _cases[caseId] = updated;
    _emitCases();
    return CommandResult.ok(entityId: caseId, newVersion: updated.version);
  }

  @override
  Future<CommandResult> createWorkOrder({
    required String commandId,
    required String caseId,
    required int expectedVersion,
    required String workerId,
    required String workerName,
    required String title,
    required String description,
    String? incidentId,
    String? assetCode,
  }) async {
    await _latency();
    if (_isDuplicate(commandId)) return CommandResult.ok(entityId: 'idempotent');
    final existing = _cases[caseId];
    if (existing == null) return CommandResult.failed('Case not found');
    if (existing.version != expectedVersion) return CommandResult.versionConflict();
    _markCommand(commandId);

    final now = DateTime.now();
    final id = _nextId('wo');
    final wo = WorkOrder(
      id: id,
      caseId: caseId,
      incidentId: incidentId,
      workerId: workerId,
      workerName: workerName,
      title: title,
      description: description,
      assetCode: assetCode,
      status: WorkOrderStatus.assigned,
      version: 1,
      createdAt: now,
      updatedAt: now,
    );
    _workOrders[id] = wo;

    _cases[caseId] = existing.copyWith(
      status: CaseStatus.inProgress,
      latestUpdate: 'Work order created: $title',
      version: existing.version + 1,
      updatedAt: now,
    );
    _addEvent(
      caseId: caseId,
      type: CaseEventType.workOrderCreated,
      actorId: 'system',
      actorName: 'System',
      summary: 'Work order $title assigned to $workerName.',
    );
    _emitWorkOrders();
    _emitCases();
    return CommandResult.ok(entityId: id, newVersion: 1);
  }

  @override
  Future<CommandResult> updateWorkOrderStatus({
    required String commandId,
    required String workOrderId,
    required int expectedVersion,
    required WorkOrderStatus status,
    String? completionNote,
    String? actorId,
    String? actorName,
  }) async {
    await _latency();
    if (_isDuplicate(commandId)) return CommandResult.ok(entityId: workOrderId);
    final existing = _workOrders[workOrderId];
    if (existing == null) return CommandResult.failed('Work order not found');
    if (existing.version != expectedVersion) return CommandResult.versionConflict();
    _markCommand(commandId);

    final now = DateTime.now();
    final updated = existing.copyWith(
      status: status,
      completionNote: completionNote ?? existing.completionNote,
      version: existing.version + 1,
      updatedAt: now,
    );
    _workOrders[workOrderId] = updated;

    final sharedCase = _cases[existing.caseId];
    if (sharedCase != null) {
      CaseStatus? caseStatus;
      String? latest;
      if (status == WorkOrderStatus.completed || status == WorkOrderStatus.evidencePending) {
        caseStatus = CaseStatus.awaitingVerification;
        latest = 'Work completed — awaiting repair verification.';
      } else if (status == WorkOrderStatus.inProgress) {
        caseStatus = CaseStatus.inProgress;
        latest = 'Work order in progress.';
      } else if (status == WorkOrderStatus.reopened) {
        caseStatus = CaseStatus.reopened;
        latest = 'Work order reopened.';
      }
      _cases[existing.caseId] = sharedCase.copyWith(
        status: caseStatus ?? sharedCase.status,
        latestUpdate: latest ?? sharedCase.latestUpdate,
        version: sharedCase.version + 1,
        updatedAt: now,
      );
      _emitCases();
    }

    _addEvent(
      caseId: existing.caseId,
      type: CaseEventType.workOrderUpdated,
      actorId: actorId ?? existing.workerId,
      actorName: actorName ?? existing.workerName,
      summary: 'Work order status → ${status.label}'
          '${completionNote != null && completionNote.isNotEmpty ? ': $completionNote' : ''}',
    );
    _emitWorkOrders();
    return CommandResult.ok(entityId: workOrderId, newVersion: updated.version);
  }

  @override
  Future<CommandResult> finalizeEvidenceUpload({
    required String commandId,
    required String workOrderId,
    required int expectedVersion,
    String? beforeEvidenceUrl,
    String? afterEvidenceUrl,
  }) async {
    await _latency();
    if (_isDuplicate(commandId)) return CommandResult.ok(entityId: workOrderId);
    final existing = _workOrders[workOrderId];
    if (existing == null) return CommandResult.failed('Work order not found');
    if (existing.version != expectedVersion) return CommandResult.versionConflict();
    _markCommand(commandId);

    final now = DateTime.now();
    final hasBoth = (beforeEvidenceUrl ?? existing.beforeEvidenceUrl) != null &&
        (afterEvidenceUrl ?? existing.afterEvidenceUrl) != null;

    final updated = existing.copyWith(
      beforeEvidenceUrl: beforeEvidenceUrl ?? existing.beforeEvidenceUrl,
      afterEvidenceUrl: afterEvidenceUrl ?? existing.afterEvidenceUrl,
      status: hasBoth ? WorkOrderStatus.completed : WorkOrderStatus.evidencePending,
      version: existing.version + 1,
      updatedAt: now,
    );
    _workOrders[workOrderId] = updated;

    final sharedCase = _cases[existing.caseId];
    if (sharedCase != null && hasBoth) {
      _cases[existing.caseId] = sharedCase.copyWith(
        status: CaseStatus.awaitingVerification,
        latestUpdate: 'Before/after evidence uploaded — awaiting verification.',
        version: sharedCase.version + 1,
        updatedAt: now,
      );
      _emitCases();
    }

    _addEvent(
      caseId: existing.caseId,
      type: CaseEventType.evidenceUploaded,
      actorId: existing.workerId,
      actorName: existing.workerName,
      summary: hasBoth
          ? 'Before and after evidence finalized.'
          : 'Partial evidence uploaded — still pending.',
    );
    _emitWorkOrders();
    return CommandResult.ok(entityId: workOrderId, newVersion: updated.version);
  }

  @override
  Future<CommandResult> verifyRepair({
    required String commandId,
    required String caseId,
    required int expectedVersion,
    required String action,
    required String actorId,
    required String actorName,
    String? reason,
  }) async {
    await _latency();
    if (_isDuplicate(commandId)) return CommandResult.ok(entityId: caseId);
    final existing = _cases[caseId];
    if (existing == null) return CommandResult.failed('Case not found');
    if (existing.version != expectedVersion) return CommandResult.versionConflict();

    if (action == 'reopen' && (reason == null || reason.trim().isEmpty)) {
      return CommandResult.failed('A reason is required to reopen or dispute.', code: 'REASON_REQUIRED');
    }
    _markCommand(commandId);

    final now = DateTime.now();
    if (action == 'verify') {
      final updated = existing.copyWith(
        status: CaseStatus.closed,
        handoffStatus: existing.handoffStatus == HandoffStatus.proposed
            ? existing.handoffStatus
            : existing.handoffStatus,
        latestUpdate: 'Repair verified and case closed.',
        version: existing.version + 1,
        updatedAt: now,
      );
      _cases[caseId] = updated;

      for (final incId in existing.incidentIds) {
        final inc = _incidents[incId];
        if (inc != null) {
          _incidents[incId] = inc.copyWith(
            status: IncidentStatus.verified,
            version: inc.version + 1,
            updatedAt: now,
            latestUpdate: 'Repair verified.',
          );
        }
      }
      for (final wo in _workOrders.values.where((w) => w.caseId == caseId)) {
        _workOrders[wo.id] = wo.copyWith(
          status: WorkOrderStatus.verified,
          version: wo.version + 1,
          updatedAt: now,
        );
      }

      _addEvent(
        caseId: caseId,
        type: CaseEventType.repairVerified,
        actorId: actorId,
        actorName: actorName,
        summary: 'Repair verified by $actorName. Case closed.',
      );
      _emitIncidents();
      _emitWorkOrders();
      _emitCases();
      return CommandResult.ok(entityId: caseId, newVersion: updated.version);
    }

    // reopen / dispute
    final updated = existing.copyWith(
      status: CaseStatus.reopened,
      disputeReason: reason,
      latestUpdate: 'Case reopened: $reason',
      version: existing.version + 1,
      updatedAt: now,
    );
    _cases[caseId] = updated;

    for (final incId in existing.incidentIds) {
      final inc = _incidents[incId];
      if (inc != null) {
        _incidents[incId] = inc.copyWith(
          status: IncidentStatus.reopened,
          version: inc.version + 1,
          updatedAt: now,
          latestUpdate: 'Reopened: $reason',
        );
      }
    }
    for (final wo in _workOrders.values.where((w) => w.caseId == caseId)) {
      if (wo.status == WorkOrderStatus.completed ||
          wo.status == WorkOrderStatus.verified ||
          wo.status == WorkOrderStatus.evidencePending) {
        _workOrders[wo.id] = wo.copyWith(
          status: WorkOrderStatus.reopened,
          version: wo.version + 1,
          updatedAt: now,
        );
      }
    }

    _addEvent(
      caseId: caseId,
      type: CaseEventType.repairReopened,
      actorId: actorId,
      actorName: actorName,
      summary: 'Repair reopened / disputed. Reason: $reason',
    );
    _emitIncidents();
    _emitWorkOrders();
    _emitCases();
    return CommandResult.ok(entityId: caseId, newVersion: updated.version);
  }

  void dispose() {
    _incidentsController.close();
    _casesController.close();
    _workOrdersController.close();
    for (final c in _caseControllers.values) {
      c.close();
    }
    for (final c in _eventControllers.values) {
      c.close();
    }
    for (final c in _woControllers.values) {
      c.close();
    }
  }
}
