import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';

final workerDirectoryProvider = StreamProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return FirebaseFirestore.instance
      .collection('workers')
      .snapshots()
      .map((snapshot) => snapshot.docs.map((doc) => {'id': doc.id, ...doc.data()}).toList());
});

class WorkerDirectoryScreen extends ConsumerWidget {
  const WorkerDirectoryScreen({super.key});

  Future<void> _makePhoneCall(BuildContext context, String phoneNumber) async {
    final Uri launchUri = Uri(
      scheme: 'tel',
      path: phoneNumber,
    );
    try {
      if (await canLaunchUrl(launchUri)) {
        await launchUrl(launchUri);
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not launch phone dialer')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error launching dialer')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workersAsync = ref.watch(workerDirectoryProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Worker Directory'),
      ),
      body: workersAsync.when(
        loading: () => Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
        data: (workers) {
          if (workers.isEmpty) {
            return Center(
              child: Text('No workers found in the directory.'),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: workers.length,
            itemBuilder: (context, index) {
              final worker = workers[index];
              final category = worker['category'] as String? ?? 'General Worker';
              final phone = worker['phone'] as String? ?? 'N/A';
              final name = worker['name'] as String? ?? '${category.toUpperCase()} Pro';

              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 32,
                        backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.1),
                        child: Icon(
                          category == 'electrical'
                              ? Icons.electrical_services
                              : category == 'plumbing'
                                  ? Icons.plumbing
                                  : category == 'ironing'
                                      ? Icons.iron
                                      : Icons.cleaning_services,
                          size: 32,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              category.toUpperCase(),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                                letterSpacing: 1.1,
                              ),
                            ),
                            SizedBox(height: 8),
                            Text(
                              phone,
                              style: TextStyle(
                                fontSize: 14,
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => _makePhoneCall(context, phone),
                        icon: Icon(Icons.call),
                        color: Colors.green,
                        iconSize: 28,
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.green.shade50,
                          padding: const EdgeInsets.all(12),
                        ),
                        tooltip: 'Call $name',
                      ),
                    ],
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
