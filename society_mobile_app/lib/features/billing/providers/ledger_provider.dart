import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/ledger_service.dart';
import '../models/ledger_model.dart';

final ledgerServiceProvider = Provider<LedgerService>((ref) {
  return LedgerService();
});

final flatLedgerStreamProvider = StreamProvider.family<FlatLedger?, String>((ref, flatId) {
  final service = ref.watch(ledgerServiceProvider);
  return service.streamFlatLedger(flatId);
});

final allLedgersStreamProvider = StreamProvider<List<FlatLedger>>((ref) {
  final service = ref.watch(ledgerServiceProvider);
  return service.streamAllLedgers();
});

// ─────────────────────────────────────
// Weekly Bill Request Providers
// ─────────────────────────────────────

/// Active bill request for a specific flat (pending/resident_paid/disputed)
final activeBillRequestProvider = StreamProvider.family<WeeklyBillRequest?, String>((ref, flatId) {
  final service = ref.watch(ledgerServiceProvider);
  return service.streamActiveBillRequest(flatId);
});

/// Full bill closing history for a specific flat
final billHistoryProvider = StreamProvider.family<List<WeeklyBillRequest>, String>((ref, flatId) {
  final service = ref.watch(ledgerServiceProvider);
  return service.streamBillHistory(flatId);
});

/// All flats that have claimed payment — for the worker to confirm
final allPendingWorkerConfirmationsProvider = StreamProvider<List<WeeklyBillRequest>>((ref) {
  final service = ref.watch(ledgerServiceProvider);
  return service.streamAllActiveBillRequests();
});
