import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../../complaints/providers/complaints_provider.dart';

class VisitUpdateScreen extends ConsumerStatefulWidget {
  final String complaintId;

  const VisitUpdateScreen({super.key, required this.complaintId});

  @override
  ConsumerState<VisitUpdateScreen> createState() => _VisitUpdateScreenState();
}

class _VisitUpdateScreenState extends ConsumerState<VisitUpdateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _slotController = TextEditingController();
  final _noteController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _slotController.dispose();
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

    await ref.read(complaintServiceProvider).scheduleComplaintRevisit(
      widget.complaintId,
      workerName,
      _slotController.text.trim(),
      _noteController.text.trim().isNotEmpty ? _noteController.text.trim() : null,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Visit scheduled successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      context.pop(); // Returns to complaint details
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Schedule/Reschedule Visit'),
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
                  'Specify Revisit Slot',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 8),
                TextFormField(
                  controller: _slotController,
                  decoration: InputDecoration(
                    labelText: 'Preferred Time Slot',
                    hintText: 'e.g. Sat 10 AM, Monday Evening 5 PM',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter a visit time slot';
                    }
                    return null;
                  },
                ),
                SizedBox(height: 24),
                Text(
                  'Add Worker Note',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 8),
                TextFormField(
                  controller: _noteController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Optional message for resident',
                    hintText: 'e.g. Going to inspect the main line. Please keep key ready.',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
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
                      : Text('Save Schedule'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
