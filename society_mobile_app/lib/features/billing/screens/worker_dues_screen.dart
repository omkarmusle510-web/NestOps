import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/ledger_provider.dart';
import '../models/ledger_model.dart';

class WorkerDuesScreen extends ConsumerWidget {
  const WorkerDuesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Primary: flats that have claimed payment and need worker confirmation
    final pendingConfirmAsync = ref.watch(allPendingWorkerConfirmationsProvider);
    // Secondary: all outstanding balances (for awareness)
    final allLedgersAsync = ref.watch(allLedgersStreamProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dues Tracker'),
        leading: BackButton(
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/worker-home');
            }
          },
        ),
      ),
      body: pendingConfirmAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (pendingRequests) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // ── Payment Claims (primary action) ──
              if (pendingRequests.isNotEmpty) ...[
                _SectionHeader(
                  title: 'Payment Claims',
                  subtitle: '${pendingRequests.length} flat(s) say they\'ve paid — please confirm',
                  color: Colors.blue.shade700,
                ),
                const SizedBox(height: 12),
                ...pendingRequests.map((req) => _PaymentClaimCard(request: req, ref: ref)),
                const SizedBox(height: 28),
              ],

              // ── Outstanding Balances (awareness) ──
              _SectionHeader(
                title: 'All Outstanding Balances',
                subtitle: 'Flats with pending dues this week',
                color: Colors.grey.shade700,
              ),
              const SizedBox(height: 12),
              allLedgersAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Center(child: Text('Error: $err')),
                data: (ledgers) {
                  final outstanding = ledgers
                      .where((l) => l.outstandingBalance > 0)
                      .toList()
                    ..sort((a, b) => b.outstandingBalance.compareTo(a.outstandingBalance));

                  if (outstanding.isEmpty) {
                    return const _EmptyState(
                      icon: Icons.check_circle_outline,
                      message: 'All residents are cleared up! No outstanding dues.',
                      color: Colors.green,
                    );
                  }

                  return Column(
                    children: outstanding.map((ledger) {
                      // Check if this flat has a pending claim
                      final hasClaim = pendingRequests.any((r) => r.flatId == ledger.flatId);
                      return _OutstandingBalanceTile(ledger: ledger, hasClaim: hasClaim);
                    }).toList(),
                  );
                },
              ),

              if (pendingRequests.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Card(
                    color: Colors.blue.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.blue.shade700),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'No payment claims yet. When a resident taps "I\'ve Paid", you\'ll see it here to confirm.',
                              style: TextStyle(color: Colors.blue.shade900, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Payment Claim Card — worker sees a resident's payment claim
// ─────────────────────────────────────────────────────────────

class _PaymentClaimCard extends StatelessWidget {
  final WeeklyBillRequest request;
  final WidgetRef ref;

  const _PaymentClaimCard({required this.request, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: Colors.blue.shade50,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Colors.blue.shade200, width: 1.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.blue.shade100,
                  child: Icon(Icons.home, color: Colors.blue.shade700),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Flat ${request.flatId}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        request.weekLabel,
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Text(
                  '₹${request.billedAmount.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade100),
              ),
              child: Text(
                '💬 Flat ${request.flatId} says they\'ve paid ₹${request.billedAmount.toStringAsFixed(0)} to you. Did you receive it?',
                style: TextStyle(fontSize: 13, color: Colors.blue.shade900),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.close, color: Colors.red),
                    label: const Text("Not Received", style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                    ),
                    onPressed: () => _denyReceipt(context),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.check, color: Colors.white),
                    label: const Text('Yes, Received', style: TextStyle(color: Colors.white)),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () => _confirmReceipt(context),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _confirmReceipt(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Receipt'),
        content: Text(
          'Confirm that you received ₹${request.billedAmount.toStringAsFixed(0)} from Flat ${request.flatId}?\n\nThis will zero out their outstanding balance.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ref.read(ledgerServiceProvider).workerConfirmReceipt(request.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('✅ Payment from Flat ${request.flatId} confirmed! Balance zeroed.'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Yes, Received', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _denyReceipt(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Payment Not Received'),
        content: Text(
          'Mark ₹${request.billedAmount.toStringAsFixed(0)} from Flat ${request.flatId} as NOT received?\n\nThis will flag a dispute for the admin to resolve.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ref.read(ledgerServiceProvider).workerDenyReceipt(request.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('⚠️ Dispute flagged. Admin has been notified.'),
                      backgroundColor: Colors.orange,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Flag Dispute', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Outstanding Balance Tile
// ─────────────────────────────────────────────────────────────

class _OutstandingBalanceTile extends StatelessWidget {
  final FlatLedger ledger;
  final bool hasClaim;

  const _OutstandingBalanceTile({required this.ledger, required this.hasClaim});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: hasClaim ? Colors.blue.shade100 : Colors.red.shade100,
          child: Icon(
            hasClaim ? Icons.hourglass_bottom : Icons.warning,
            color: hasClaim ? Colors.blue : Colors.red,
          ),
        ),
        title: Text(
          'Flat ${ledger.flatId}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(hasClaim ? 'Payment claimed — awaiting your confirmation' : 'Outstanding dues'),
        trailing: Text(
          '₹${ledger.outstandingBalance.toStringAsFixed(0)}',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: hasClaim ? Colors.blue.shade700 : Colors.red.shade700,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final Color color;

  const _SectionHeader({
    required this.title,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
        ),
        Text(subtitle, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  final Color color;

  const _EmptyState({required this.icon, required this.message, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(icon, size: 56, color: color.withOpacity(0.7)),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
          ),
        ],
      ),
    );
  }
}
