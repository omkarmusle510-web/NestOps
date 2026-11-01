class HallBooking {
  final String id;
  final String flatId;
  final String eventName;
  final String date; // Start Date
  final String endDate; // End Date
  final String timeSlot;
  final int guestCount;
  final String status; // pending, approved, rejected, cancelled
  final String createdAt;
  final String updatedAt;

  HallBooking({
    required this.id,
    required this.flatId,
    required this.eventName,
    required this.date,
    required this.endDate,
    required this.timeSlot,
    required this.guestCount,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory HallBooking.fromMap(Map<String, dynamic> map, String documentId) {
    final startDate = map['date'] ?? '';
    return HallBooking(
      id: documentId,
      flatId: map['flatId'] ?? '',
      eventName: map['eventName'] ?? '',
      date: startDate,
      endDate: map['endDate'] ?? startDate, // Fallback to start date
      timeSlot: map['timeSlot'] ?? '',
      guestCount: map['guestCount']?.toInt() ?? 0,
      status: map['status'] ?? 'pending',
      createdAt: map['createdAt'] ?? '',
      updatedAt: map['updatedAt'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'flatId': flatId,
      'eventName': eventName,
      'date': date,
      'endDate': endDate,
      'timeSlot': timeSlot,
      'guestCount': guestCount,
      'status': status,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}
