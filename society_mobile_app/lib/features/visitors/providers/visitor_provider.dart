import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/visitor_model.dart';

// ─────────────────────────────────────
// Streams
// ─────────────────────────────────────

/// Today's visitors for a specific flat (resident view)
final visitorStreamProvider = StreamProvider.family<List<Visitor>, String?>((ref, flatId) {
  if (flatId == null || flatId.isEmpty) return const Stream.empty();

  final todayStart = DateTime.now().copyWith(hour: 0, minute: 0, second: 0, millisecond: 0);

  return FirebaseFirestore.instance
      .collection('visitors')
      .where('flatId', isEqualTo: flatId)
      .where('timestamp', isGreaterThanOrEqualTo: todayStart.toIso8601String())
      .orderBy('timestamp', descending: true)
      .snapshots()
      .map((s) => s.docs.map((d) => Visitor.fromMap(d.data(), d.id)).toList());
});

/// Today's visitors — Guard home view
final todayVisitorStreamProvider = StreamProvider<List<Visitor>>((ref) {
  final todayStart = DateTime.now().copyWith(hour: 0, minute: 0, second: 0, millisecond: 0);

  return FirebaseFirestore.instance
      .collection('visitors')
      .where('timestamp', isGreaterThanOrEqualTo: todayStart.toIso8601String())
      .orderBy('timestamp', descending: true)
      .snapshots()
      .map((s) => s.docs.map((d) => Visitor.fromMap(d.data(), d.id)).toList());
});

/// All visitors (last 100) — guard history log
final allVisitorStreamProvider = StreamProvider<List<Visitor>>((ref) {
  return FirebaseFirestore.instance
      .collection('visitors')
      .orderBy('timestamp', descending: true)
      .limit(100)
      .snapshots()
      .map((s) => s.docs.map((d) => Visitor.fromMap(d.data(), d.id)).toList());
});

// ─────────────────────────────────────
// Service
// ─────────────────────────────────────

class VisitorService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<void> addVisitor(Visitor visitor) async {
    await _db.collection('visitors').add(visitor.toMap());
  }

  Future<void> updateVisitorStatus(String visitorId, String newStatus) async {
    await _db.collection('visitors').doc(visitorId).update({
      'status': newStatus,
    });
  }

  Future<void> markVisitorExited(String visitorId) async {
    await _db.collection('visitors').doc(visitorId).update({
      'status': 'exited',
      'exitTime': DateTime.now().toIso8601String(),
    });
  }
}

final visitorServiceProvider = Provider((ref) => VisitorService());
