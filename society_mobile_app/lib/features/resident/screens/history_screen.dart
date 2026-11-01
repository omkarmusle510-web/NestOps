import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../complaints/providers/complaints_provider.dart';

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  String _formatDateTime(String isoString) {
    if (isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString);
      return DateFormat('MMM dd, yyyy • hh:mm a').format(dt.toLocal());
    } catch (_) {
      return isoString;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    final flatId = authState.flatId ?? '';

    // Watch complaints stream
    final complaintsAsync = ref.watch(complaintsStreamProvider(flatId));

    return Scaffold(
      appBar: AppBar(
        title: Text('Complaint History'),
      ),
      body: complaintsAsync.when(
        data: (complaints) {
          // Filter closed complaints
          final closedComplaints = complaints.where((c) => c.status == 'closed').toList();

          if (closedComplaints.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.history_toggle_off,
                    size: 64,
                    color: theme.colorScheme.primary.withValues(alpha: 0.3),
                  ),
                  SizedBox(height: 16),
                  Text(
                    'No completed complaints yet',
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Your resolved issues will show up here.',
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(24.0),
            itemCount: closedComplaints.length,
            itemBuilder: (context, index) {
              final complaint = closedComplaints[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                child: ListTile(
                  onTap: () => context.push('/complaint-details/${complaint.id}'),
                  title: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        complaint.category.toUpperCase(),
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.lowPriorityColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'RESOLVED',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.lowPriorityColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(height: 6),
                      Text(
                        complaint.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13),
                      ),
                      SizedBox(height: 10),
                      Row(
                        children: [
                          Icon(Icons.check_circle_outline, size: 14, color: AppTheme.lowPriorityColor),
                          SizedBox(width: 6),
                          Text(
                            'Closed: ${_formatDateTime(complaint.updatedAt)}',
                            style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ],
                  ),
                  trailing: Icon(Icons.chevron_right),
                ),
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
