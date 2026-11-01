import '../models/monsoonproof_enums.dart';
import '../models/monsoonproof_models.dart';
import 'monsoonproof_api.dart';

/// Thin placeholder for Firebase callable functions.
/// Swap the provider to use this once callables are deployed.
/// Requires `cloud_functions` when wired — currently throws until configured.
class FirebaseMonsoonProofApi implements MonsoonProofApi {
  FirebaseMonsoonProofApi();

  Never _notReady() =>
      throw UnsupportedError('Firebase MonsoonProof callables are not wired yet. Use MockMonsoonProofApi.');

  @override
  Stream<List<Incident>> watchIncidentsForReporter(String reporterId) => _notReady();

  @override
  Stream<List<Incident>> watchIncidentsForSociety(String societyId) => _notReady();

  @override
  Future<List<Incident>> listIncidentsForReporter(String reporterId) => _notReady();

  @override
  Future<Incident?> getIncident(String incidentId) => _notReady();

  @override
  Stream<SharedCase?> watchCase(String caseId) => _notReady();

  @override
  Future<SharedCase?> getCase(String caseId) => _notReady();

  @override
  Future<List<SharedCase>> listCases() => _notReady();

  @override
  Stream<List<CaseEvent>> watchCaseEvents(String caseId) => _notReady();

  @override
  Stream<List<WorkOrder>> watchWorkOrdersForWorker(String workerId) => _notReady();

  @override
  Stream<List<WorkOrder>> watchWorkOrdersForCase(String caseId) => _notReady();

  @override
  Future<WorkOrder?> getWorkOrder(String workOrderId) => _notReady();

  @override
  Stream<WorkOrder?> watchWorkOrder(String workOrderId) => _notReady();

  @override
  Future<List<SharedAsset>> listSharedAssets({String? societyId}) => _notReady();

  @override
  Future<CommandResult> createIncident(CreateIncidentRequest request) => _notReady();

  @override
  Future<CommandResult> linkIncidentsToSharedCase({
    required String commandId,
    required List<String> incidentIds,
    required String sharedAssetId,
    required String ownerOrgId,
    required String ownerOrgName,
    String? title,
  }) =>
      _notReady();

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
  }) =>
      _notReady();

  @override
  Future<CommandResult> decideHandoff({
    required String commandId,
    required String caseId,
    required int expectedVersion,
    required String action,
    required String actorId,
    required String actorName,
    String? reason,
  }) =>
      _notReady();

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
  }) =>
      _notReady();

  @override
  Future<CommandResult> updateWorkOrderStatus({
    required String commandId,
    required String workOrderId,
    required int expectedVersion,
    required WorkOrderStatus status,
    String? completionNote,
    String? actorId,
    String? actorName,
  }) =>
      _notReady();

  @override
  Future<CommandResult> finalizeEvidenceUpload({
    required String commandId,
    required String workOrderId,
    required int expectedVersion,
    String? beforeEvidenceUrl,
    String? afterEvidenceUrl,
  }) =>
      _notReady();

  @override
  Future<CommandResult> verifyRepair({
    required String commandId,
    required String caseId,
    required int expectedVersion,
    required String action,
    required String actorId,
    required String actorName,
    String? reason,
  }) =>
      _notReady();
}
