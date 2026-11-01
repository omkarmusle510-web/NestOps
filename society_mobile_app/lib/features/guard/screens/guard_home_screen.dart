import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../visitors/providers/visitor_provider.dart';
import '../../visitors/models/visitor_model.dart';

class GuardHomeScreen extends ConsumerStatefulWidget {
  const GuardHomeScreen({super.key});

  @override
  ConsumerState<GuardHomeScreen> createState() => _GuardHomeScreenState();
}

class _GuardHomeScreenState extends ConsumerState<GuardHomeScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Form controllers for new visitor sheet
  final _nameController = TextEditingController();
  final _flatController = TextEditingController();
  final _companyController = TextEditingController();
  final _purposeController = TextEditingController();
  final _vehicleController = TextEditingController();
  String _visitorType = 'guest';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _flatController.dispose();
    _companyController.dispose();
    _purposeController.dispose();
    _vehicleController.dispose();
    super.dispose();
  }

  void _showAddVisitorSheet() {
    _nameController.clear();
    _flatController.clear();
    _companyController.clear();
    _purposeController.clear();
    _vehicleController.clear();
    _visitorType = 'guest';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddVisitorSheet(
        nameController: _nameController,
        flatController: _flatController,
        companyController: _companyController,
        purposeController: _purposeController,
        vehicleController: _vehicleController,
        initialType: _visitorType,
        onSubmit: (type) async {
          if (_nameController.text.isEmpty || _flatController.text.isEmpty) return;
          final newVisitor = Visitor(
            id: '',
            name: _nameController.text.trim(),
            flatId: _flatController.text.trim(),
            company: _companyController.text.trim(),
            purpose: _purposeController.text.trim(),
            status: 'pending',
            timestamp: DateTime.now(),
            vehicleNumber: _vehicleController.text.trim().isEmpty
                ? null
                : _vehicleController.text.trim(),
            visitorType: type,
          );
          await ref.read(visitorServiceProvider).addVisitor(newVisitor);
          if (ctx.mounted) Navigator.pop(ctx);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    final visitorsAsync = ref.watch(todayVisitorStreamProvider);
    final now = DateTime.now();
    final dateLabel = DateFormat('EEEE, d MMM').format(now);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: visitorsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (visitors) {
          final pending = visitors.where((v) => v.status == 'pending').toList();
          final approved = visitors.where((v) => v.status == 'approved').toList();
          final denied = visitors.where((v) => v.status == 'denied').toList();
          final exited = visitors.where((v) => v.status == 'exited').toList();

          return NestedScrollView(
            headerSliverBuilder: (ctx, _) => [
              // ── Sliver AppBar ──
              SliverAppBar(
                expandedHeight: 200,
                floating: false,
                pinned: true,
                backgroundColor: AppTheme.primaryColor,
                flexibleSpace: FlexibleSpaceBar(
                  background: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Color(0xFF283593), // deep indigo
                          Color(0xFF3F51B5), // indigo
                        ],
                      ),
                    ),
                    child: SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 12, 20, 56),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '🛡️ Gate Security',
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.85),
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      authState.name ?? 'Guard',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                GestureDetector(
                                  onTap: () => context.push('/guard-visitor-log'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: const Row(
                                      children: [
                                        Icon(Icons.history, color: Colors.white, size: 16),
                                        SizedBox(width: 6),
                                        Text('History', style: TextStyle(color: Colors.white, fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              dateLabel,
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.7),
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 10),
                            // Stats row
                            Row(
                              children: [
                                _StatChip(label: 'Total', value: visitors.length, color: Colors.white),
                                const SizedBox(width: 10),
                                _StatChip(label: 'Pending', value: pending.length, color: const Color(0xFFFFB74D)),
                                const SizedBox(width: 10),
                                _StatChip(label: 'Inside', value: approved.length, color: const Color(0xFF81C784)),
                                const SizedBox(width: 10),
                                _StatChip(label: 'Denied', value: denied.length, color: const Color(0xFFEF9A9A)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                bottom: TabBar(
                  controller: _tabController,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white60,
                  indicatorColor: Colors.white,
                  indicatorWeight: 3,
                  tabs: [
                    Tab(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('Pending'),
                          if (pending.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.orange,
                                borderRadius: BorderRadius.circular(99),
                              ),
                              child: Text(
                                '${pending.length}',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const Tab(text: 'Inside'),
                    const Tab(text: 'All Today'),
                  ],
                ),
              ),
            ],
            body: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Pending approval
                _VisitorList(
                  visitors: pending,
                  emptyIcon: Icons.hourglass_empty,
                  emptyMessage: 'No pending approvals.\nAll visitors have been processed.',
                  showActions: true,
                ),
                // Tab 2: Currently inside (approved, not exited)
                _VisitorList(
                  visitors: approved,
                  emptyIcon: Icons.door_front_door_outlined,
                  emptyMessage: 'No visitors currently inside the premises.',
                  showActions: false,
                  showExitButton: true,
                ),
                // Tab 3: All today (pending + approved + denied + exited)
                _VisitorList(
                  visitors: visitors,
                  emptyIcon: Icons.people_outline,
                  emptyMessage: 'No visitors logged today.\nTap + to register a new visitor.',
                  showActions: false,
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddVisitorSheet,
        backgroundColor: AppTheme.primaryColor,
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text('New Entry', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

// ─────────────────────────────────────────────────
// Visitor List Tab
// ─────────────────────────────────────────────────

class _VisitorList extends ConsumerWidget {
  final List<Visitor> visitors;
  final IconData emptyIcon;
  final String emptyMessage;
  final bool showActions;
  final bool showExitButton;

  const _VisitorList({
    required this.visitors,
    required this.emptyIcon,
    required this.emptyMessage,
    this.showActions = false,
    this.showExitButton = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (visitors.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(emptyIcon, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              emptyMessage,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade500, fontSize: 14, height: 1.5),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
      itemCount: visitors.length,
      itemBuilder: (ctx, i) => _VisitorCard(
        visitor: visitors[i],
        showActions: showActions,
        showExitButton: showExitButton,
      ),
    );
  }
}

// ─────────────────────────────────────────────────
// Visitor Card
// ─────────────────────────────────────────────────

class _VisitorCard extends ConsumerStatefulWidget {
  final Visitor visitor;
  final bool showActions;
  final bool showExitButton;

  const _VisitorCard({
    required this.visitor,
    this.showActions = false,
    this.showExitButton = false,
  });

  @override
  ConsumerState<_VisitorCard> createState() => _VisitorCardState();
}

class _VisitorCardState extends ConsumerState<_VisitorCard> {
  bool _expanded = false;

  Color get _statusColor {
    switch (widget.visitor.status) {
      case 'pending':
        return const Color(0xFFF59E0B);
      case 'approved':
        return const Color(0xFF10B981);
      case 'denied':
        return const Color(0xFFEF4444);
      case 'exited':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String get _statusLabel {
    switch (widget.visitor.status) {
      case 'pending':
        return '⏳ Awaiting';
      case 'approved':
        return '✅ Inside';
      case 'denied':
        return '❌ Denied';
      case 'exited':
        return '🚶 Exited';
      default:
        return widget.visitor.status;
    }
  }

  IconData get _typeIcon {
    switch (widget.visitor.visitorType) {
      case 'delivery':
        return Icons.delivery_dining;
      case 'service':
        return Icons.build_outlined;
      case 'guest':
        return Icons.people_outline;
      default:
        return Icons.person_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final timeStr = DateFormat('hh:mm a').format(widget.visitor.timestamp);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.only(bottom: 10),
      child: Card(
        elevation: widget.visitor.status == 'pending' ? 3 : 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: widget.visitor.status == 'pending'
              ? BorderSide(color: Colors.orange.shade200, width: 1.5)
              : BorderSide.none,
        ),
        child: InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                // ── Header row ──
                Row(
                  children: [
                    // Type icon avatar
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: _statusColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(_typeIcon, color: _statusColor, size: 22),
                    ),
                    const SizedBox(width: 12),
                    // Name + flat
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.visitor.name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Flat ${widget.visitor.flatId}  ·  $timeStr',
                            style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: _statusColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        _statusLabel,
                        style: TextStyle(
                          color: _statusColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Icon(
                      _expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                      color: Colors.grey.shade400,
                      size: 20,
                    ),
                  ],
                ),

                // ── Expanded details ──
                if (_expanded) ...[
                  const Divider(height: 20),
                  // Details grid
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Column(
                      children: [
                        _DetailRow(icon: Icons.business_outlined, label: 'Company', value: widget.visitor.company.isEmpty ? '—' : widget.visitor.company),
                        _DetailRow(icon: Icons.info_outline, label: 'Purpose', value: widget.visitor.purpose.isEmpty ? '—' : widget.visitor.purpose),
                        if (widget.visitor.vehicleNumber != null)
                          _DetailRow(icon: Icons.directions_car_outlined, label: 'Vehicle', value: widget.visitor.vehicleNumber!),
                        if (widget.visitor.visitorType != null)
                          _DetailRow(icon: Icons.category_outlined, label: 'Type', value: _capitalize(widget.visitor.visitorType!)),
                        if (widget.visitor.durationString.isNotEmpty)
                          _DetailRow(icon: Icons.timer_outlined, label: 'Duration', value: widget.visitor.durationString),
                        if (widget.visitor.exitTime != null)
                          _DetailRow(
                            icon: Icons.logout,
                            label: 'Exited',
                            value: DateFormat('hh:mm a').format(widget.visitor.exitTime!),
                          ),
                      ],
                    ),
                  ),

                  // ── Action buttons ──
                  if (widget.showActions) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red,
                              side: const BorderSide(color: Colors.red),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            icon: const Icon(Icons.close, size: 18),
                            label: const Text('Deny'),
                            onPressed: () => _updateStatus('denied'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            icon: const Icon(Icons.check, size: 18),
                            label: const Text('Let In'),
                            onPressed: () => _updateStatus('approved'),
                          ),
                        ),
                      ],
                    ),
                  ],

                  if (widget.showExitButton && widget.visitor.status == 'approved') ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.grey.shade700,
                          side: BorderSide(color: Colors.grey.shade400),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.exit_to_app, size: 18),
                        label: const Text('Mark Exited'),
                        onPressed: () => _markExited(),
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _updateStatus(String status) async {
    await ref.read(visitorServiceProvider).updateVisitorStatus(widget.visitor.id, status);
    if (mounted) {
      setState(() => _expanded = false);
      final msg = status == 'approved' ? '✅ Visitor let in!' : '❌ Visitor denied.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: status == 'approved' ? const Color(0xFF10B981) : Colors.red,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _markExited() async {
    await ref.read(visitorServiceProvider).markVisitorExited(widget.visitor.id);
    if (mounted) {
      setState(() => _expanded = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🚶 Visitor marked as exited.'), duration: Duration(seconds: 2)),
      );
    }
  }

  String _capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

// ─────────────────────────────────────────────────
// Detail row widget
// ─────────────────────────────────────────────────

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 15, color: Colors.grey.shade500),
          const SizedBox(width: 8),
          Text('$label: ', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────
// Stat chip in header
// ─────────────────────────────────────────────────

class _StatChip extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _StatChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(
            '$value',
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 18),
          ),
          Text(
            label,
            style: TextStyle(color: color.withOpacity(0.8), fontSize: 11),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────
// Add Visitor Bottom Sheet
// ─────────────────────────────────────────────────

class _AddVisitorSheet extends StatefulWidget {
  final TextEditingController nameController;
  final TextEditingController flatController;
  final TextEditingController companyController;
  final TextEditingController purposeController;
  final TextEditingController vehicleController;
  final String initialType;
  final Future<void> Function(String type) onSubmit;

  const _AddVisitorSheet({
    required this.nameController,
    required this.flatController,
    required this.companyController,
    required this.purposeController,
    required this.vehicleController,
    required this.initialType,
    required this.onSubmit,
  });

  @override
  State<_AddVisitorSheet> createState() => _AddVisitorSheetState();
}

class _AddVisitorSheetState extends State<_AddVisitorSheet> {
  String _selectedType = 'guest';
  bool _submitting = false;

  static const _types = [
    {'value': 'delivery', 'label': 'Delivery', 'icon': Icons.delivery_dining},
    {'value': 'guest', 'label': 'Guest', 'icon': Icons.people_outline},
    {'value': 'service', 'label': 'Service', 'icon': Icons.build_outlined},
    {'value': 'other', 'label': 'Other', 'icon': Icons.more_horiz},
  ];

  @override
  void initState() {
    super.initState();
    _selectedType = widget.initialType;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              '🚪 New Visitor Entry',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Register visitor at the gate',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
            ),
            const SizedBox(height: 20),

            // ── Visitor type selector ──
            Row(
              children: _types.map((t) {
                final isSelected = _selectedType == t['value'];
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedType = t['value'] as String),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppTheme.primaryColor.withOpacity(0.1)
                            : Colors.grey.shade100,
                        border: Border.all(
                          color: isSelected ? AppTheme.primaryColor : Colors.transparent,
                          width: 1.5,
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            t['icon'] as IconData,
                            color: isSelected ? AppTheme.primaryColor : Colors.grey.shade500,
                            size: 20,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            t['label'] as String,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? AppTheme.primaryColor : Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // ── Form fields ──
            _FormField(controller: widget.nameController, label: 'Visitor Name *', icon: Icons.person_outline, hint: 'Full name'),
            const SizedBox(height: 12),
            _FormField(controller: widget.flatController, label: 'Flat Number *', icon: Icons.home_outlined, hint: 'e.g. 1302'),
            const SizedBox(height: 12),
            _FormField(controller: widget.companyController, label: 'Company / From', icon: Icons.business_outlined, hint: 'e.g. Swiggy, Amazon, Guest'),
            const SizedBox(height: 12),
            _FormField(controller: widget.purposeController, label: 'Purpose', icon: Icons.info_outline, hint: 'e.g. Delivery, Visit, Repair'),
            const SizedBox(height: 12),
            _FormField(controller: widget.vehicleController, label: 'Vehicle Number (optional)', icon: Icons.directions_car_outlined, hint: 'e.g. MH12AB1234'),
            const SizedBox(height: 24),

            // ── Submit ──
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                icon: _submitting
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.send_outlined),
                label: Text(_submitting ? 'Sending...' : 'Send Approval Request'),
                onPressed: _submitting
                    ? null
                    : () async {
                        if (widget.nameController.text.isEmpty || widget.flatController.text.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Name and Flat Number are required.')),
                          );
                          return;
                        }
                        setState(() => _submitting = true);
                        await widget.onSubmit(_selectedType);
                        setState(() => _submitting = false);
                      },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FormField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final String hint;

  const _FormField({
    required this.controller,
    required this.label,
    required this.icon,
    required this.hint,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, size: 20),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        floatingLabelBehavior: FloatingLabelBehavior.auto,
      ),
    );
  }
}
