class Visitor {
  final String id;
  final String name;
  final String flatId;
  final String company;
  final String purpose;
  final String status; // pending, approved, denied, exited
  final DateTime timestamp;
  final String? vehicleNumber;
  final String? visitorType;   // delivery, guest, service, other
  final String? photoUrl;
  final DateTime? exitTime;

  Visitor({
    required this.id,
    required this.name,
    required this.flatId,
    required this.company,
    required this.purpose,
    required this.status,
    required this.timestamp,
    this.vehicleNumber,
    this.visitorType,
    this.photoUrl,
    this.exitTime,
  });

  factory Visitor.fromMap(Map<String, dynamic> data, String documentId) {
    return Visitor(
      id: documentId,
      name: data['name'] ?? '',
      flatId: data['flatId'] ?? '',
      company: data['company'] ?? '',
      purpose: data['purpose'] ?? '',
      status: data['status'] ?? 'pending',
      timestamp: data['timestamp'] != null ? DateTime.parse(data['timestamp']) : DateTime.now(),
      vehicleNumber: data['vehicleNumber'] as String?,
      visitorType: data['visitorType'] as String?,
      photoUrl: data['photoUrl'] as String?,
      exitTime: data['exitTime'] != null ? DateTime.parse(data['exitTime'] as String) : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'flatId': flatId,
      'company': company,
      'purpose': purpose,
      'status': status,
      'timestamp': timestamp.toIso8601String(),
      if (vehicleNumber != null && vehicleNumber!.isNotEmpty) 'vehicleNumber': vehicleNumber,
      if (visitorType != null) 'visitorType': visitorType,
      if (photoUrl != null && photoUrl!.isNotEmpty) 'photoUrl': photoUrl,
      if (exitTime != null) 'exitTime': exitTime!.toIso8601String(),
    };
  }

  bool get isToday {
    final now = DateTime.now();
    return timestamp.year == now.year &&
        timestamp.month == now.month &&
        timestamp.day == now.day;
  }

  String get durationString {
    if (exitTime != null) {
      final dur = exitTime!.difference(timestamp);
      final h = dur.inHours;
      final m = dur.inMinutes.remainder(60);
      if (h > 0) return '${h}h ${m}m inside';
      return '${m}m inside';
    }
    if (status == 'approved') {
      final dur = DateTime.now().difference(timestamp);
      final h = dur.inHours;
      final m = dur.inMinutes.remainder(60);
      if (h > 0) return '${h}h ${m}m inside';
      return '${m}m inside';
    }
    return '';
  }
}
