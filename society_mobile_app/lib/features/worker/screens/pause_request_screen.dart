import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/worker_provider.dart';

class PauseRequestScreen extends ConsumerStatefulWidget {
  const PauseRequestScreen({super.key});

  @override
  ConsumerState<PauseRequestScreen> createState() => _PauseRequestScreenState();
}

class _PauseRequestScreenState extends ConsumerState<PauseRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  String _selectedDuration = '2_hours';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.orange;
    }
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
    });

    final authState = ref.read(authProvider);
    final workerId = authState.userId ?? 'mock_worker_id';
    final category = authState.category ?? 'electrical';

    final durationMap = {
      '1_hour': '1 Hour',
      '2_hours': '2 Hours',
      '4_hours': '4 Hours',
      'today': 'Rest of Today',
    };

    await ref.read(workerServiceProvider).applyPauseRequest(
      workerId: workerId,
      category: category,
      reason: _reasonController.text.trim(),
      duration: durationMap[_selectedDuration] ?? '2 Hours',
    );

    if (mounted) {
      setState(() {
        _isSubmitting = false;
        _reasonController.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pause request submitted successfully!'),
          backgroundColor: Colors.blue,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    final workerId = authState.userId ?? 'mock_worker_id';
    
    // Watch pause requests list
    final pausesAsync = ref.watch(workerPausesStreamProvider(workerId));

    return Scaffold(
      appBar: AppBar(
        title: Text('Request Workboard Pause'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              flex: 4,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Why do you need to pause?',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 8),
                      TextFormField(
                        controller: _reasonController,
                        decoration: InputDecoration(
                          labelText: 'Reason for pause',
                          hintText: 'e.g. Handling grid failure in Wing C, emergency backup vendor help',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please state the reason for pausing workboard';
                          }
                          return null;
                        },
                      ),
                      SizedBox(height: 20),
                      Text(
                        'Expected Duration',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: _selectedDuration,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: '1_hour', child: Text('1 Hour')),
                          DropdownMenuItem(value: '2_hours', child: Text('2 Hours')),
                          DropdownMenuItem(value: '4_hours', child: Text('4 Hours')),
                          DropdownMenuItem(value: 'today', child: Text('Rest of Today')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedDuration = val);
                          }
                        },
                      ),
                      SizedBox(height: 32),
                      ElevatedButton(
                        onPressed: _isSubmitting ? null : _submit,
                        child: _isSubmitting
                            ? SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2.2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                              )
                            : Text('Submit Pause Request'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const Divider(height: 1),
            // Header for Request History
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              width: double.infinity,
              color: const Color(0xFFFAFAFA),
              child: Text(
                'PAUSE REQUEST HISTORY (Real-time)',
                style: theme.textTheme.titleSmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant, fontWeight: FontWeight.bold),
              ),
            ),
            Expanded(
              flex: 5,
              child: pausesAsync.when(
                loading: () => Center(child: CircularProgressIndicator()),
                error: (err, stack) => Center(child: Text('Error: $err')),
                data: (pauses) {
                  if (pauses.isEmpty) {
                    return Center(
                      child: Text(
                        'No pause requests submitted yet.',
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                    );
                  }

                  return ListView.builder(
                    itemCount: pauses.length,
                    itemBuilder: (context, index) {
                      final pause = pauses[index];
                      final dateStr = DateFormat('MMM dd, hh:mm a').format(DateTime.parse(pause.createdAt));

                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _getStatusColor(pause.status).withValues(alpha: 0.15),
                          child: Icon(
                            pause.status == 'approved' ? Icons.pause : Icons.pending_actions,
                            color: _getStatusColor(pause.status),
                          ),
                        ),
                        title: Text(pause.reason, maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Text('Duration: ${pause.duration} • $dateStr'),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getStatusColor(pause.status).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            pause.status.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: _getStatusColor(pause.status),
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
