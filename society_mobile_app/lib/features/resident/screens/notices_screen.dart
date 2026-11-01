import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../notices/providers/notice_provider.dart';
import '../../notices/models/notice_model.dart';

class NoticesScreen extends ConsumerWidget {
  const NoticesScreen({super.key});

  String _formatDateTime(String isoString) {
    if (isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString);
      return DateFormat('MMM dd, yyyy • hh:mm a').format(dt.toLocal());
    } catch (_) {
      return isoString;
    }
  }

  void _showSimulateNoticeDialog(BuildContext context, WidgetRef ref) {
    final titleController = TextEditingController(text: 'Water Supply Resumed');
    final contentController = TextEditingController(
        text: 'The secondary water tank maintenance has been completed. Water supply is now restored.');
    String selectedTopic = 'Maintenance';

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text('Simulate Admin Notice'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<String>(
                      initialValue: selectedTopic,
                      decoration: const InputDecoration(labelText: 'Topic'),
                      items: ['General', 'Maintenance', 'Events', 'Security', 'Billing']
                          .map((topic) => DropdownMenuItem(
                                value: topic,
                                child: Text(topic),
                              ))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => selectedTopic = val);
                      },
                    ),
                    SizedBox(height: 12),
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(labelText: 'Title'),
                    ),
                    SizedBox(height: 12),
                    TextField(
                      controller: contentController,
                      decoration: const InputDecoration(labelText: 'Content'),
                      maxLines: 3,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final newNotice = Notice(
                      id: 'sim_${DateTime.now().millisecondsSinceEpoch}',
                      title: titleController.text,
                      topic: selectedTopic,
                      content: contentController.text,
                      author: 'Admin Team',
                      createdAt: DateTime.now().toIso8601String(),
                    );
                    ref.read(noticeServiceProvider).mockAddNotice(newNotice);
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Simulated notice added successfully!')),
                    );
                  },
                  child: Text('Simulate'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final noticesAsync = ref.watch(noticesStreamProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Official Notices'),
        actions: ref.read(noticeServiceProvider).isSimulation
            ? [
                IconButton(
                  icon: Icon(Icons.add_alert_outlined),
                  tooltip: 'Simulate Admin Notice',
                  onPressed: () => _showSimulateNoticeDialog(context, ref),
                )
              ]
            : null,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(noticesStreamProvider);
          await Future.delayed(const Duration(milliseconds: 600));
        },
        child: noticesAsync.when(
          data: (notices) {
            if (notices.isEmpty) {
              return SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Container(
                  height: MediaQuery.of(context).size.height - 200,
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.campaign_outlined,
                        size: 64,
                        color: theme.colorScheme.primary.withValues(alpha: 0.3),
                      ),
                      SizedBox(height: 16),
                      Text(
                        'No notices published yet',
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }
  
            return ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24.0),
              itemCount: notices.length,
              itemBuilder: (context, index) {
              final notice = notices[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 20),
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade100,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              notice.topic.toUpperCase(),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue.shade800,
                              ),
                            ),
                          ),
                          Text(
                            _formatDateTime(notice.createdAt),
                            style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                      SizedBox(height: 16),
                      Text(
                        notice.title,
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 12),
                      Text(
                        notice.content,
                        style: theme.textTheme.bodyLarge?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant, height: 1.5),
                      ),
                      SizedBox(height: 16),
                      const Divider(),
                      SizedBox(height: 8),
                      Text(
                        'Published by ${notice.author}',
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
        loading: () => Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
     ),
    );
  }
}
