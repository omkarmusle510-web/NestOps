import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/ledger_provider.dart';
import '../../auth/providers/auth_provider.dart';
import 'package:go_router/go_router.dart';

class ResidentBillsScreen extends ConsumerWidget {
  const ResidentBillsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final theme = Theme.of(context);
    final flatId = authState.flatId ?? 'Unknown';

    final ledgerAsync = ref.watch(flatLedgerStreamProvider(flatId));
    final activeBillAsync = ref.watch(activeBillRequestProvider(flatId));
    final billHistoryAsync = ref.watch(billHistoryProvider(flatId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Ironing Bills'),
        leading: BackButton(
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/resident-home');
            }
          },
        ),
      ),
      body: ledgerAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (ledger) {
          if (ledger == null) {
            return const Center(child: Text('No billing information found.'));
          }

          final bool hasDues = ledger.outstandingBalance > 0;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // ── Active Weekly Bill Card ──
              activeBillAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
                data: (activeBill) {
                  if (activeBill == null) return const SizedBox.shrink();
                  return _WeeklyBillCard(
                    request: activeBill,
                    ref: ref,
                    context: context,
                  );
                },
              ),

              // ── Balance Card ──
              Card(
                color: hasDues ? Colors.red.shade50 : Colors.green.shade50,
                shape: RoundedRectangleBorder(
                  side: BorderSide(
                    color: hasDues ? Colors.red.shade200 : Colors.green.shade200,
                    width: 1.5,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Text('Total Outstanding', style: theme.textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Text(
                        '₹${ledger.outstandingBalance.toStringAsFixed(0)}',
                        style: theme.textTheme.displayMedium?.copyWith(
                          color: hasDues ? Colors.red.shade900 : Colors.green.shade800,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (hasDues) ...[
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            icon: const Icon(Icons.payment),
                            label: const Text('Clear Dues (Cash / Direct)'),
                            onPressed: () {
                              _showPaymentDialog(context, ref, ledger.outstandingBalance, flatId);
                            },
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // ── Transaction History ──
              Text('Transaction History', style: theme.textTheme.titleLarge),
              const SizedBox(height: 12),
              if (ledger.transactions.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Center(
                    child: Text(
                      'No transactions yet.',
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  ),
                )
              else
                ...ledger.transactions.map((txn) {
                  final isCharge = txn.type == 'charge';
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: isCharge ? Colors.orange.shade100 : Colors.green.shade100,
                        child: Icon(
                          isCharge ? Icons.arrow_downward : Icons.arrow_upward,
                          color: isCharge ? Colors.orange : Colors.green,
                        ),
                      ),
                      title: Text(txn.description, style: const TextStyle(fontWeight: FontWeight.w500)),
                      subtitle: Text(
                        '${DateTime.parse(txn.timestamp).toLocal().toString().split('.')[0]}\nCategory: ${txn.category}',
                        style: theme.textTheme.bodySmall,
                      ),
                      isThreeLine: true,
                      trailing: Text(
                        '${isCharge ? '+' : '-'}₹${txn.amount.toStringAsFixed(0)}',
                        style: TextStyle(
                          color: isCharge ? Colors.red : Colors.green,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  );
                }),

              const SizedBox(height: 24),

              // ── Bill Closing History ──
              billHistoryAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
                data: (history) {
                  final closedBills = history
                      .where((r) => r.isSettled || r.isCarriedForward)
                      .toList();
                  if (closedBills.isEmpty) return const SizedBox.shrink();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Weekly Bill History', style: theme.textTheme.titleLarge),
                      const SizedBox(height: 12),
                      ...closedBills.map((bill) => _BillHistoryTile(bill: bill)),
                    ],
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }

  void _showPaymentDialog(BuildContext context, WidgetRef ref, double amount, String flatId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Payment'),
        content: Text(
          'Mark ₹${amount.toStringAsFixed(0)} as paid? This will notify the society/workers to confirm receipt.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await ref.read(ledgerServiceProvider).recordPayment(
                    flatId: flatId,
                    category: 'ironing_payment',
                    amount: amount,
                    description: 'Resident paid Ironing bill via cash/direct',
                  );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Payment recorded!')),
                );
              }
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Weekly Bill Action Card (shown when admin has closed the week)
// ─────────────────────────────────────────────────────────────

class _WeeklyBillCard extends StatelessWidget {
  final dynamic request; // WeeklyBillRequest
  final WidgetRef ref;
  final BuildContext context;

  const _WeeklyBillCard({
    required this.request,
    required this.ref,
    required this.context,
  });

  @override
  Widget build(BuildContext ctx) {
    // Determine what state we're in for this resident
    final bool awaitingAction = request.residentActionNeeded;
    final bool awaitingWorker = request.awaitingWorker;
    final bool isSettled = request.isSettled;
    final bool isCarried = request.isCarriedForward;
    final bool isDisputed = request.isDisputed;

    Color cardColor = Colors.blue.shade50;
    Color borderColor = Colors.blue.shade200;
    String statusText = '';

    if (awaitingAction) {
      cardColor = Colors.orange.shade50;
      borderColor = Colors.orange.shade300;
      statusText = 'Action needed';
    } else if (awaitingWorker) {
      cardColor = Colors.blue.shade50;
      borderColor = Colors.blue.shade200;
      statusText = 'Waiting for worker confirmation…';
    } else if (isSettled) {
      cardColor = Colors.green.shade50;
      borderColor = Colors.green.shade200;
      statusText = '✅ Settled';
    } else if (isCarried) {
      cardColor = Colors.grey.shade100;
      borderColor = Colors.grey.shade300;
      statusText = '⏩ Carried to next week';
    } else if (isDisputed) {
      cardColor = Colors.red.shade50;
      borderColor = Colors.red.shade200;
      statusText = '⚠️ Disputed — Admin reviewing';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: cardColor,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: borderColor, width: 1.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '📋 Weekly Bill',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.grey.shade800,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: borderColor.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: borderColor.withOpacity(2),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              request.weekLabel as String,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('New charges this week'),
                Text(
                  '₹${(request.chargesThisWeek as double).toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
            if ((request.previousCarryForward as double) > 0) ...[
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Carried from last week', style: TextStyle(color: Colors.grey.shade600)),
                  Text(
                    '₹${(request.previousCarryForward as double).toStringAsFixed(0)}',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ],
              ),
            ],
            const Divider(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total Due', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text(
                  '₹${(request.billedAmount as double).toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
                ),
              ],
            ),
            if (awaitingAction) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _deferPayment(context),
                      child: const Text('Pay Next Week'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                      icon: const Icon(Icons.check_circle_outline),
                      label: const Text("I've Paid"),
                      onPressed: () => _confirmPayment(context),
                    ),
                  ),
                ],
              ),
            ] else if (awaitingWorker) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Waiting for the ironing worker to confirm receipt of your payment.',
                        style: TextStyle(fontSize: 13, color: Colors.blue.shade900),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _confirmPayment(BuildContext ctx) {
    showDialog(
      context: ctx,
      builder: (dialogCtx) => AlertDialog(
        title: const Text("Confirm Payment"),
        content: Text(
          'Did you hand ₹${(request.billedAmount as double).toStringAsFixed(0)} to the ironing worker?\n\nShe will receive a notification to confirm.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () async {
              Navigator.pop(dialogCtx);
              try {
                await ref.read(ledgerServiceProvider).residentConfirmPayment(request.id as String);
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    const SnackBar(
                      content: Text("✅ Payment confirmed! Worker has been notified."),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text("Yes, I've Paid", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _deferPayment(BuildContext ctx) {
    showDialog(
      context: ctx,
      builder: (dialogCtx) => AlertDialog(
        title: const Text("Defer Payment"),
        content: const Text(
          'Your outstanding balance will be carried forward to next week. The worker will collect it then.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(dialogCtx);
              try {
                await ref.read(ledgerServiceProvider).residentDeferPayment(request.id as String);
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    const SnackBar(content: Text('⏩ Bill deferred to next week.')),
                  );
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Confirm Defer'),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Bill History Tile
// ─────────────────────────────────────────────────────────────

class _BillHistoryTile extends StatelessWidget {
  final dynamic bill; // WeeklyBillRequest

  const _BillHistoryTile({required this.bill});

  @override
  Widget build(BuildContext context) {
    final bool settled = bill.isSettled as bool;
    final bool carried = bill.isCarriedForward as bool;
    final bool disputed = bill.isDisputed as bool;

    final color = settled
        ? Colors.green
        : carried
            ? Colors.grey
            : disputed
                ? Colors.red
                : Colors.orange;

    final icon = settled
        ? Icons.check_circle
        : carried
            ? Icons.fast_forward
            : Icons.warning_amber_rounded;

    final label = settled
        ? 'Settled'
        : carried
            ? 'Carried Forward'
            : disputed
                ? 'Disputed'
                : 'Pending';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.15),
          child: Icon(icon, color: color),
        ),
        title: Text(bill.weekLabel as String, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          '₹${(bill.billedAmount as double).toStringAsFixed(0)} billed '
          '· ₹${(bill.chargesThisWeek as double).toStringAsFixed(0)} new this week',
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }
}
