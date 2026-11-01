import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../../complaints/providers/complaints_provider.dart';

class CompletionScreen extends ConsumerStatefulWidget {
  final String complaintId;

  const CompletionScreen({super.key, required this.complaintId});

  @override
  ConsumerState<CompletionScreen> createState() => _CompletionScreenState();
}

class _CompletionScreenState extends ConsumerState<CompletionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _noteController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
    });

    final authState = ref.read(authProvider);
    final workerName = authState.phone ?? 'Worker';

    await ref.read(complaintServiceProvider).completeComplaint(
      widget.complaintId,
      workerName,
      _noteController.text.trim(),
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Complaint resolution submitted successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      // Go back twice to return to worker home workboard
      context.pop();
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Complete Work'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Resolution Details',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 8),
                TextFormField(
                  controller: _noteController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    labelText: 'What did you do to fix the issue?',
                    hintText: 'e.g. Replaced the faulty fuse, secured loose wiring, fixed the faucet leakage by changing the internal washer.',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please describe the resolution details';
                    }
                    if (value.trim().length < 8) {
                      return 'Please provide a slightly more descriptive resolution note';
                    }
                    return null;
                  },
                ),
                SizedBox(height: 48),
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                        )
                      : Text('Mark Resolution Done'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
