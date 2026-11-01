import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/services/storage_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/society_issue_provider.dart';
import '../models/society_issue_model.dart';

class SocietyIssueCreateScreen extends ConsumerStatefulWidget {
  const SocietyIssueCreateScreen({super.key});

  @override
  ConsumerState<SocietyIssueCreateScreen> createState() => _SocietyIssueCreateScreenState();
}

class _SocietyIssueCreateScreenState extends ConsumerState<SocietyIssueCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  File? _selectedImage;
  final ImagePicker _imagePicker = ImagePicker();
  bool _isSubmitting = false;

  Future<void> _pickImage(ImageSource source) async {
    final pickedFile = await _imagePicker.pickImage(source: source, imageQuality: 70, maxWidth: 1024, maxHeight: 1024);
    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final authState = ref.read(authProvider);
    final flatId = authState.flatId ?? 'Unknown';

    setState(() {
      _isSubmitting = true;
    });

    final now = DateTime.now().toIso8601String();

    String? imageUrl;
    if (_selectedImage != null) {
      try {
        final storageService = ref.read(storageServiceProvider);
        final uniqueId = DateTime.now().millisecondsSinceEpoch.toString();
        imageUrl = await storageService.uploadImage(_selectedImage!, 'society_issues', uniqueId);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Image upload failed: $e'), backgroundColor: Colors.red),
          );
        }
        setState(() {
          _isSubmitting = false;
        });
        return;
      }
    }

    final issue = SocietyIssue(
      id: '',
      title: _titleController.text.trim(),
      description: _descriptionController.text.trim(),
      status: 'reported',
      reportedBy: 'Flat $flatId',
      images: imageUrl != null ? [imageUrl] : [],
      createdAt: now,
    );

    try {
      await ref.read(societyIssueServiceProvider).submitIssue(issue);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Society issue reported successfully.'), backgroundColor: Colors.green),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to report issue: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Report Society Issue'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Have an issue regarding common areas, events, or general society rules? Report it here.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                SizedBox(height: 24),
                TextFormField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    labelText: 'Issue Title',
                    hintText: 'e.g. Broken bench in the park',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  validator: (value) => (value == null || value.trim().isEmpty) ? 'Title is required' : null,
                ),
                SizedBox(height: 20),
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    labelText: 'Description',
                    hintText: 'Provide details about the issue...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  validator: (value) => (value == null || value.trim().isEmpty) ? 'Description is required' : null,
                ),
                SizedBox(height: 24),
                Card(
                  elevation: 0,
                  color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Attach Image (Optional)',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 12),
                        if (_selectedImage != null) ...[
                          Stack(
                            alignment: Alignment.topRight,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.file(
                                  _selectedImage!,
                                  height: 200,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              IconButton(
                                icon: Icon(Icons.cancel, color: Colors.white),
                                onPressed: () => setState(() => _selectedImage = null),
                              ),
                            ],
                          ),
                          SizedBox(height: 12),
                        ],
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _pickImage(ImageSource.camera),
                                icon: Icon(Icons.camera_alt),
                                label: Text('Camera'),
                              ),
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _pickImage(ImageSource.gallery),
                                icon: Icon(Icons.photo_library),
                                label: Text('Gallery'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 48),
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text('Submit Issue'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
