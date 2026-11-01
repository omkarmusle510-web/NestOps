import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/ledger_model.dart';

class LedgerService {
  FirebaseFirestore get _db => FirebaseFirestore.instance;
  static const bool _useSimulation = false;
  
  // Simulated memory storage for ledgers keyed by flatId
  static final Map<String, FlatLedger> _mockLedgers = {};

  Stream<FlatLedger?> streamFlatLedger(String flatId) {
    if (_useSimulation) {
      return Stream.periodic(const Duration(seconds: 1), (_) {
        if (!_mockLedgers.containsKey(flatId)) {
          _mockLedgers[flatId] = FlatLedger(flatId: flatId, outstandingBalance: 0.0);
        }
        return _mockLedgers[flatId];
      });
    }

    try {
      return _db
          .collection('flat_ledgers')
          .doc(flatId)
          .snapshots()
          .map((doc) {
            if (!doc.exists) return FlatLedger(flatId: flatId, outstandingBalance: 0.0);
            return FlatLedger.fromMap(doc.data()!, doc.id);
          });
    } catch (e) {
      debugPrint('Firestore streamFlatLedger error: $e');
      return Stream.value(FlatLedger(flatId: flatId, outstandingBalance: 0.0));
    }
  }

  /// Streams all flat ledgers (for workers/admins)
  Stream<List<FlatLedger>> streamAllLedgers() {
    if (_useSimulation) {
      return Stream.periodic(const Duration(seconds: 1), (_) {
        return _mockLedgers.values.toList();
      });
    }

    try {
      return _db
          .collection('flat_ledgers')
          .snapshots()
          .map((snapshot) {
            return snapshot.docs.map((doc) => FlatLedger.fromMap(doc.data(), doc.id)).toList();
          });
    } catch (e) {
      debugPrint('Firestore streamAllLedgers error: $e');
      return Stream.value([]);
    }
  }

  /// Adds a charge to the flat's ledger
  Future<void> addCharge({
    required String flatId,
    required String category,
    required double amount,
    required String description,
    String? relatedComplaintId,
  }) async {
    final now = DateTime.now().toIso8601String();
    final transaction = LedgerTransaction(
      id: 'txn_${DateTime.now().millisecondsSinceEpoch}',
      type: 'charge',
      category: category,
      amount: amount,
      description: description,
      timestamp: now,
      relatedComplaintId: relatedComplaintId,
    );

    if (_useSimulation) {
      if (!_mockLedgers.containsKey(flatId)) {
        _mockLedgers[flatId] = FlatLedger(flatId: flatId, outstandingBalance: 0.0);
      }
      final current = _mockLedgers[flatId]!;
      _mockLedgers[flatId] = current.copyWith(
        outstandingBalance: current.outstandingBalance + amount,
        transactions: [transaction, ...current.transactions],
      );
      return;
    }

    // Firestore implementation
    try {
      final docRef = _db.collection('flat_ledgers').doc(flatId);
      await _db.runTransaction((tx) async {
        final doc = await tx.get(docRef);
        double currentBalance = 0.0;
        List<Map<String, dynamic>> currentHistory = [];

        if (doc.exists) {
          final data = doc.data()!;
          currentBalance = (data['outstandingBalance'] as num?)?.toDouble() ?? 0.0;
          currentHistory = List<Map<String, dynamic>>.from(data['transactions'] ?? []);
        }

        currentHistory.insert(0, {
          'id': transaction.id,
          ...transaction.toMap()
        });

        tx.set(docRef, {
          'outstandingBalance': currentBalance + amount,
          'transactions': currentHistory,
        }, SetOptions(merge: true));
      });
    } catch (e) {
      debugPrint('Firestore addCharge error: $e');
    }
  }

  /// Records a payment towards the flat's ledger
  Future<void> recordPayment({
    required String flatId,
    required String category,
    required double amount,
    required String description,
  }) async {
    final now = DateTime.now().toIso8601String();
    final transaction = LedgerTransaction(
      id: 'txn_${DateTime.now().millisecondsSinceEpoch}',
      type: 'payment',
      category: category,
      amount: amount, // Keeping amount positive, we subtract it from balance
      description: description,
      timestamp: now,
    );

    if (_useSimulation) {
      if (!_mockLedgers.containsKey(flatId)) {
        return; // Nothing to pay
      }
      final current = _mockLedgers[flatId]!;
      // Ensure balance doesn't go below 0 for this simple mock
      final newBalance = (current.outstandingBalance - amount).clamp(0.0, double.infinity);
      _mockLedgers[flatId] = current.copyWith(
        outstandingBalance: newBalance,
        transactions: [transaction, ...current.transactions],
      );
      return;
    }

    // Firestore implementation
    try {
      final docRef = _db.collection('flat_ledgers').doc(flatId);
      await _db.runTransaction((tx) async {
        final doc = await tx.get(docRef);
        if (!doc.exists) return;

        final data = doc.data()!;
        double currentBalance = (data['outstandingBalance'] as num?)?.toDouble() ?? 0.0;
        List<Map<String, dynamic>> currentHistory = List<Map<String, dynamic>>.from(data['transactions'] ?? []);

        currentHistory.insert(0, {
          'id': transaction.id,
          ...transaction.toMap()
        });

        tx.update(docRef, {
          'outstandingBalance': (currentBalance - amount).clamp(0.0, double.infinity),
          'transactions': currentHistory,
        });
      });
    } catch (e) {
      debugPrint('Firestore recordPayment error: $e');
    }
  }

