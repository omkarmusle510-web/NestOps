import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/worker_provider.dart';

class WorkerHistoryScreen extends ConsumerWidget {
  const WorkerHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    final category = authState.category ?? 'electrical';

    final complaintsAsync = ref.watch(workerComplaintsStreamProvider(category));

    return Scaffold(
      appBar: AppBar(
        title: Text('Task History'),
      ),
      body: complaintsAsync.when(
        loading: () => Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (complaints) {
          // Filter closed or awaiting confirmation
          final historyList = complaints.where((c) =>
              c.status == 'closed' || c.status == 'awaiting_confirmation').toList();

          if (historyList.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.history_outlined,
                    size: 64,
                    color: theme.colorScheme.primary.withValues(alpha: 0.25),
                  ),
                  SizedBox(height: 16),
                  Text(
                    'No completed tasks in history.',
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 16),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: historyList.length,
            itemBuilder: (context, index) {
              final complaint = historyList[index];
              final dateStr = DateFormat('MMM dd, hh:mm a').format(DateTime.parse(complaint.updatedAt));

              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  title: Text(
                    'Flat ${complaint.flatId} — ${complaint.category[0].toUpperCase()}${complaint.category.substring(1)}',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(height: 6),
                      Text(complaint.description, maxLines: 2, overflow: TextOverflow.ellipsis),
                      SizedBox(height: 8),
                      Text('Completed: $dateStr', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    ],
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: (complaint.status == 'closed' ? Colors.green : Colors.teal).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      complaint.status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: complaint.status == 'closed' ? Colors.green : Colors.teal,
                      ),
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
