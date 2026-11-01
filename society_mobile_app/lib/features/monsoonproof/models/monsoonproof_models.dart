import 'monsoonproof_enums.dart';

class SharedAsset {
  final String id;
  final String code;
  final String name;
  final String description;
  final List<String> societyIds;

  const SharedAsset({
    required this.id,
    required this.code,
    required this.name,
    required this.description,
    required this.societyIds,
  });

  SharedAsset copyWith({
    String? id,
    String? code,
    String? name,
    String? description,
    List<String>? societyIds,
  }) {
    return SharedAsset(
      id: id ?? this.id,
      code: code ?? this.code,
      name: name ?? this.name,
      description: description ?? this.description,
      societyIds: societyIds ?? this.societyIds,
    );
  }
}

class DemoSociety {
  final String id;
  final String name;
  final String shortName;

  const DemoSociety({
    required this.id,
    required this.name,
    required this.shortName,
  });
}

class Incident {
  final String id;
  final String reporterId;
  final String reporterName;
  final String societyId;
  final String societyName;
  final String building;
  final String floor;
  final String unit;
  final IncidentCategory category;
  final String description;
  final String? photoUrl;
  final String? sharedAssetId;
  final String? sharedCaseId;
  final IncidentStatus status;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? latestUpdate;

  const Incident({
    required this.id,
    required this.reporterId,
    required this.reporterName,
    required this.societyId,
    required this.societyName,
    required this.building,
    required this.floor,
    required this.unit,
    required this.category,
    required this.description,
    this.photoUrl,
    this.sharedAssetId,
    this.sharedCaseId,
    required this.status,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.latestUpdate,
  });

  Incident copyWith({
    String? id,
    String? reporterId,
    String? reporterName,
    String? societyId,
    String? societyName,
    String? building,
    String? floor,
    String? unit,
    IncidentCategory? category,
    String? description,
    String? photoUrl,
    String? sharedAssetId,
    String? sharedCaseId,
    IncidentStatus? status,
    int? version,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? latestUpdate,
    bool clearSharedCaseId = false,
  }) {
    return Incident(
      id: id ?? this.id,
      reporterId: reporterId ?? this.reporterId,
      reporterName: reporterName ?? this.reporterName,
      societyId: societyId ?? this.societyId,
      societyName: societyName ?? this.societyName,
      building: building ?? this.building,
      floor: floor ?? this.floor,
      unit: unit ?? this.unit,
      category: category ?? this.category,
      description: description ?? this.description,
      photoUrl: photoUrl ?? this.photoUrl,
      sharedAssetId: sharedAssetId ?? this.sharedAssetId,
      sharedCaseId: clearSharedCaseId ? null : (sharedCaseId ?? this.sharedCaseId),
      status: status ?? this.status,
      version: version ?? this.version,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      latestUpdate: latestUpdate ?? this.latestUpdate,
    );
  }
}

class SharedCase {
  final String id;
  final String title;
  final String? sharedAssetId;
  final List<String> incidentIds;
  final String ownerOrgId;
  final String ownerOrgName;
  final String? proposedOwnerOrgId;
  final String? proposedOwnerOrgName;
  final CaseStatus status;
  final HandoffStatus handoffStatus;
  final String? latestUpdate;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? disputeReason;

  const SharedCase({
    required this.id,
    required this.title,
    this.sharedAssetId,
    required this.incidentIds,
    required this.ownerOrgId,
    required this.ownerOrgName,
    this.proposedOwnerOrgId,
    this.proposedOwnerOrgName,
    required this.status,
    required this.handoffStatus,
    this.latestUpdate,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.disputeReason,
  });

