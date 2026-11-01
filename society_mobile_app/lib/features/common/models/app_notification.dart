import 'package:cloud_firestore/cloud_firestore.dart';

class AppNotification {
  final String id;
  final String targetUserId;
  final String type;
  final String title;
  final String message;
  final bool read;
  final String createdAt;
  final String? complaintId;
  final String? visitorId;
  final String? bookingId;
  final String? noticeId;

  AppNotification({
    required this.id,
    required this.targetUserId,
    required this.type,
    required this.title,
    required this.message,
    required this.read,
    required this.createdAt,
    this.complaintId,
    this.visitorId,
    this.bookingId,
    this.noticeId,
  });

  factory AppNotification.fromMap(Map<String, dynamic> map, String docId) {
    return AppNotification(
      id: docId,
      targetUserId: map['targetUserId'] ?? '',
      type: map['type'] ?? 'info',
      title: map['title'] ?? '',
      message: map['message'] ?? '',
      read: map['read'] ?? false,
      createdAt: map['createdAt'] ?? '',
      complaintId: map['complaintId'],
      visitorId: map['visitorId'],
      bookingId: map['bookingId'],
      noticeId: map['noticeId'],
    );
  }
}
