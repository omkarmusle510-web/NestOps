import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/monsoonproof_api.dart';
import '../data/mock_monsoonproof_api.dart';
import '../models/monsoonproof_enums.dart';
import '../models/monsoonproof_models.dart';

/// Default: in-memory mock. Swap to FirebaseMonsoonProofApi when callables are ready.
final monsoonProofApiProvider = Provider<MonsoonProofApi>((ref) {
  final api = MockMonsoonProofApi();
  ref.onDispose(() => api.dispose());
  return api;
});

final myIncidentsProvider = StreamProvider<List<Incident>>((ref) {
  final auth = ref.watch(authProvider);
  final userId = auth.userId;
  if (userId == null) return Stream.value(const []);
  return ref.watch(monsoonProofApiProvider).watchIncidentsForReporter(userId);
});

final societyIncidentsProvider = StreamProvider<List<Incident>>((ref) {
  final auth = ref.watch(authProvider);
  final societyId = auth.societyId;
  if (societyId == null) return Stream.value(const []);
  return ref.watch(monsoonProofApiProvider).watchIncidentsForSociety(societyId);
});

final sharedCaseProvider = StreamProvider.family<SharedCase?, String>((ref, caseId) {
  return ref.watch(monsoonProofApiProvider).watchCase(caseId);
});

final caseEventsProvider = StreamProvider.family<List<CaseEvent>, String>((ref, caseId) {
  return ref.watch(monsoonProofApiProvider).watchCaseEvents(caseId);
});

final workerWorkOrdersProvider = StreamProvider<List<WorkOrder>>((ref) {
  final auth = ref.watch(authProvider);
  final userId = auth.userId;
  if (userId == null) return Stream.value(const []);
  return ref.watch(monsoonProofApiProvider).watchWorkOrdersForWorker(userId);
});

final caseWorkOrdersProvider = StreamProvider.family<List<WorkOrder>, String>((ref, caseId) {
  return ref.watch(monsoonProofApiProvider).watchWorkOrdersForCase(caseId);
});

final workOrderProvider = StreamProvider.family<WorkOrder?, String>((ref, workOrderId) {
  return ref.watch(monsoonProofApiProvider).watchWorkOrder(workOrderId);
});

final sharedAssetsProvider = FutureProvider.family<List<SharedAsset>, String?>((ref, societyId) {
  return ref.watch(monsoonProofApiProvider).listSharedAssets(societyId: societyId);
});

enum MpCommandUiStatus { idle, submitting, success, versionConflict, networkError, validationError, failed }

class MpCommandUiState {
  final MpCommandUiStatus status;
  final String? message;
  final String? entityId;

  const MpCommandUiState({
    this.status = MpCommandUiStatus.idle,
    this.message,
    this.entityId,
  });

  MpCommandUiState copyWith({
    MpCommandUiStatus? status,
    String? message,
    String? entityId,
  }) {
    return MpCommandUiState(
      status: status ?? this.status,
      message: message,
      entityId: entityId ?? this.entityId,
    );
  }
}

class MpCommandController extends Notifier<MpCommandUiState> {
  @override
  MpCommandUiState build() => const MpCommandUiState();

  void reset() => state = const MpCommandUiState();

  String newCommandId(String prefix) =>
      '${prefix}_${DateTime.now().microsecondsSinceEpoch}';

  Future<CommandResult> _run(Future<CommandResult> Function() action) async {
    state = const MpCommandUiState(status: MpCommandUiStatus.submitting);
    try {
      final result = await action();
      if (result.success) {
        state = MpCommandUiState(
          status: MpCommandUiStatus.success,
          message: 'Saved',
          entityId: result.entityId,
        );
      } else if (result.errorCode == 'VERSION_CONFLICT') {
        state = MpCommandUiState(
          status: MpCommandUiStatus.versionConflict,
          message: result.errorMessage,
        );
      } else if (result.errorCode == 'REASON_REQUIRED') {
        state = MpCommandUiState(
          status: MpCommandUiStatus.validationError,
          message: result.errorMessage,
        );
      } else {
        state = MpCommandUiState(
          status: MpCommandUiStatus.failed,
          message: result.errorMessage ?? 'Request failed',
        );
      }
      return result;
    } catch (e) {
      state = MpCommandUiState(
        status: MpCommandUiStatus.networkError,
        message: 'Network error. Check connection and retry.',
      );
      return CommandResult.failed(e.toString(), code: 'NETWORK');
    }
  }

  Future<CommandResult> createIncident(CreateIncidentRequest request) {
    return _run(() => ref.read(monsoonProofApiProvider).createIncident(request));
  }

  Future<CommandResult> proposeHandoff({
    required String caseId,
    required int expectedVersion,
    required String proposedOwnerOrgId,
    required String proposedOwnerOrgName,
    required String actorId,
    required String actorName,
    String? reason,
  }) {
    return _run(
      () => ref.read(monsoonProofApiProvider).proposeHandoff(
            commandId: newCommandId('proposeHandoff'),
            caseId: caseId,
            expectedVersion: expectedVersion,
            proposedOwnerOrgId: proposedOwnerOrgId,
            proposedOwnerOrgName: proposedOwnerOrgName,
            actorId: actorId,
            actorName: actorName,
            reason: reason,
          ),
    );
  }

  Future<CommandResult> decideHandoff({
    required String caseId,
    required int expectedVersion,
    required String action,
    required String actorId,
    required String actorName,
    String? reason,
  }) {
    return _run(
      () => ref.read(monsoonProofApiProvider).decideHandoff(
            commandId: newCommandId('decideHandoff'),
            caseId: caseId,
            expectedVersion: expectedVersion,
            action: action,
            actorId: actorId,
            actorName: actorName,
            reason: reason,
          ),
    );
  }

  Future<CommandResult> updateWorkOrderStatus({
    required String workOrderId,
    required int expectedVersion,
    required WorkOrderStatus status,
    String? completionNote,
    String? actorId,
    String? actorName,
  }) {
    return _run(
      () => ref.read(monsoonProofApiProvider).updateWorkOrderStatus(
            commandId: newCommandId('updateWo'),
            workOrderId: workOrderId,
            expectedVersion: expectedVersion,
            status: status,
            completionNote: completionNote,
            actorId: actorId,
            actorName: actorName,
          ),
    );
  }

  Future<CommandResult> finalizeEvidenceUpload({
    required String workOrderId,
    required int expectedVersion,
    String? beforeEvidenceUrl,
    String? afterEvidenceUrl,
  }) {
    return _run(
      () => ref.read(monsoonProofApiProvider).finalizeEvidenceUpload(
            commandId: newCommandId('evidence'),
            workOrderId: workOrderId,
            expectedVersion: expectedVersion,
            beforeEvidenceUrl: beforeEvidenceUrl,
            afterEvidenceUrl: afterEvidenceUrl,
          ),
    );
  }

  Future<CommandResult> verifyRepair({
    required String caseId,
    required int expectedVersion,
    required String action,
    required String actorId,
    required String actorName,
    String? reason,
  }) {
    return _run(
      () => ref.read(monsoonProofApiProvider).verifyRepair(
            commandId: newCommandId('verify'),
            caseId: caseId,
            expectedVersion: expectedVersion,
            action: action,
            actorId: actorId,
            actorName: actorName,
            reason: reason,
          ),
    );
  }
}

final mpCommandControllerProvider =
    NotifierProvider<MpCommandController, MpCommandUiState>(MpCommandController.new);
