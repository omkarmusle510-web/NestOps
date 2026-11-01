import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class WorkerNotificationsScreen extends ConsumerWidget {
  const WorkerNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Static mock notifications for worker
    final mockNotifications = [
      {
        'title': 'New Emergency Alert',
        'message': 'Plumbing emergency reported at Flat 2201: Major indoor leakage.',
        'time': DateTime.now().subtract(const Duration(minutes: 10)).toIso8601String(),
        'isEmergency': true,
      },
      {
        'title': 'Complaint Reopened',
        'message': 'Resident at Flat 1302 reopened complaint: Sparking returned.',
        'time': DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(),
        'isEmergency': false,
      },
      {
        'title': 'Resolution Confirmed',
        'message': 'Resident confirmed completion of electrical issue at Flat 2402.',
        'time': DateTime.now().subtract(const Duration(hours: 5)).toIso8601String(),
        'isEmergency': false,
      }
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications'),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: mockNotifications.length,
        itemBuilder: (context, index) {
          final notif = mockNotifications[index];
          final timeStr = DateFormat('hh:mm a').format(DateTime.parse(notif['time'] as String));
          final isEmergency = notif['isEmergency'] as bool? ?? false;

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            color: isEmergency ? Colors.red.shade50 : null,
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: CircleAvatar(
                backgroundColor: isEmergency ? Colors.red.shade100 : Colors.blue.shade100,
                child: Icon(
                  isEmergency ? Icons.warning : Icons.notifications_none,
                  color: isEmergency ? Colors.red : Colors.blue,
                ),
              ),
              title: Text(
                notif['title'] as String,
                style: TextStyle(fontWeight: FontWeight.bold, color: isEmergency ? Colors.red.shade900 : null),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: 6),
                  Text(notif['message'] as String),
                  SizedBox(height: 8),
                  Text(timeStr, style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
