import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../visitors/providers/visitor_provider.dart';
import '../../visitors/models/visitor_model.dart';

class GuardVisitorLogScreen extends ConsumerStatefulWidget {
  const GuardVisitorLogScreen({super.key});

  @override
  ConsumerState<GuardVisitorLogScreen> createState() => _GuardVisitorLogScreenState();
}

class _GuardVisitorLogScreenState extends ConsumerState<GuardVisitorLogScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _filterStatus = 'all'; // all, pending, approved, denied, exited

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final visitorsAsync = ref.watch(allVisitorStreamProvider);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Visitor Log'),
        leading: BackButton(
          onPressed: () {
            if (context.canPop()) context.pop();
          },
        ),
        elevation: 0,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Text(
              visitorsAsync.maybeWhen(
                data: (v) => '${v.length} entries',
                orElse: () => '',
              ),
              style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 13),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Search bar ──
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _searchController,
              onChanged: (v) => setState(() => _searchQuery = v.trim().toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search by name, flat, company…',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                filled: true,
                fillColor: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // ── Status filter chips ──
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _FilterChip(label: 'All', value: 'all', selected: _filterStatus == 'all', onTap: () => setState(() => _filterStatus = 'all')),
                _FilterChip(label: '⏳ Pending', value: 'pending', selected: _filterStatus == 'pending', onTap: () => setState(() => _filterStatus = 'pending'), color: Colors.orange),
                _FilterChip(label: '✅ Inside', value: 'approved', selected: _filterStatus == 'approved', onTap: () => setState(() => _filterStatus = 'approved'), color: const Color(0xFF10B981)),
                _FilterChip(label: '❌ Denied', value: 'denied', selected: _filterStatus == 'denied', onTap: () => setState(() => _filterStatus = 'denied'), color: Colors.red),
                _FilterChip(label: '🚶 Exited', value: 'exited', selected: _filterStatus == 'exited', onTap: () => setState(() => _filterStatus = 'exited'), color: Colors.grey),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // ── List ──
          Expanded(
            child: visitorsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (visitors) {
                // Apply filters
                final filtered = visitors.where((v) {
                  final matchStatus = _filterStatus == 'all' || v.status == _filterStatus;
                  final matchSearch = _searchQuery.isEmpty ||
                      v.name.toLowerCase().contains(_searchQuery) ||
                      v.flatId.toLowerCase().contains(_searchQuery) ||
                      v.company.toLowerCase().contains(_searchQuery) ||
                      v.purpose.toLowerCase().contains(_searchQuery);
                  return matchStatus && matchSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search_off, size: 56, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        Text(
                          'No visitors found\nfor the selected filters.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey.shade500, height: 1.5),
                        ),
                      ],
                    ),
                  );
                }

                // Group by date
                final grouped = <String, List<Visitor>>{};
                for (final v in filtered) {
                  final key = _dateKey(v.timestamp);
                  grouped.putIfAbsent(key, () => []).add(v);
                }

                final sections = grouped.entries.toList();

                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  itemCount: sections.length,
                  itemBuilder: (ctx, i) {
                    final section = sections[i];
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Date section header
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Text(
                            section.key,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: AppTheme.primaryColor,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        ...section.value.map((v) => _LogTile(visitor: v)),
                      ],
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _dateKey(DateTime dt) {
    final now = DateTime.now();
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
      return 'Today — ${DateFormat('d MMM yyyy').format(dt)}';
    }
    final yesterday = now.subtract(const Duration(days: 1));
    if (dt.year == yesterday.year && dt.month == yesterday.month && dt.day == yesterday.day) {
      return 'Yesterday — ${DateFormat('d MMM yyyy').format(dt)}';
    }
    return DateFormat('EEEE, d MMM yyyy').format(dt);
  }
}

// ─────────────────────────────────────────────────
// Log Tile
// ─────────────────────────────────────────────────

class _LogTile extends StatelessWidget {
  final Visitor visitor;

  const _LogTile({required this.visitor});

  Color get _statusColor {
    switch (visitor.status) {
      case 'pending': return const Color(0xFFF59E0B);
      case 'approved': return const Color(0xFF10B981);
      case 'denied': return const Color(0xFFEF4444);
      case 'exited': return Colors.grey;
      default: return Colors.grey;
    }
  }

  String get _statusLabel {
    switch (visitor.status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Inside';
      case 'denied': return 'Denied';
      case 'exited': return 'Exited';
      default: return visitor.status;
    }
  }

  IconData get _typeIcon {
    switch (visitor.visitorType) {
      case 'delivery': return Icons.delivery_dining;
      case 'service': return Icons.build_outlined;
      case 'guest': return Icons.people_outline;
      default: return Icons.person_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeIn = DateFormat('hh:mm a').format(visitor.timestamp);
    final timeOut = visitor.exitTime != null ? DateFormat('hh:mm a').format(visitor.exitTime!) : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          // Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_typeIcon, color: _statusColor, size: 18),
          ),
          const SizedBox(width: 12),

          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        visitor.name,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        _statusLabel,
                        style: TextStyle(color: _statusColor, fontSize: 10, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  'Flat ${visitor.flatId}${visitor.company.isNotEmpty ? '  ·  ${visitor.company}' : ''}',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Icon(Icons.login, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(timeIn, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    if (timeOut != null) ...[
                      const SizedBox(width: 10),
                      Icon(Icons.logout, size: 12, color: Colors.grey.shade400),
                      const SizedBox(width: 4),
                      Text(timeOut, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    ],
                    if (visitor.vehicleNumber != null) ...[
                      const SizedBox(width: 10),
                      Icon(Icons.directions_car_outlined, size: 12, color: Colors.grey.shade400),
                      const SizedBox(width: 4),
                      Text(visitor.vehicleNumber!, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────
// Filter Chip
// ─────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  final String label;
  final String value;
  final bool selected;
  final VoidCallback onTap;
  final Color color;

  const _FilterChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
    this.color = AppTheme.primaryColor,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.12) : Colors.grey.shade100,
          border: Border.all(
            color: selected ? color : Colors.transparent,
            width: 1.5,
          ),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? color : Colors.grey.shade600,
          ),
        ),
      ),
    );
  }
}
