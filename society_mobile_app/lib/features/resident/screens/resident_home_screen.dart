import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../monsoonproof/models/monsoonproof_enums.dart';
import '../../monsoonproof/models/monsoonproof_models.dart';
import '../../monsoonproof/providers/monsoonproof_providers.dart';
import '../../../core/providers/network_provider.dart';

class ResidentHomeScreen extends ConsumerWidget {
  const ResidentHomeScreen({super.key});

  Color _statusColor(IncidentStatus status) {
    switch (status) {
      case IncidentStatus.reported:
        return Colors.blue;
      case IncidentStatus.linked:
      case IncidentStatus.inProgress:
        return AppTheme.secondaryColor;
      case IncidentStatus.awaitingVerification:
        return AppTheme.accentColor;
      case IncidentStatus.verified:
      case IncidentStatus.closed:
        return AppTheme.lowPriorityColor;
      case IncidentStatus.reopened:
      case IncidentStatus.disputed:
        return AppTheme.emergencyColor;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    final societyName = authState.societyName ?? 'My Building';
    final flatId = authState.flatId ?? '—';
    final name = authState.name ?? 'Resident';
    final incidentsAsync = ref.watch(myIncidentsProvider);
    final networkStatus = ref.watch(networkProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('MONSOONPROOF'),
        actions: [
          if (authState.isDemo)
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
      body: Column(
        children: [
          if (networkStatus == NetworkStatus.offline)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              color: Colors.red.shade600,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.wifi_off, color: Colors.white, size: 16),
                  SizedBox(width: 8),
                  Text(
                    'You are offline. Retry when connected.',
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(myIncidentsProvider);
                await Future.delayed(const Duration(milliseconds: 400));
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            theme.colorScheme.primary,
                            theme.colorScheme.secondary,
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'My Building',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.85),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            societyName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$name · Unit $flatId',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: theme.colorScheme.primary,
                              minimumSize: const Size(180, 44),
                            ),
                            onPressed: () => context.push('/report-issue'),
                            icon: const Icon(Icons.add_circle_outline),
                            label: const Text('Report Issue'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text('My reported issues', style: theme.textTheme.titleLarge),
                    const SizedBox(height: 4),
                    Text(
                      'Status updates from shared drainage cases appear here.',
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 12),
                    incidentsAsync.when(
                      loading: () => const Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                      error: (err, _) => _ErrorCard(
                        message: 'Could not load issues. $err',
                        onRetry: () => ref.invalidate(myIncidentsProvider),
                      ),
                      data: (incidents) {
                        if (incidents.isEmpty) {
                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
                              child: Center(
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.water_drop_outlined,
                                      size: 48,
                                      color: theme.colorScheme.primary.withValues(alpha: 0.5),
                                    ),
                                    const SizedBox(height: 12),
                                    const Text(
                                      'No issues reported yet',
                                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Tap Report Issue to log drainage or monsoon damage.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }
                        return ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: incidents.length,
                          itemBuilder: (context, index) {
                            final incident = incidents[index];
                            return _IncidentCard(
                              incident: incident,
                              statusColor: _statusColor(incident.status),
                              onTap: () {
                                if (incident.sharedCaseId != null) {
                                  context.push('/shared-case/${incident.sharedCaseId}');
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('This issue is not linked to a shared case yet.'),
                                    ),
                                  );
                                }
                              },
                            );
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _IncidentCard extends StatelessWidget {
  final Incident incident;
  final Color statusColor;
  final VoidCallback onTap;

  const _IncidentCard({
    required this.incident,
    required this.statusColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final updated = DateFormat('dd MMM · hh:mm a').format(incident.updatedAt);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(
          incident.category.label,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              incident.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 6),
            Text(
              incident.latestUpdate ?? 'Updated $updated',
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.secondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            incident.status.label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: statusColor,
            ),
          ),
        ),
        isThreeLine: true,
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorCard({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
