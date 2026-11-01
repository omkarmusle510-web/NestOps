import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/monsoonproof_enums.dart';
import '../providers/monsoonproof_providers.dart';

class VerifyRepairScreen extends ConsumerStatefulWidget {
  final String caseId;

  const VerifyRepairScreen({super.key, required this.caseId});

  @override
  ConsumerState<VerifyRepairScreen> createState() => _VerifyRepairScreenState();
}

class _VerifyRepairScreenState extends ConsumerState<VerifyRepairScreen> {
  final _reasonController = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _run(String action) async {
    if (action == 'reopen' && _reasonController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('A reason is required to reopen or dispute.')),
      );
      return;
    }

    final caseAsync = ref.read(sharedCaseProvider(widget.caseId));
    final sharedCase = caseAsync.valueOrNull;
    if (sharedCase == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Case not loaded. Pull to refresh.')),
      );
      return;
    }

    final auth = ref.read(authProvider);
    setState(() => _busy = true);

    final result = await ref.read(mpCommandControllerProvider.notifier).verifyRepair(
          caseId: widget.caseId,
          expectedVersion: sharedCase.version,
          action: action,
          actorId: auth.userId ?? 'unknown',
          actorName: auth.name ?? 'Resident',
          reason: action == 'reopen' ? _reasonController.text.trim() : null,
        );

    if (!mounted) return;
    setState(() => _busy = false);

    final ui = ref.read(mpCommandControllerProvider);
    if (result.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(action == 'verify' ? 'Repair verified.' : 'Case reopened.'),
          backgroundColor: Colors.green,
        ),
      );
      context.pop();
    } else if (ui.status == MpCommandUiStatus.versionConflict) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ui.message ?? 'Stale version'),
          action: SnackBarAction(
            label: 'Refresh',
            onPressed: () => ref.invalidate(sharedCaseProvider(widget.caseId)),
          ),
        ),
      );
    } else if (ui.status == MpCommandUiStatus.networkError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ui.message ?? 'Network error'),
          action: SnackBarAction(label: 'Retry', onPressed: () => _run(action)),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ui.message ?? result.errorMessage ?? 'Failed'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final caseAsync = ref.watch(sharedCaseProvider(widget.caseId));
    final workOrdersAsync = ref.watch(caseWorkOrdersProvider(widget.caseId));

    return Scaffold(
      appBar: AppBar(title: const Text('Verify repair')),
      body: caseAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Error: $e'),
              OutlinedButton(
                onPressed: () => ref.invalidate(sharedCaseProvider(widget.caseId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (sharedCase) {
          if (sharedCase == null) {
            return const Center(child: Text('Case not found'));
          }

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(sharedCase.title, style: theme.textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                'Status: ${sharedCase.status.label}',
                style: TextStyle(
                  color: sharedCase.status == CaseStatus.awaitingVerification
                      ? AppTheme.accentColor
                      : theme.colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              Text('Completion evidence', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              workOrdersAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text('Could not load work orders: $e'),
                data: (orders) {
                  if (orders.isEmpty) {
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(
                          sharedCase.latestUpdate ??
                              'No work orders on this case yet.',
                        ),
                      ),
                    );
                  }
                  return Column(
                    children: orders.map((wo) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(wo.title),
                          subtitle: Text(
                            'Before: ${wo.beforeEvidenceUrl != null ? 'attached' : 'pending'} · '
                            'After: ${wo.afterEvidenceUrl != null ? 'attached' : 'pending'}\n'
                            '${wo.completionNote ?? ''}',
                          ),
                          isThreeLine: true,
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _busy ? null : () => _run('verify'),
                child: _busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          valueColor: AlwaysStoppedAnimation(Colors.white),
                        ),
                      )
                    : const Text('Verify repair'),
              ),
              const SizedBox(height: 24),
              Text('Reopen / dispute', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(
                'A reason is mandatory. Ownership and audit are updated only after the backend confirms.',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _reasonController,
                enabled: !_busy,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Reason',
                  hintText: 'Why is the repair incomplete or disputed?',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _busy ? null : () => _run('reopen'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.emergencyColor,
                  side: const BorderSide(color: AppTheme.emergencyColor),
                  minimumSize: const Size(double.infinity, 48),
                ),
                child: const Text('Reopen with reason'),
              ),
            ],
          );
        },
      ),
    );
  }
}
