import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/notice_model.dart';

class NoticeService {
  FirebaseFirestore get _db => FirebaseFirestore.instance;
  static const bool _useSimulation = false;

  bool get isSimulation => _useSimulation;

  // Mock initial notices
  static final List<Notice> _mockNotices = [
    Notice(
      id: 'notice_1',
      title: 'Water Tank Cleaning Scheduled',
      topic: 'Maintenance',
      content: 'Periodic maintenance cleaning for secondary drinking water overhead tank on Friday.',
      author: 'Admin Team',
      createdAt: DateTime.now().subtract(const Duration(days: 2)).toIso8601String(),
    )
  ];

  Stream<List<Notice>> streamNotices() {
    if (_useSimulation) {
      return Stream.periodic(const Duration(seconds: 1), (_) => _mockNotices);
    }

    try {
      return _db
          .collection('notices')
          .orderBy('createdAt', descending: true)
          .snapshots()
          .map((snapshot) {
            return snapshot.docs.map((doc) => Notice.fromMap(doc.data(), doc.id)).toList();
          });
    } catch (e) {
      debugPrint('Firestore streamNotices error: $e');
      return Stream.periodic(const Duration(seconds: 1), (_) => _mockNotices);
    }
  }

  // Method to allow mocking a new notice being added
  void mockAddNotice(Notice notice) {
    _mockNotices.insert(0, notice);
  }
}
