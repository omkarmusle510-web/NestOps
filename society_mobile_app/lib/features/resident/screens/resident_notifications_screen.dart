import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../common/models/app_notification.dart';
import '../../common/providers/notifications_provider.dart';

class ResidentNotificationsScreen extends ConsumerWidget {
  const ResidentNotificationsScreen({super.key});

  IconData _getNotificationIcon(String type) {
    switch (type) {
      case 'complaint_submitted':
        return Icons.assignment_outlined;
      case 'worker_update':
        return Icons.engineering;
      case 'revisit_scheduled':
        return Icons.schedule;
      case 'completion_request':
        return Icons.check_circle_outline;
      case 'resident_unavailable':
        return Icons.person_off_outlined;
      case 'complaint_reopened':
        return Icons.replay;
      case 'escalation':
      case 'sla_breach':
      case 'emergency_alert':
        return Icons.warning_amber_rounded;
      case 'visitor_approval':
        return Icons.person_pin_circle_outlined;
      case 'hall_booking':
        return Icons.event_available_outlined;
      case 'complaint_update':
        return Icons.update_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  Color _getNotificationColor(String type) {
    switch (type) {
      case 'complaint_submitted':
      case 'complaint_update':
        return Colors.blue;
      case 'worker_update':
        return Colors.purple;
      case 'revisit_scheduled':
        return AppTheme.accentColor;
      case 'completion_request':
        return AppTheme.lowPriorityColor;
      case 'resident_unavailable':
        return AppTheme.highPriorityColor;
      case 'complaint_reopened':
      case 'escalation':
      case 'sla_breach':
      case 'emergency_alert':
        return AppTheme.emergencyColor;
      case 'visitor_approval':
        return Colors.teal;
      case 'hall_booking':
        return Colors.indigo;
      default:
        return const Color(0xFF9E9E9E);
    }
  }

  String _formatTimestamp(String isoString) {
    try {
      final dt = DateTime.parse(isoString);
      final now = DateTime.now();
      final diff = now.difference(dt);

      if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}h ago';
      } else if (diff.inDays < 7) {
        return '${diff.inDays}d ago';
      } else {
        return DateFormat('MMM dd').format(dt.toLocal());
      }
    } catch (_) {
      return isoString;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    final flatId = authState.flatId ?? '';
    final notificationsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications'),
        actions: [
          IconButton(
            icon: Icon(Icons.done_all),
            tooltip: 'Mark all as read',
            onPressed: () {
              NotificationActions.markAllAsRead(flatId);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('All notifications marked as read')),
              );
            },
          ),
        ],
      ),
      body: notificationsAsync.when(
        data: (notifications) {
          if (notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_none_rounded,
                    size: 72,
                    color: theme.colorScheme.primary.withValues(alpha: 0.3),
                  ),
                  SizedBox(height: 16),
                  Text(
                    'No Notifications Yet',
                    style: theme.textTheme.titleLarge,
                  ),
                  SizedBox(height: 8),
                  Text(
                    'You\'ll see updates about your complaints and requests here.',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: notifications.length,
            separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
            itemBuilder: (context, index) {
              final notif = notifications[index];
              final color = _getNotificationColor(notif.type);

              return ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                leading: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    _getNotificationIcon(notif.type),
                    color: color,
                    size: 22,
                  ),
                ),
                title: Row(
                  children: [
                    Expanded(
                      child: Text(
                        notif.title,
                        style: TextStyle(
                          fontWeight:
                              notif.read ? FontWeight.normal : FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    if (!notif.read)
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(height: 2),
                    Text(
                      notif.message,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: const Color(0xFF9E9E9E),
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      _formatTimestamp(notif.createdAt),
                      style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      ),
                    ),
                  ],
                ),
                onTap: () {
                  if (!notif.read) {
                    NotificationActions.markAsRead(notif.id);
                  }
                  
                  if (notif.complaintId != null) {
                    context.push('/complaint-details/${notif.complaintId}');
                  } else if (notif.bookingId != null) {
                    context.push('/hall-bookings');
                  }
                },
              );
            },
          );
        },
        loading: () => Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
