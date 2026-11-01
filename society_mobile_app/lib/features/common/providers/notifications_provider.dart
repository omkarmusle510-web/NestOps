import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/app_notification.dart';
import '../../auth/providers/auth_provider.dart';

final notificationsProvider = StreamProvider<List<AppNotification>>((ref) {
  final authState = ref.watch(authProvider);
  if (authState.flatId == null || authState.role != 'resident') {
    return Stream.value([]);
  }

  final targetUserId = 'resident_${authState.flatId}';

  return FirebaseFirestore.instance
      .collection('notifications')
      .where('targetUserId', isEqualTo: targetUserId)
      .orderBy('createdAt', descending: true)
      .snapshots()
      .map((snapshot) => snapshot.docs
          .map((doc) => AppNotification.fromMap(doc.data(), doc.id))
          .toList());
});

class NotificationActions {
  static Future<void> markAsRead(String id) async {
    await FirebaseFirestore.instance.collection('notifications').doc(id).update({
      'read': true,
    });
  }

  static Future<void> markAllAsRead(String flatId) async {
    final targetUserId = 'resident_$flatId';
    final snapshot = await FirebaseFirestore.instance
        .collection('notifications')
        .where('targetUserId', isEqualTo: targetUserId)
        .where('read', isEqualTo: false)
        .get();

    final batch = FirebaseFirestore.instance.batch();
    for (var doc in snapshot.docs) {
      batch.update(doc.reference, {'read': true});
    }
    await batch.commit();
  }
}
