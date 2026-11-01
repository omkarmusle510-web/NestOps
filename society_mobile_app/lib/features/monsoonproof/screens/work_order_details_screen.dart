import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/monsoonproof_enums.dart';
import '../providers/monsoonproof_providers.dart';

class WorkOrderDetailsScreen extends ConsumerStatefulWidget {
  final String workOrderId;

  const WorkOrderDetailsScreen({super.key, required this.workOrderId});

  @override
  ConsumerState<WorkOrderDetailsScreen> createState() => _WorkOrderDetailsScreenState();
}

class _WorkOrderDetailsScreenState extends ConsumerState<WorkOrderDetailsScreen> {
  final _picker = ImagePicker();
  bool _busy = false;

  Future<void> _setStatus(WorkOrderStatus status, {String? note}) async {
    final wo = ref.read(workOrderProvider(widget.workOrderId)).value;
    if (wo == null) return;
    final auth = ref.read(authProvider);
    setState(() => _busy = true);

    final result = await ref.read(mpCommandControllerProvider.notifier).updateWorkOrderStatus(
          workOrderId: wo.id,
          expectedVersion: wo.version,
          status: status,
          completionNote: note,
          actorId: auth.userId,
          actorName: auth.name,
        );

    if (!mounted) return;
    setState(() => _busy = false);
    _handleResult(result.success);
  }

  Future<String?> _pickMockUrl(ImageSource source) async {
    final file = await _picker.pickImage(source: source, imageQuality: 70, maxWidth: 1280);
    if (file == null) return null;
    return 'mock://local/${File(file.path).path}';
  }

  Future<void> _uploadEvidence({required bool before}) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Camera'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo),
              title: const Text('Gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;

    final url = await _pickMockUrl(source);
    if (url == null) return;

    final wo = ref.read(workOrderProvider(widget.workOrderId)).value;
    if (wo == null) return;

    setState(() => _busy = true);
    final result = await ref.read(mpCommandControllerProvider.notifier).finalizeEvidenceUpload(
          workOrderId: wo.id,
          expectedVersion: wo.version,
          beforeEvidenceUrl: before ? url : null,
          afterEvidenceUrl: before ? null : url,
        );
    if (!mounted) return;
    setState(() => _busy = false);
    _handleResult(result.success);
  }

  void _handleResult(bool success) {
    final ui = ref.read(mpCommandControllerProvider);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Update saved.'), backgroundColor: Colors.green),
      );
    } else if (ui.status == MpCommandUiStatus.versionConflict) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ui.message ?? 'Version conflict'),
          action: SnackBarAction(
            label: 'Refresh',
            onPressed: () => ref.invalidate(workOrderProvider(widget.workOrderId)),
          ),
        ),
      );
    } else if (ui.status == MpCommandUiStatus.networkError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ui.message ?? 'Network error')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ui.message ?? 'Failed'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final woAsync = ref.watch(workOrderProvider(widget.workOrderId));

    return woAsync.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Work order')),
        body: Center(child: Text('Error: $e')),
      ),
      data: (wo) {
        if (wo == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Work order')),
            body: const Center(child: Text('Work order not found')),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('Work order'),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => ref.invalidate(workOrderProvider(widget.workOrderId)),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(wo.title, style: theme.textTheme.headlineMedium?.copyWith(fontSize: 22)),
              const SizedBox(height: 8),
              Text(wo.status.label, style: TextStyle(
                color: AppTheme.secondaryColor,
                fontWeight: FontWeight.bold,
              )),
              const SizedBox(height: 16),
              Text('Issue / asset', style: theme.textTheme.titleMedium),
              const SizedBox(height: 6),
              Text(wo.description),
              if (wo.assetCode != null) ...[
                const SizedBox(height: 8),
                Text('Asset: ${wo.assetCode}', style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => context.push('/shared-case/${wo.caseId}'),
                child: const Text('Open shared case'),
              ),
              const SizedBox(height: 16),
              Text('Evidence', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              _EvidenceRow(
                label: 'Before',
                hasFile: wo.beforeEvidenceUrl != null,
                onAdd: _busy ? null : () => _uploadEvidence(before: true),
              ),
              _EvidenceRow(
                label: 'After',
                hasFile: wo.afterEvidenceUrl != null,
                onAdd: _busy ? null : () => _uploadEvidence(before: false),
              ),
              if (wo.completionNote != null && wo.completionNote!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text('Completion note', style: theme.textTheme.titleMedium),
                Text(wo.completionNote!),
              ],
              const SizedBox(height: 28),
              if (wo.status == WorkOrderStatus.assigned)
                ElevatedButton(
                  onPressed: _busy
                      ? null
                      : () => _setStatus(WorkOrderStatus.inProgress),
                  child: const Text('Start work (in progress)'),
                ),
              if (wo.status == WorkOrderStatus.inProgress ||
                  wo.status == WorkOrderStatus.reopened ||
                  wo.status == WorkOrderStatus.evidencePending) ...[
                ElevatedButton(
                  onPressed: _busy
                      ? null
                      : () => context.push('/work-order-complete/${wo.id}'),
                  child: const Text('Complete with note & evidence'),
                ),
              ],
              if (wo.status == WorkOrderStatus.completed)
                OutlinedButton(
                  onPressed: () => context.push('/verify-repair/${wo.caseId}'),
                  child: const Text('Go to verification'),
                ),
              if (_busy) ...[
                const SizedBox(height: 16),
                const Center(child: CircularProgressIndicator()),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _EvidenceRow extends StatelessWidget {
  final String label;
  final bool hasFile;
  final VoidCallback? onAdd;

  const _EvidenceRow({
    required this.label,
    required this.hasFile,
    this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text('$label evidence'),
        subtitle: Text(hasFile ? 'Attached (mock URL stored)' : 'Pending'),
        trailing: hasFile
            ? const Icon(Icons.check_circle, color: AppTheme.lowPriorityColor)
            : TextButton(onPressed: onAdd, child: const Text('Add')),
      ),
    );
  }
}
