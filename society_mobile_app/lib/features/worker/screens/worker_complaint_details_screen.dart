import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../complaints/models/complaint_model.dart';
import '../../complaints/providers/complaints_provider.dart';
import '../providers/worker_provider.dart';

class WorkerComplaintDetailsScreen extends ConsumerWidget {
  final String complaintId;

  const WorkerComplaintDetailsScreen({super.key, required this.complaintId});

  Color _getUrgencyColor(String urgency) {
    switch (urgency.toLowerCase()) {
      case 'emergency':
        return AppTheme.emergencyColor;
      case 'high':
        return AppTheme.highPriorityColor;
      case 'medium':
        return AppTheme.mediumPriorityColor;
      default:
        return AppTheme.lowPriorityColor;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'submitted':
      case 'queued':
        return Colors.blue;
      case 'accepted':
        return Colors.indigo;
      case 'visited':
      case 'revisit_scheduled':
        return Colors.purple;
      case 'need_tools':
        return AppTheme.highPriorityColor;
      case 'awaiting_confirmation':
        return Colors.teal;
      case 'closed':
        return AppTheme.lowPriorityColor;
      case 'reopened':
      case 'escalated':
        return AppTheme.emergencyColor;
      default:
        return const Color(0xFF9E9E9E);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    final workerName = authState.phone ?? 'Worker';

    // Watch all complaints for this category
    final category = authState.category ?? 'electrical';
    final complaintsAsync = ref.watch(workerComplaintsStreamProvider(category));

    return complaintsAsync.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (err, stack) => Scaffold(body: Center(child: Text('Error: $err'))),
      data: (complaints) {
        // Find specific complaint
        final complaint = complaints.firstWhere(
          (c) => c.id == complaintId,
          orElse: () => Complaint(
            id: '',
            flatId: 'Unknown',
            category: 'electrical',
            description: 'Complaint details could not be found.',
            urgency: 'low',
            status: 'unknown',
            availability: Availability(type: 'anytime_today'),
            createdAt: DateTime.now().toIso8601String(),
            updatedAt: DateTime.now().toIso8601String(),
          ),
        );

        if (complaint.id.isEmpty) {
          return Scaffold(
            appBar: AppBar(title: Text('Details')),
            body: Center(child: Text('Complaint not found or has been reassigned.')),
          );
        }

        final createdDate = DateFormat('MMMM dd, yyyy - hh:mm a').format(DateTime.parse(complaint.createdAt));

        return Scaffold(
          appBar: AppBar(
            title: Text('Complaint Flat ${complaint.flatId}'),
          ),
          body: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Card
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: _getUrgencyColor(complaint.urgency).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: _getUrgencyColor(complaint.urgency), width: 1.2),
                            ),
                            child: Text(
                              complaint.urgency.toUpperCase(),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: _getUrgencyColor(complaint.urgency),
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: _getStatusColor(complaint.status).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              complaint.status.replaceAll('_', ' ').toUpperCase(),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: _getStatusColor(complaint.status),
                              ),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 20),

                      Text('Issue Description', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      SizedBox(height: 8),
                      Text(
                        complaint.description,
                        style: theme.textTheme.bodyLarge?.copyWith(height: 1.4),
                      ),
                      SizedBox(height: 20),

                      // Availability & Date
                      Row(
                        children: [
                          Icon(Icons.access_time_filled, size: 20, color: Colors.blueAccent),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              complaint.availability.type == 'custom'
                                  ? 'Slot: ${complaint.availability.customSlot}'
                                  : 'Slot: ${complaint.availability.type.replaceAll('_', ' ')}',
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 12),
                      Row(
                        children: [
                          Icon(Icons.calendar_month, size: 20, color: const Color(0xFF9E9E9E)),
                          SizedBox(width: 8),
                          Text('Reported on: $createdDate', style: TextStyle(color: const Color(0xFF9E9E9E))),
                        ],
                      ),
                      SizedBox(height: 24),

                      const Divider(),
                      SizedBox(height: 16),

                      // Ironing Details Section
                      if (complaint.category == 'ironing' && complaint.ironingDetails != null) ...[
                        Text('Ironing Order Details', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                        SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.orange.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.orange.shade300),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Shirts:'),
                                  Text('${complaint.ironingDetails!['counts']['shirts']} x ₹${complaint.ironingDetails!['rates']['shirts']?.toInt()}', style: TextStyle(fontWeight: FontWeight.bold)),
                                ],
                              ),
                              SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Trousers:'),
                                  Text('${complaint.ironingDetails!['counts']['trousers']} x ₹${complaint.ironingDetails!['rates']['trousers']?.toInt()}', style: TextStyle(fontWeight: FontWeight.bold)),
                                ],
                              ),
                              SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Sarees:'),
                                  Text('${complaint.ironingDetails!['counts']['sarees']} x ₹${complaint.ironingDetails!['rates']['sarees']?.toInt()}', style: TextStyle(fontWeight: FontWeight.bold)),
                                ],
                              ),
                              SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Others:'),
                                  Text('${complaint.ironingDetails!['counts']['others']} x ₹${complaint.ironingDetails!['rates']['others']?.toInt()}', style: TextStyle(fontWeight: FontWeight.bold)),
                                ],
                              ),
                              Padding(
                                padding: EdgeInsets.symmetric(vertical: 8.0),
                                child: Divider(),
                              ),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Total Bill:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                  Text('₹${complaint.ironingDetails!['totalCost']?.toInt()}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.orange)),
                                ],
                              ),
                              SizedBox(height: 12),
                              if (complaint.ironingDetails!['clothesReturned'] == true)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(4)),
                                  child: Text('Clothes Returned ✓', style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                                )
                              else if (complaint.ironingDetails!['countConfirmedByWorker'] == true)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: Colors.blue.shade100, borderRadius: BorderRadius.circular(4)),
                                  child: Text('Ironing in Progress...', style: TextStyle(color: Colors.blue, fontSize: 12, fontWeight: FontWeight.bold)),
                                )
                              else
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: Colors.orange.shade100, borderRadius: BorderRadius.circular(4)),
                                  child: Text('Pending Count Confirmation', style: TextStyle(color: Colors.deepOrange, fontSize: 12, fontWeight: FontWeight.bold)),
                                ),
                            ],
                          ),
                        ),
                        SizedBox(height: 24),
                        const Divider(),
                        SizedBox(height: 16),
                      ],

                      // Timeline
                      Text('Progress Timeline', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      SizedBox(height: 16),
                      _buildTimeline(context, complaint.timeline),
                    ],
                  ),
                ),
              ),
              
              // Bottom Action Bar
              SafeArea(
                child: _buildBottomActionBar(context, ref, complaint, workerName),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTimeline(BuildContext context, List<TimelineEvent> timeline) {
    final theme = Theme.of(context);
    if (timeline.isEmpty) {
      return Text('No timeline events recorded.', style: TextStyle(color: const Color(0xFF9E9E9E)));
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: timeline.length,
      itemBuilder: (context, index) {
        final event = timeline[index];
        final eventTime = DateFormat('MMM dd, hh:mm a').format(DateTime.parse(event.timestamp));
        final isLast = index == timeline.length - 1;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                CircleAvatar(
                  radius: 10,
                  backgroundColor: isLast ? theme.colorScheme.primary : Theme.of(context).colorScheme.surfaceContainerHighest,
                  child: const CircleAvatar(radius: 5, backgroundColor: Colors.white),
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 50,
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  ),
              ],
            ),
            SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.action,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: isLast ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'By ${event.performedBy} (${event.role}) • $eventTime',
                    style: TextStyle(fontSize: 12, color: const Color(0xFF9E9E9E)),
                  ),
                  if (event.note != null && event.note!.isNotEmpty) ...[
                    SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Note: ${event.note}',
                        style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: theme.textTheme.bodyMedium?.color),
                      ),
                    ),
                  ],
                  SizedBox(height: 12),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildBottomActionBar(BuildContext context, WidgetRef ref, Complaint complaint, String workerName) {
    final status = complaint.status;

    if (status == 'closed') {
      return Container(
        width: double.infinity,
        color: Colors.green.shade50,
        padding: const EdgeInsets.all(16),
        child: Center(
          child: Text(
            'This complaint is closed.',
            style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
          ),
        ),
      );
    }

    if (status == 'awaiting_confirmation') {
      return Container(
        width: double.infinity,
        color: Colors.teal.shade50,
        padding: const EdgeInsets.all(16),
        child: Center(
          child: Text(
            'Awaiting resident confirmation of completion.',
            style: TextStyle(color: Colors.teal, fontWeight: FontWeight.bold),
          ),
        ),
      );
    }

    // Default Action Buttons based on status
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF9E9E9E).withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, -3),
          )
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Ironing specific actions override normal actions if category is ironing
          if (complaint.category == 'ironing' && complaint.ironingDetails != null) ...[
            if (complaint.ironingDetails!['countConfirmedByWorker'] == false)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: Icon(Icons.check_circle_outline),
                  label: Text('Confirm Clothes Count & Pickup'),
                  onPressed: () async {
                    await ref.read(complaintServiceProvider).confirmIroningCount(complaint.id, workerName, complaint.ironingDetails!);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Picked up! Bill generated.')));
                    }
                  },
                ),
              )
            else if (complaint.ironingDetails!['clothesReturned'] != true)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                  icon: Icon(Icons.shopping_bag),
                  label: Text('Return Clothes & Post Bill'),
                  onPressed: () async {
                    await ref.read(complaintServiceProvider).markIroningReturnedAndCharge(
                      complaint.id, 
                      workerName, 
                      complaint.ironingDetails!,
                      complaint.flatId,
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Clothes Returned! Task Closed.')));
                    }
                  },
                ),
              )
            else
              SizedBox(
                width: double.infinity,
                child: Center(child: Text('Task Complete.', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold))),
              ),
          ] else if (status == 'submitted' || status == 'queued') ...[
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: Icon(Icons.thumb_up),
                label: Text('Accept Job & Provide ETA'),
                onPressed: () {
                  final etaController = TextEditingController();
                  showDialog(
                    context: context,
                    builder: (context) {
                      return AlertDialog(
                        title: Text('Accept Job & ETA'),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('Provide an estimated time of arrival:'),
                            SizedBox(height: 12),
                            TextField(
                              controller: etaController,
                              decoration: const InputDecoration(
                                hintText: 'e.g., 15 mins, 2:00 PM',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ],
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: Text('Cancel'),
                          ),
                          ElevatedButton(
                            onPressed: () async {
                              final eta = etaController.text.trim();
                              if (eta.isEmpty) return;
                              Navigator.of(context).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Accepting job...')),
                              );
                              await ref.read(complaintServiceProvider).acceptComplaintWithETA(
                                complaint.id,
                                workerName,
                                eta,
                              );
                            },
                            child: Text('Submit'),
                          ),
                        ],
                      );
                    },
                  );
                },
              ),
            ),
          ] else if (status == 'accepted' || status == 'reopened' || (status == 'escalated' && !complaint.timeline.any((e) => e.action.toLowerCase().contains('visited') || e.action.toLowerCase().contains('inspected')))) ...[
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => context.push('/worker-visit-update/${complaint.id}?revisit=true'),
                    child: Text('Schedule Visit'),
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      // Mark Visited immediately
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Acknowledging...')),
                      );
                      await ref.read(complaintServiceProvider).markComplaintVisited(
                        complaint.id,
                        workerName,
                        'Visited flat to inspect.',
                      );
                    },
                    child: Text('Mark Visited'),
                  ),
                ),
              ],
            ),
          ] else if (status == 'visited' || status == 'need_tools' || status == 'revisit_scheduled' || (status == 'escalated' && complaint.timeline.any((e) => e.action.toLowerCase().contains('visited') || e.action.toLowerCase().contains('inspected')))) ...[
            // Main actions for active inspection: Need Tools, Resident Unavailable, Complete Work
            
            // If Need Tools and Worker is responsible and not procured yet, show Procure button
            if (status == 'need_tools' && complaint.toolsResponsibility == 'worker' && !complaint.toolsProcured)
              Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      foregroundColor: Colors.white,
                    ),
                    icon: Icon(Icons.shopping_bag),
                    label: Text('I Have Procured The Tools'),
                    onPressed: () async {
                      await ref.read(complaintServiceProvider).markToolsProcured(
                        complaint.id,
                        workerName,
                        'worker',
                        complaint.flatId,
                        complaint.category,
                      );
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Tools procured. Please schedule a revisit.')),
                        );
                        // Redirect to the schedule screen immediately since worker needs to set a time
                        context.push('/worker-visit-update/${complaint.id}?revisit=true');
                      }
                    },
                  ),
                ),
              ),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: Icon(Icons.handyman_outlined, size: 18),
                    label: Text('Need Tools'),
                    onPressed: () => context.push('/worker-need-tools/${complaint.id}'),
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: Icon(Icons.person_off_outlined, size: 18),
                    label: Text('Absent'),
                    onPressed: () async {
                      // Confirm and Mark Resident Unavailable
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: Text('Resident Unavailable'),
                          content: Text('Are you sure the resident was unavailable at the flat? This will log the miss and reopen the slot.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(context, false), child: Text('Cancel')),
                            TextButton(onPressed: () => Navigator.pop(context, true), child: Text('Confirm')),
                          ],
                        ),
                      );
                      if (confirm == true) {
                        await ref.read(complaintServiceProvider).markResidentUnavailable(
                          complaint.id,
                          workerName,
                          'Visited but resident was not present.',
                        );
                        if (context.mounted) {
                          context.pop();
                        }
                      }
                    },
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: Icon(Icons.date_range_outlined, size: 18),
                    label: Text('Reschedule'),
                    onPressed: () => context.push('/worker-visit-update/${complaint.id}?revisit=true'),
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: Icon(Icons.done_all_rounded, size: 18),
                    label: Text('Resolve Task'),
                    onPressed: () => context.push('/worker-complete/${complaint.id}'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