  /// Mocks checking for overdue bills and "sending" push notifications
  /// In reality, a Cloud Function cron job would do this.
  Future<void> triggerWeeklyRemindersMock() async {
    final now = DateTime.now();
    for (var entry in _mockLedgers.entries) {
      final ledger = entry.value;
      if (ledger.outstandingBalance > 0) {
        // If last reminder was > 7 days ago or null
        bool shouldSend = false;
        if (ledger.lastReminderSentAt == null) {
          shouldSend = true;
        } else {
          final lastSent = DateTime.parse(ledger.lastReminderSentAt!);
          if (now.difference(lastSent).inDays >= 7) {
            shouldSend = true;
          }
        }

        if (shouldSend) {
          debugPrint('>>> PUSH NOTIFICATION (Mock) SENT TO FLAT ${ledger.flatId}: "You have an outstanding balance of ₹${ledger.outstandingBalance.toStringAsFixed(0)}! Please clear your dues."');
          _mockLedgers[entry.key] = ledger.copyWith(lastReminderSentAt: now.toIso8601String());
        }
      }
    }
  }

  // ──────────────────────────────────────
  // Weekly Bill Request Methods
  // ──────────────────────────────────────

  /// Streams the active weekly bill request for this flat (status: pending or resident_paid)
  Stream<WeeklyBillRequest?> streamActiveBillRequest(String flatId) {
    try {
      return _db
          .collection('weekly_bill_requests')
          .where('flatId', isEqualTo: flatId)
          .where('status', whereIn: ['pending', 'resident_paid', 'disputed'])
          .orderBy('createdAt', descending: true)
          .limit(1)
          .snapshots()
          .map((snap) {
            if (snap.docs.isEmpty) return null;
            final doc = snap.docs.first;
            return WeeklyBillRequest.fromMap(doc.data(), doc.id);
          });
    } catch (e) {
      debugPrint('streamActiveBillRequest error: $e');
      return Stream.value(null);
    }
  }

  /// Streams all past closed bill requests for a flat (settled / carried_forward)
  Stream<List<WeeklyBillRequest>> streamBillHistory(String flatId) {
    try {
      return _db
          .collection('weekly_bill_requests')
          .where('flatId', isEqualTo: flatId)
          .orderBy('createdAt', descending: true)
          .snapshots()
          .map((snap) => snap.docs
              .map((d) => WeeklyBillRequest.fromMap(d.data(), d.id))
              .toList());
    } catch (e) {
      debugPrint('streamBillHistory error: $e');
      return Stream.value([]);
    }
  }

  /// Streams all active bill requests for worker view
  Stream<List<WeeklyBillRequest>> streamAllActiveBillRequests() {
    try {
      return _db
          .collection('weekly_bill_requests')
          .where('status', isEqualTo: 'resident_paid')
          .orderBy('createdAt', descending: true)
          .snapshots()
          .map((snap) => snap.docs
              .map((d) => WeeklyBillRequest.fromMap(d.data(), d.id))
              .toList());
    } catch (e) {
      debugPrint('streamAllActiveBillRequests error: $e');
      return Stream.value([]);
    }
  }

  /// Resident confirms they paid — triggers Cloud Function to notify worker
  Future<void> residentConfirmPayment(String requestId) async {
    try {
      await _db.collection('weekly_bill_requests').doc(requestId).update({
        'residentConfirmed': true,
        'residentConfirmedAt': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      debugPrint('residentConfirmPayment error: $e');
      rethrow;
    }
  }

  /// Resident defers payment to next week
  Future<void> residentDeferPayment(String requestId) async {
    try {
      await _db.collection('weekly_bill_requests').doc(requestId).update({
        'residentConfirmed': false,
        'residentConfirmedAt': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      debugPrint('residentDeferPayment error: $e');
      rethrow;
    }
  }

  /// Worker confirms receipt of payment — Cloud Function zeroes the ledger
  Future<void> workerConfirmReceipt(String requestId) async {
    try {
      await _db.collection('weekly_bill_requests').doc(requestId).update({
        'workerConfirmed': true,
        'workerConfirmedAt': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      debugPrint('workerConfirmReceipt error: $e');
      rethrow;
    }
  }

  /// Worker denies receipt — triggers dispute flow
  Future<void> workerDenyReceipt(String requestId) async {
    try {
      await _db.collection('weekly_bill_requests').doc(requestId).update({
        'workerConfirmed': false,
        'workerConfirmedAt': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      debugPrint('workerDenyReceipt error: $e');
      rethrow;
    }
  }
}
