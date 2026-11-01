import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/demo_seed.dart';
import '../models/monsoonproof_enums.dart';
import '../providers/monsoonproof_providers.dart';

class SharedCaseDetailsScreen extends ConsumerWidget {
  final String caseId;

  const SharedCaseDetailsScreen({super.key, required this.caseId});

  Color _caseStatusColor(CaseStatus status) {
    switch (status) {
      case CaseStatus.open:
        return Colors.blue;
      case CaseStatus.inProgress:
        return AppTheme.secondaryColor;
      case CaseStatus.handoffPending:
        return AppTheme.accentColor;
      case CaseStatus.awaitingVerification:
        return Colors.deepOrange;
      case CaseStatus.closed:
        return AppTheme.lowPriorityColor;
      case CaseStatus.disputed:
      case CaseStatus.reopened:
        return AppTheme.emergencyColor;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final caseAsync = ref.watch(sharedCaseProvider(caseId));
    final eventsAsync = ref.watch(caseEventsProvider(caseId));
    final auth = ref.watch(authProvider);
    final commandUi = ref.watch(mpCommandControllerProvider);

    return caseAsync.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Shared case')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Failed to load case: $e'),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => ref.invalidate(sharedCaseProvider(caseId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      data: (sharedCase) {
        if (sharedCase == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Shared case')),
            body: const Center(child: Text('Case not found')),
          );
        }

        final asset = MonsoonProofDemoSeed.assetById(sharedCase.sharedAssetId);
        final handoffPending = sharedCase.handoffStatus == HandoffStatus.proposed;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Shared case'),
            actions: [
              if (sharedCase.status == CaseStatus.awaitingVerification ||
                  sharedCase.status == CaseStatus.closed ||
                  sharedCase.status == CaseStatus.reopened)
                TextButton(
                  onPressed: () => context.push('/verify-repair/$caseId'),
                  child: const Text('Verify'),
                ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(sharedCaseProvider(caseId));
              ref.invalidate(caseEventsProvider(caseId));
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(sharedCase.title, style: theme.textTheme.headlineMedium?.copyWith(fontSize: 22)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _StatusChip(
                      label: sharedCase.status.label,
                      color: _caseStatusColor(sharedCase.status),
                    ),
                    if (handoffPending)
                      _StatusChip(
                        label: 'Handoff pending',
                        color: AppTheme.accentColor,
                      ),
                  ],
                ),
                if (handoffPending) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.accentColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.accentColor.withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      'Handoff proposed to ${sharedCase.proposedOwnerOrgName}. '
                      'Ownership has NOT transferred — still responsible: ${sharedCase.ownerOrgName}.',
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                _InfoTile(
                  title: 'Shared asset',
                  value: asset != null ? '${asset.code} · ${asset.name}' : '—',
                ),
                _InfoTile(
                  title: 'Current responsible org',
                  value: sharedCase.ownerOrgName,
                ),
                _InfoTile(
                  title: 'Handoff status',
                  value: sharedCase.handoffStatus.label,
                ),
                _InfoTile(
                  title: 'Latest update',
                  value: sharedCase.latestUpdate ?? '—',
                ),
                _InfoTile(
                  title: 'Version',
                  value: 'v${sharedCase.version}',
                ),
                const SizedBox(height: 8),
                Text('Related reports', style: theme.textTheme.titleLarge),
                const SizedBox(height: 8),
                ...sharedCase.incidentIds.map(
                  (id) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: const Icon(Icons.report_outlined),
                      title: Text(id),
                      dense: true,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Activity history', style: theme.textTheme.titleLarge),
                const SizedBox(height: 8),
                eventsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Text('Could not load activity: $e'),
                  data: (events) {
                    if (events.isEmpty) {
                      return const Text('No activity yet.');
                    }
                    return Column(
                      children: events.map((e) {
                        final when = DateFormat('dd MMM · hh:mm a').format(e.createdAt);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(e.summary),
                            subtitle: Text('${e.actorName} · $when'),
                          ),
                        );
                      }).toList(),
                    );
                  },
                ),
                if (auth.isDemo && handoffPending) ...[
                  const SizedBox(height: 24),
                  Text(
                    'Demo: decide handoff (federation/manager)',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: commandUi.status == MpCommandUiStatus.submitting
                              ? null
                              : () async {
                                  final result = await ref
                                      .read(mpCommandControllerProvider.notifier)
                                      .decideHandoff(
                                        caseId: caseId,
                                        expectedVersion: sharedCase.version,
                                        action: 'reject',
                                        actorId: auth.userId ?? 'demo',
                                        actorName: auth.name ?? 'Demo',
                                        reason: 'Keeping ownership with society for now',
                                      );
                                  if (!context.mounted) return;
                                  _showCommandSnack(context, ref, result.success);
                                },
                          child: const Text('Reject'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: commandUi.status == MpCommandUiStatus.submitting
                              ? null
                              : () async {
                                  final result = await ref
                                      .read(mpCommandControllerProvider.notifier)
                                      .decideHandoff(
                                        caseId: caseId,
                                        expectedVersion: sharedCase.version,
                                        action: 'accept',
                                        actorId: auth.userId ?? 'demo',
                                        actorName: auth.name ?? 'Demo',
                                      );
                                  if (!context.mounted) return;
                                  _showCommandSnack(context, ref, result.success);
                                },
                          child: const Text('Accept handoff'),
                        ),
                      ),
                    ],
                  ),
                ],
                if (sharedCase.status == CaseStatus.awaitingVerification) ...[
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => context.push('/verify-repair/$caseId'),
                    child: const Text('Open repair verification'),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  void _showCommandSnack(BuildContext context, WidgetRef ref, bool success) {
    final ui = ref.read(mpCommandControllerProvider);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Handoff decision saved.'), backgroundColor: Colors.green),
      );
    } else if (ui.status == MpCommandUiStatus.versionConflict) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ui.message ?? 'Version conflict'),
          action: SnackBarAction(
            label: 'Refresh',
            onPressed: () {
              ref.invalidate(sharedCaseProvider(caseId));
            },
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ui.message ?? 'Request failed'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final Color color;

  const _StatusChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final String title;
  final String value;

  const _InfoTile({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
