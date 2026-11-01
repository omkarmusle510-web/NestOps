class SocietyIssueUpdate {
  final String message;
  final String updatedBy;
  final String timestamp;

  SocietyIssueUpdate({
    required this.message,
    required this.updatedBy,
    required this.timestamp,
  });

  factory SocietyIssueUpdate.fromMap(Map<String, dynamic> map) {
    return SocietyIssueUpdate(
      message: map['message'] as String? ?? '',
      updatedBy: map['updatedBy'] as String? ?? '',
      timestamp: map['timestamp'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'message': message,
      'updatedBy': updatedBy,
      'timestamp': timestamp,
    };
  }
}

class SocietyIssue {
  final String id;
  final String title;
  final String description;
  final String status;
  final String reportedBy;
  final List<SocietyIssueUpdate> updates;
  final List<String> images;
  final String createdAt;

  SocietyIssue({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.reportedBy,
    this.updates = const [],
    this.images = const [],
    required this.createdAt,
  });

  factory SocietyIssue.fromMap(Map<String, dynamic> map, String docId) {
    return SocietyIssue(
      id: docId,
      title: map['title'] as String? ?? '',
      description: map['description'] as String? ?? '',
      status: map['status'] as String? ?? 'reported',
      reportedBy: map['reportedBy'] as String? ?? '',
      updates: (map['updates'] as List? ?? [])
          .map((e) => SocietyIssueUpdate.fromMap(Map<String, dynamic>.from(e)))
          .toList(),
      images: (map['images'] as List? ?? []).map((e) => e.toString()).toList(),
      createdAt: map['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'description': description,
      'status': status,
      'reportedBy': reportedBy,
      'updates': updates.map((e) => e.toMap()).toList(),
      'images': images,
      'createdAt': createdAt,
    };
  }
}
