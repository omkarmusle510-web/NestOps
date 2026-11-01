import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../auth/providers/auth_provider.dart';
import '../models/monsoonproof_enums.dart';
import '../models/monsoonproof_models.dart';
import '../providers/monsoonproof_providers.dart';

class ReportIssueScreen extends ConsumerStatefulWidget {
  const ReportIssueScreen({super.key});

  @override
  ConsumerState<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends ConsumerState<ReportIssueScreen> {
  final _formKey = GlobalKey<FormState>();
  final _buildingController = TextEditingController();
  final _floorController = TextEditingController();
  final _unitController = TextEditingController();
  final _descriptionController = TextEditingController();

  IncidentCategory _category = IncidentCategory.drainage;
  String? _sharedAssetId;
  File? _photo;
  final _picker = ImagePicker();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final auth = ref.read(authProvider);
    final flat = auth.flatId ?? '';
    if (flat.contains('-')) {
      final parts = flat.split('-');
      _buildingController.text = parts.first;
      _unitController.text = parts.length > 1 ? parts.last : flat;
    } else {
      _unitController.text = flat;
    }
  }

  @override
  void dispose() {
    _buildingController.dispose();
    _floorController.dispose();
    _unitController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto(ImageSource source) async {
    final file = await _picker.pickImage(
      source: source,
      imageQuality: 70,
      maxWidth: 1280,
      maxHeight: 1280,
    );
    if (file != null) {
      setState(() => _photo = File(file.path));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_submitting) return;

    final auth = ref.read(authProvider);
    if (auth.userId == null || auth.societyId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Missing society profile. Use Demo access or complete invite.')),
      );
      return;
    }

    setState(() => _submitting = true);
    ref.read(mpCommandControllerProvider.notifier).reset();

    final commandId =
        ref.read(mpCommandControllerProvider.notifier).newCommandId('createIncident');

    // Mock stores a local path as photo URL — real upload would go through storage + finalize.
    final photoUrl = _photo != null ? 'mock://local/${_photo!.path}' : null;

    final result = await ref.read(mpCommandControllerProvider.notifier).createIncident(
          CreateIncidentRequest(
            commandId: commandId,
            reporterId: auth.userId!,
            reporterName: auth.name ?? 'Resident',
            societyId: auth.societyId!,
            societyName: auth.societyName ?? auth.societyId!,
            building: _buildingController.text.trim(),
            floor: _floorController.text.trim(),
            unit: _unitController.text.trim(),
            category: _category,
            description: _descriptionController.text.trim(),
            photoUrl: photoUrl,
            sharedAssetId: _sharedAssetId,
          ),
        );

    if (!mounted) return;
    setState(() => _submitting = false);

    final ui = ref.read(mpCommandControllerProvider);
    if (result.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Issue reported successfully.'),
          backgroundColor: Colors.green,
        ),
      );
      context.pop();
    } else if (ui.status == MpCommandUiStatus.networkError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ui.message ?? 'Network error'),
          action: SnackBarAction(label: 'Retry', onPressed: _submit),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ui.message ?? result.errorMessage ?? 'Could not submit'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = ref.watch(authProvider);
    final assetsAsync = ref.watch(sharedAssetsProvider(auth.societyId));

    return Scaffold(
      appBar: AppBar(title: const Text('Report Issue')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text('Category', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              DropdownButtonFormField<IncidentCategory>(
                // ignore: deprecated_member_use
                value: _category,
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                items: IncidentCategory.values
                    .map((c) => DropdownMenuItem(value: c, child: Text(c.label)))
                    .toList(),
                onChanged: _submitting
                    ? null
                    : (v) {
                        if (v != null) setState(() => _category = v);
                      },
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _buildingController,
                      enabled: !_submitting,
                      decoration: InputDecoration(
                        labelText: 'Building',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _floorController,
                      enabled: !_submitting,
                      decoration: InputDecoration(
                        labelText: 'Floor',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _unitController,
                enabled: !_submitting,
                decoration: InputDecoration(
                  labelText: 'Unit',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              Text('Shared asset (optional)', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              assetsAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text('Could not load assets: $e'),
                data: (assets) {
                  return DropdownButtonFormField<String?>(
                    // ignore: deprecated_member_use
                    value: _sharedAssetId,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('None / not sure'),
                      ),
                      ...assets.map(
                        (a) => DropdownMenuItem<String?>(
                          value: a.id,
                          child: Text('${a.code} — ${a.name}'),
                        ),
                      ),
                    ],
                    onChanged: _submitting
                        ? null
                        : (v) => setState(() => _sharedAssetId = v),
                  );
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                enabled: !_submitting,
                maxLines: 4,
                decoration: InputDecoration(
                  labelText: 'Description',
                  hintText: 'Describe the drainage / monsoon issue…',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Please describe the issue';
                  if (v.trim().length < 10) return 'Add a bit more detail (10+ characters)';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              Text('Photo (optional)', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              if (_photo != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.file(_photo!, height: 160, width: double.infinity, fit: BoxFit.cover),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _submitting ? null : () => _pickPhoto(ImageSource.camera),
                      icon: const Icon(Icons.camera_alt_outlined),
                      label: const Text('Camera'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _submitting ? null : () => _pickPhoto(ImageSource.gallery),
                      icon: const Icon(Icons.photo_outlined),
                      label: const Text('Gallery'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          valueColor: AlwaysStoppedAnimation(Colors.white),
                        ),
                      )
                    : const Text('Submit issue'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
