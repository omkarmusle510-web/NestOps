import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../notices/providers/notice_provider.dart';

class NoticeDetailsScreen extends ConsumerWidget {
  final String noticeId;

  const NoticeDetailsScreen({super.key, required this.noticeId});

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
    final noticesAsync = ref.watch(noticesStreamProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Notice Details'),
      ),
      body: noticesAsync.when(
        loading: () => Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (notices) {
          final notice = notices.firstWhere(
            (n) => n.id == noticeId,
            orElse: () => throw Exception('Notice not found'),
          );

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        notice.topic.toUpperCase(),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade800,
                        ),
                      ),
                    ),
                    Text(
                      _formatDateTime(notice.createdAt),
                      style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
                SizedBox(height: 24),
                Text(
                  notice.title,
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 20),
                Text(
                  notice.content,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant, 
                    height: 1.6,
                    fontSize: 16,
                  ),
                ),
                SizedBox(height: 32),
                const Divider(),
                SizedBox(height: 16),
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: Colors.blue.shade50,
                      child: Icon(Icons.admin_panel_settings, color: Colors.blue.shade700),
                    ),
                    SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Published by',
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12),
                        ),
                        Text(
                          notice.author,
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
