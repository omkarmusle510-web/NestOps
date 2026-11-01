import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../monsoonproof/models/monsoonproof_enums.dart';
import '../../monsoonproof/models/monsoonproof_models.dart';
import '../../monsoonproof/providers/monsoonproof_providers.dart';

class WorkerHomeScreen extends ConsumerWidget {
  const WorkerHomeScreen({super.key});

  Color _statusColor(WorkOrderStatus status) {
    switch (status) {
      case WorkOrderStatus.assigned:
        return Colors.blue;
      case WorkOrderStatus.inProgress:
        return AppTheme.secondaryColor;
      case WorkOrderStatus.evidencePending:
        return AppTheme.accentColor;
      case WorkOrderStatus.completed:
        return Colors.teal;
      case WorkOrderStatus.verified:
        return AppTheme.lowPriorityColor;
      case WorkOrderStatus.reopened:
        return AppTheme.emergencyColor;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final auth = ref.watch(authProvider);
    final ordersAsync = ref.watch(workerWorkOrdersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Work orders'),
        actions: [
          if (auth.isDemo)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Chip(
                label: const Text('Demo', style: TextStyle(fontSize: 11)),
                visualDensity: VisualDensity.compact,
                backgroundColor: AppTheme.accentColor.withValues(alpha: 0.2),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(workerWorkOrdersProvider);
          await Future.delayed(const Duration(milliseconds: 400));
        },
        child: ordersAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(
            children: [
              const SizedBox(height: 120),
              Center(child: Text('Failed to load work orders: $e')),
              const SizedBox(height: 12),
              Center(
                child: OutlinedButton(
                  onPressed: () => ref.invalidate(workerWorkOrdersProvider),
                  child: const Text('Retry'),
                ),
              ),
            ],
          ),
          data: (orders) {
            final active = orders
                .where((w) => w.status != WorkOrderStatus.verified)
                .toList();

            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        auth.name ?? 'Worker',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Assigned drainage / shared-asset work',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.9)),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${active.length} open work order${active.length == 1 ? '' : 's'}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text('Assigned work', style: theme.textTheme.titleLarge),
                const SizedBox(height: 12),
                if (active.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(
                              Icons.assignment_turned_in_outlined,
                              size: 48,
                              color: theme.colorScheme.primary.withValues(alpha: 0.5),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'No open work orders',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                else
                  ...active.map((wo) => _WorkOrderCard(
                        workOrder: wo,
                        color: _statusColor(wo.status),
                        onTap: () => context.push('/work-order/${wo.id}'),
                      )),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _WorkOrderCard extends StatelessWidget {
  final WorkOrder workOrder;
  final Color color;
  final VoidCallback onTap;

  const _WorkOrderCard({
    required this.workOrder,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final updated = DateFormat('dd MMM · hh:mm a').format(workOrder.updatedAt);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        title: Text(workOrder.title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              workOrder.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 6),
            Text(
              [
                if (workOrder.assetCode != null) 'Asset ${workOrder.assetCode}',
                updated,
              ].join(' · '),
              style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.secondary),
            ),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            workOrder.status.label.toUpperCase(),
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
          ),
        ),
        isThreeLine: true,
      ),
    );
  }
}
