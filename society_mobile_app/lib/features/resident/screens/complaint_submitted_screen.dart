import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class ComplaintSubmittedScreen extends StatefulWidget {
  final String category;
  final String urgency;
  final String complaintId;

  const ComplaintSubmittedScreen({
    super.key,
    required this.category,
    required this.urgency,
    required this.complaintId,
  });

  @override
  State<ComplaintSubmittedScreen> createState() =>
      _ComplaintSubmittedScreenState();
}

class _ComplaintSubmittedScreenState extends State<ComplaintSubmittedScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _scaleAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.elasticOut,
    );
    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.3, 1.0, curve: Curves.easeIn),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _getUrgencyColor() {
    switch (widget.urgency) {
      case 'emergency':
        return AppTheme.emergencyColor;
      case 'high':
        return AppTheme.highPriorityColor;
      case 'medium':
        return AppTheme.mediumPriorityColor;
      case 'low':
        return AppTheme.lowPriorityColor;
      default:
        return Theme.of(context).colorScheme.onSurfaceVariant;
    }
  }

  String _getEstimatedResponse() {
    switch (widget.urgency) {
      case 'emergency':
        return 'Immediate (within 15 mins)';
      case 'high':
        return 'Same day (within 12 hours)';
      case 'medium':
        return 'Within 24 hours';
      case 'low':
        return 'Flexible (within 4 days)';
      default:
        return 'N/A';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            children: [
              const Spacer(flex: 2),

              // Animated checkmark
              ScaleTransition(
                scale: _scaleAnimation,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.lowPriorityColor,
                        AppTheme.lowPriorityColor.withValues(alpha: 0.7),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color:
                            AppTheme.lowPriorityColor.withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Icon(
                    Icons.check_rounded,
                    color: Colors.white,
                    size: 52,
                  ),
                ),
              ),

              SizedBox(height: 32),

              // Title
              FadeTransition(
                opacity: _fadeAnimation,
                child: Column(
                  children: [
                    Text(
                      'Complaint Submitted!',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Your ${widget.category} complaint has been logged and assigned to a worker.',
                      style: theme.textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),

              SizedBox(height: 32),

              // Summary Card
              FadeTransition(
                opacity: _fadeAnimation,
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        _SummaryRow(
                          icon: Icons.tag,
                          label: 'Complaint ID',
                          value: widget.complaintId,
                        ),
                        const Divider(height: 24),
                        _SummaryRow(
                          icon: Icons.category,
                          label: 'Category',
                          value: widget.category.toUpperCase(),
                        ),
                        const Divider(height: 24),
                        _SummaryRow(
                          icon: Icons.priority_high,
                          label: 'Urgency',
                          value: widget.urgency.toUpperCase(),
                          valueColor: _getUrgencyColor(),
                        ),
                        const Divider(height: 24),
                        _SummaryRow(
                          icon: Icons.timer_outlined,
                          label: 'Expected Response',
                          value: _getEstimatedResponse(),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              SizedBox(height: 16),

              // Emergency warning
              if (widget.urgency == 'emergency')
                FadeTransition(
                  opacity: _fadeAnimation,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.emergencyColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppTheme.emergencyColor.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.warning_amber_rounded,
                            color: AppTheme.emergencyColor, size: 20),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'This is marked as EMERGENCY. The worker and admin have been alerted immediately.',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.emergencyColor.withValues(alpha: 0.9),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              const Spacer(flex: 3),

              // Action Buttons
              FadeTransition(
                opacity: _fadeAnimation,
                child: Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => context.go('/resident-home'),
                        child: Text('Back to Home'),
                      ),
                    ),
                    SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () =>
                            context.go('/complaint-details/${widget.complaintId}'),
                        child: Text('View Complaint Details'),
                      ),
                    ),
                  ],
                ),
              ),

              SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Theme.of(context).colorScheme.onSurfaceVariant),
        SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: valueColor,
          ),
        ),
      ],
    );
  }
}
