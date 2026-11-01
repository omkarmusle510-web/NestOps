import '../models/monsoonproof_enums.dart';
import '../models/monsoonproof_models.dart';

/// Backend contract matching callable functions.
/// UI must never mutate ownership / handoff / work-order approval directly.
abstract class MonsoonProofApi {
  Stream<List<Incident>> watchIncidentsForReporter(String reporterId);
  Stream<List<Incident>> watchIncidentsForSociety(String societyId);
  Future<List<Incident>> listIncidentsForReporter(String reporterId);
  Future<Incident?> getIncident(String incidentId);

  Stream<SharedCase?> watchCase(String caseId);
  Future<SharedCase?> getCase(String caseId);
  Future<List<SharedCase>> listCases();
  Stream<List<CaseEvent>> watchCaseEvents(String caseId);

  Stream<List<WorkOrder>> watchWorkOrdersForWorker(String workerId);
  Stream<List<WorkOrder>> watchWorkOrdersForCase(String caseId);
  Future<WorkOrder?> getWorkOrder(String workOrderId);
  Stream<WorkOrder?> watchWorkOrder(String workOrderId);

  Future<List<SharedAsset>> listSharedAssets({String? societyId});

  Future<CommandResult> createIncident(CreateIncidentRequest request);

  Future<CommandResult> linkIncidentsToSharedCase({
    required String commandId,
    required List<String> incidentIds,
    required String sharedAssetId,
    required String ownerOrgId,
    required String ownerOrgName,
    String? title,
  });

  Future<CommandResult> proposeHandoff({
    required String commandId,
    required String caseId,
    required int expectedVersion,
    required String proposedOwnerOrgId,
    required String proposedOwnerOrgName,
    required String actorId,
    required String actorName,
    String? reason,
  });

  Future<CommandResult> decideHandoff({
    required String commandId,
    required String caseId,
    required int expectedVersion,
    required String action, // accept | reject
    required String actorId,
    required String actorName,
    String? reason,
  });

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
  });

  Future<CommandResult> updateWorkOrderStatus({
    required String commandId,
    required String workOrderId,
    required int expectedVersion,
    required WorkOrderStatus status,
    String? completionNote,
    String? actorId,
    String? actorName,
  });

  Future<CommandResult> finalizeEvidenceUpload({
    required String commandId,
    required String workOrderId,
    required int expectedVersion,
    String? beforeEvidenceUrl,
    String? afterEvidenceUrl,
  });

  Future<CommandResult> verifyRepair({
    required String commandId,
    required String caseId,
    required int expectedVersion,
    required String action, // verify | reopen
    required String actorId,
    required String actorName,
    String? reason,
  });
}