  SharedCase copyWith({
    String? id,
    String? title,
    String? sharedAssetId,
    List<String>? incidentIds,
    String? ownerOrgId,
    String? ownerOrgName,
    String? proposedOwnerOrgId,
    String? proposedOwnerOrgName,
    CaseStatus? status,
    HandoffStatus? handoffStatus,
    String? latestUpdate,
    int? version,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? disputeReason,
    bool clearProposed = false,
  }) {
    return SharedCase(
      id: id ?? this.id,
      title: title ?? this.title,
      sharedAssetId: sharedAssetId ?? this.sharedAssetId,
      incidentIds: incidentIds ?? this.incidentIds,
      ownerOrgId: ownerOrgId ?? this.ownerOrgId,
      ownerOrgName: ownerOrgName ?? this.ownerOrgName,
      proposedOwnerOrgId: clearProposed ? null : (proposedOwnerOrgId ?? this.proposedOwnerOrgId),
      proposedOwnerOrgName: clearProposed ? null : (proposedOwnerOrgName ?? this.proposedOwnerOrgName),
      status: status ?? this.status,
      handoffStatus: handoffStatus ?? this.handoffStatus,
      latestUpdate: latestUpdate ?? this.latestUpdate,
      version: version ?? this.version,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      disputeReason: disputeReason ?? this.disputeReason,
    );
  }
}

class CaseEvent {
  final String id;
  final String caseId;
  final CaseEventType type;
  final String actorId;
  final String actorName;
  final String summary;
  final DateTime createdAt;
  final Map<String, dynamic>? meta;

  const CaseEvent({
    required this.id,
    required this.caseId,
    required this.type,
    required this.actorId,
    required this.actorName,
    required this.summary,
    required this.createdAt,
    this.meta,
  });
}

class WorkOrder {
  final String id;
  final String caseId;
  final String? incidentId;
  final String workerId;
  final String workerName;
  final String title;
  final String description;
  final String? assetCode;
  final WorkOrderStatus status;
  final String? completionNote;
  final String? beforeEvidenceUrl;
  final String? afterEvidenceUrl;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;

  const WorkOrder({
    required this.id,
    required this.caseId,
    this.incidentId,
    required this.workerId,
    required this.workerName,
    required this.title,
    required this.description,
    this.assetCode,
    required this.status,
    this.completionNote,
    this.beforeEvidenceUrl,
    this.afterEvidenceUrl,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
  });

  WorkOrder copyWith({
    String? id,
    String? caseId,
    String? incidentId,
    String? workerId,
    String? workerName,
    String? title,
    String? description,
    String? assetCode,
    WorkOrderStatus? status,
    String? completionNote,
    String? beforeEvidenceUrl,
    String? afterEvidenceUrl,
    int? version,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return WorkOrder(
      id: id ?? this.id,
      caseId: caseId ?? this.caseId,
      incidentId: incidentId ?? this.incidentId,
      workerId: workerId ?? this.workerId,
      workerName: workerName ?? this.workerName,
      title: title ?? this.title,
      description: description ?? this.description,
      assetCode: assetCode ?? this.assetCode,
      status: status ?? this.status,
      completionNote: completionNote ?? this.completionNote,
      beforeEvidenceUrl: beforeEvidenceUrl ?? this.beforeEvidenceUrl,
      afterEvidenceUrl: afterEvidenceUrl ?? this.afterEvidenceUrl,
      version: version ?? this.version,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class CommandResult {
  final bool success;
  final String? entityId;
  final int? newVersion;
  final String? errorCode;
  final String? errorMessage;

  const CommandResult({
    required this.success,
    this.entityId,
    this.newVersion,
    this.errorCode,
    this.errorMessage,
  });

  factory CommandResult.ok({String? entityId, int? newVersion}) => CommandResult(
        success: true,
        entityId: entityId,
        newVersion: newVersion,
      );

  factory CommandResult.versionConflict() => const CommandResult(
        success: false,
        errorCode: 'VERSION_CONFLICT',
        errorMessage: 'This record was updated elsewhere. Please refresh and try again.',
      );

  factory CommandResult.failed(String message, {String? code}) => CommandResult(
        success: false,
        errorCode: code ?? 'FAILED',
        errorMessage: message,
      );
}

class CreateIncidentRequest {
  final String commandId;
  final String reporterId;
  final String reporterName;
  final String societyId;
  final String societyName;
  final String building;
  final String floor;
  final String unit;
  final IncidentCategory category;
  final String description;
  final String? photoUrl;
  final String? sharedAssetId;

  const CreateIncidentRequest({
    required this.commandId,
    required this.reporterId,
    required this.reporterName,
    required this.societyId,
    required this.societyName,
    required this.building,
    required this.floor,
    required this.unit,
    required this.category,
    required this.description,
    this.photoUrl,
    this.sharedAssetId,
  });
}
