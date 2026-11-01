class Availability {
  final String type;
  final String? customSlot;

  Availability({required this.type, this.customSlot});

  factory Availability.fromMap(Map<String, dynamic> map) {
    return Availability(
      type: map['type'] as String? ?? 'anytime_today',
      customSlot: map['customSlot'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'type': type,
      if (customSlot != null) 'customSlot': customSlot,
    };
  }
}

class TimelineEvent {
  final String action;
  final String performedBy;
  final String role;
  final String? note;
  final String timestamp;

  TimelineEvent({
    required this.action,
    required this.performedBy,
    required this.role,
    this.note,
    required this.timestamp,
  });

  factory TimelineEvent.fromMap(Map<String, dynamic> map) {
    return TimelineEvent(
      action: map['action'] as String? ?? '',
      performedBy: map['performedBy'] as String? ?? '',
      role: map['role'] as String? ?? '',
      note: map['note'] as String?,
      timestamp: map['timestamp'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'action': action,
      'performedBy': performedBy,
      'role': role,
      if (note != null) 'note': note,
      'timestamp': timestamp,
    };
  }
}

class WorkerNote {
  final String author;
  final String note;
  final String timestamp;

  WorkerNote({
    required this.author,
    required this.note,
    required this.timestamp,
  });

  factory WorkerNote.fromMap(Map<String, dynamic> map) {
    return WorkerNote(
      author: map['author'] as String? ?? '',
      note: map['note'] as String? ?? '',
      timestamp: map['timestamp'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'author': author,
      'note': note,
      'timestamp': timestamp,
    };
  }
}

class Complaint {
  final String id;
  final String flatId;
  final String category;
  final String description;
  final String urgency;
  final bool isEmergency;
  final String workerPriority;
  final String status;
  final String? assignedWorker;
  final List<String> images;
  final Availability availability;
  final List<WorkerNote> workerNotes;
  final List<TimelineEvent> timeline;
  final int reopenCount;
  final String? slaDeadline;
  final String slaStatus;
  final String createdAt;
  final String updatedAt;
  final Map<String, dynamic>? ironingDetails;
  final String? toolsResponsibility;
  final bool toolsProcured;
  final String? toolsDescription;
  final String? eta;

  Complaint({
    required this.id,
    required this.flatId,
    required this.category,
    required this.description,
    required this.urgency,
    this.isEmergency = false,
    this.workerPriority = 'medium',
    required this.status,
    this.assignedWorker,
    this.images = const [],
    required this.availability,
    this.workerNotes = const [],
    this.timeline = const [],
    this.reopenCount = 0,
    this.slaDeadline,
    this.slaStatus = 'within_sla',
    required this.createdAt,
    required this.updatedAt,
    this.ironingDetails,
    this.toolsResponsibility,
    this.toolsProcured = false,
    this.toolsDescription,
    this.eta,
  });

  factory Complaint.fromMap(Map<String, dynamic> map, String docId) {
    return Complaint(
      id: docId,
      flatId: map['flatId'] as String? ?? '',
      category: map['category'] as String? ?? '',
      description: map['description'] as String? ?? '',
      urgency: map['urgency'] as String? ?? 'low',
      isEmergency: map['isEmergency'] as bool? ?? false,
      workerPriority: map['workerPriority'] as String? ?? 'medium',
      status: map['status'] as String? ?? 'submitted',
      assignedWorker: map['assignedWorker'] as String?,
      images: List<String>.from(map['images'] ?? []),
      availability: Availability.fromMap(map['availability'] as Map<String, dynamic>? ?? {}),
      workerNotes: (map['workerNotes'] as List? ?? [])
          .map((e) => WorkerNote.fromMap(Map<String, dynamic>.from(e)))
          .toList(),
      timeline: (map['timeline'] as List? ?? [])
          .map((e) => TimelineEvent.fromMap(Map<String, dynamic>.from(e)))
          .toList(),
      reopenCount: map['reopenCount'] as int? ?? 0,
      slaDeadline: map['slaDeadline'] as String?,
      slaStatus: map['slaStatus'] as String? ?? 'within_sla',
      createdAt: map['createdAt'] as String? ?? '',
      updatedAt: map['updatedAt'] as String? ?? '',
      ironingDetails: map['ironingDetails'] != null ? Map<String, dynamic>.from(map['ironingDetails'] as Map) : null,
      toolsResponsibility: map['toolsResponsibility'] as String?,
      toolsProcured: map['toolsProcured'] as bool? ?? false,
      toolsDescription: map['toolsDescription'] as String?,
      eta: map['eta'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'flatId': flatId,
      'category': category,
      'description': description,
      'urgency': urgency,
      'isEmergency': isEmergency,
      'workerPriority': workerPriority,
      'status': status,
      if (assignedWorker != null) 'assignedWorker': assignedWorker,
      'images': images,
      'availability': availability.toMap(),
      'workerNotes': workerNotes.map((e) => e.toMap()).toList(),
      'timeline': timeline.map((e) => e.toMap()).toList(),
      'reopenCount': reopenCount,
      if (slaDeadline != null) 'slaDeadline': slaDeadline,
      'slaStatus': slaStatus,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      if (ironingDetails != null) 'ironingDetails': ironingDetails,
      if (toolsResponsibility != null) 'toolsResponsibility': toolsResponsibility,
      'toolsProcured': toolsProcured,
      if (toolsDescription != null) 'toolsDescription': toolsDescription,
      if (eta != null) 'eta': eta,
    };
  }

  Complaint copyWith({
    String? id,
    String? flatId,
    String? category,
    String? description,
    String? urgency,
    bool? isEmergency,
    String? workerPriority,
    String? status,
    String? assignedWorker,
    List<String>? images,
    Availability? availability,
    List<WorkerNote>? workerNotes,
    List<TimelineEvent>? timeline,
    int? reopenCount,
    String? slaDeadline,
    String? slaStatus,
    String? createdAt,
    String? updatedAt,
    Map<String, dynamic>? ironingDetails,
    String? toolsResponsibility,
    bool? toolsProcured,
    String? toolsDescription,
    String? eta,
  }) {
    return Complaint(
      id: id ?? this.id,
      flatId: flatId ?? this.flatId,
      category: category ?? this.category,
      description: description ?? this.description,
      urgency: urgency ?? this.urgency,
      isEmergency: isEmergency ?? this.isEmergency,
      workerPriority: workerPriority ?? this.workerPriority,
      status: status ?? this.status,
      assignedWorker: assignedWorker ?? this.assignedWorker,
      images: images ?? this.images,
      availability: availability ?? this.availability,
      workerNotes: workerNotes ?? this.workerNotes,
      timeline: timeline ?? this.timeline,
      reopenCount: reopenCount ?? this.reopenCount,
      slaDeadline: slaDeadline ?? this.slaDeadline,
      slaStatus: slaStatus ?? this.slaStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      ironingDetails: ironingDetails ?? this.ironingDetails,
      toolsResponsibility: toolsResponsibility ?? this.toolsResponsibility,
      toolsProcured: toolsProcured ?? this.toolsProcured,
      toolsDescription: toolsDescription ?? this.toolsDescription,
      eta: eta ?? this.eta,
    );
  }
}
