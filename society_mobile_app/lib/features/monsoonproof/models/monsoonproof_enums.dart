enum IncidentCategory {
  drainage,
  seepage,
  flooding,
  structuralDrainage,
  waterlogging,
  other,
}

extension IncidentCategoryX on IncidentCategory {
  String get label {
    switch (this) {
      case IncidentCategory.drainage:
        return 'Drainage';
      case IncidentCategory.seepage:
        return 'Seepage';
      case IncidentCategory.flooding:
        return 'Flooding';
      case IncidentCategory.structuralDrainage:
        return 'Structural Drainage';
      case IncidentCategory.waterlogging:
        return 'Waterlogging';
      case IncidentCategory.other:
        return 'Other';
    }
  }

  static IncidentCategory fromString(String value) {
    return IncidentCategory.values.firstWhere(
      (e) => e.name == value,
      orElse: () => IncidentCategory.other,
    );
  }
}

enum IncidentStatus {
  reported,
  linked,
  inProgress,
  awaitingVerification,
  verified,
  closed,
  reopened,
  disputed,
}

extension IncidentStatusX on IncidentStatus {
  String get label {
    switch (this) {
      case IncidentStatus.reported:
        return 'Reported';
      case IncidentStatus.linked:
        return 'Linked to case';
      case IncidentStatus.inProgress:
        return 'In progress';
      case IncidentStatus.awaitingVerification:
        return 'Awaiting verification';
      case IncidentStatus.verified:
        return 'Verified';
      case IncidentStatus.closed:
        return 'Closed';
      case IncidentStatus.reopened:
        return 'Reopened';
      case IncidentStatus.disputed:
        return 'Disputed';
    }
  }
}

enum CaseStatus {
  open,
  inProgress,
  handoffPending,
  awaitingVerification,
  closed,
  disputed,
  reopened,
}

extension CaseStatusX on CaseStatus {
  String get label {
    switch (this) {
      case CaseStatus.open:
        return 'Open';
      case CaseStatus.inProgress:
        return 'In progress';
      case CaseStatus.handoffPending:
        return 'Handoff pending';
      case CaseStatus.awaitingVerification:
        return 'Awaiting verification';
      case CaseStatus.closed:
        return 'Closed';
      case CaseStatus.disputed:
        return 'Disputed';
      case CaseStatus.reopened:
        return 'Reopened';
    }
  }
}

enum HandoffStatus {
  none,
  proposed,
  accepted,
  rejected,
}

extension HandoffStatusX on HandoffStatus {
  String get label {
    switch (this) {
      case HandoffStatus.none:
        return 'No handoff';
      case HandoffStatus.proposed:
        return 'Handoff pending';
      case HandoffStatus.accepted:
        return 'Handoff accepted';
      case HandoffStatus.rejected:
        return 'Handoff rejected';
    }
  }
}

enum WorkOrderStatus {
  assigned,
  inProgress,
  evidencePending,
  completed,
  verified,
  reopened,
}

extension WorkOrderStatusX on WorkOrderStatus {
  String get label {
    switch (this) {
      case WorkOrderStatus.assigned:
        return 'Assigned';
      case WorkOrderStatus.inProgress:
        return 'In progress';
      case WorkOrderStatus.evidencePending:
        return 'Evidence pending';
      case WorkOrderStatus.completed:
        return 'Completed';
      case WorkOrderStatus.verified:
        return 'Verified';
      case WorkOrderStatus.reopened:
        return 'Reopened';
    }
  }
}

enum CaseEventType {
  incidentCreated,
  incidentsLinked,
  handoffProposed,
  handoffAccepted,
  handoffRejected,
  workOrderCreated,
  workOrderUpdated,
  evidenceUploaded,
  repairVerified,
  repairReopened,
  noteAdded,
}
