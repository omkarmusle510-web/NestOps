class LedgerTransaction {
  final String id;
  final String type; // 'charge' or 'payment'
  final String category; // 'ironing', 'maintenance', etc.
  final double amount;
  final String description;
  final String timestamp;
  final String? relatedComplaintId; // Link to the specific ironing task

  LedgerTransaction({
    required this.id,
    required this.type,
    required this.category,
    required this.amount,
    required this.description,
    required this.timestamp,
    this.relatedComplaintId,
  });

  factory LedgerTransaction.fromMap(Map<String, dynamic> map, String docId) {
    return LedgerTransaction(
      id: docId,
      type: map['type'] as String? ?? 'charge',
      category: map['category'] as String? ?? 'ironing',
      amount: (map['amount'] as num?)?.toDouble() ?? 0.0,
      description: map['description'] as String? ?? '',
      timestamp: map['timestamp'] as String? ?? '',
      relatedComplaintId: map['relatedComplaintId'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'type': type,
      'category': category,
      'amount': amount,
      'description': description,
      'timestamp': timestamp,
      if (relatedComplaintId != null) 'relatedComplaintId': relatedComplaintId,
    };
  }
}

class FlatLedger {
  final String flatId;
  final double outstandingBalance;
  final String? lastReminderSentAt;
  final List<LedgerTransaction> transactions;

  FlatLedger({
    required this.flatId,
    required this.outstandingBalance,
    this.lastReminderSentAt,
    this.transactions = const [],
  });

  factory FlatLedger.fromMap(Map<String, dynamic> map, String docId) {
    return FlatLedger(
      flatId: docId,
      outstandingBalance: (map['outstandingBalance'] as num?)?.toDouble() ?? 0.0,
      lastReminderSentAt: map['lastReminderSentAt'] as String?,
      transactions: (map['transactions'] as List? ?? [])
          .map((e) => LedgerTransaction.fromMap(Map<String, dynamic>.from(e), e['id'] ?? ''))
          .toList(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'outstandingBalance': outstandingBalance,
      if (lastReminderSentAt != null) 'lastReminderSentAt': lastReminderSentAt,
      'transactions': transactions.map((t) => {
        'id': t.id,
        ...t.toMap()
      }).toList(),
    };
  }

  FlatLedger copyWith({
    String? flatId,
    double? outstandingBalance,
    String? lastReminderSentAt,
    List<LedgerTransaction>? transactions,
  }) {
    return FlatLedger(
      flatId: flatId ?? this.flatId,
      outstandingBalance: outstandingBalance ?? this.outstandingBalance,
      lastReminderSentAt: lastReminderSentAt ?? this.lastReminderSentAt,
      transactions: transactions ?? this.transactions,
    );
  }
}

// ──────────────────────────────────────
// Weekly Bill Request
// ──────────────────────────────────────

class WeeklyBillRequest {
  final String id;
  final String weekId;           // e.g. '2026-W29'
  final String weekLabel;        // e.g. 'Jul 14–20, 2026'
  final String periodFrom;       // ISO
  final String periodTo;         // ISO
  final String flatId;
  final double billedAmount;
  final double chargesThisWeek;
  final double previousCarryForward;
  final bool? residentConfirmed; // null=pending, true=paid, false=carry
  final String? residentConfirmedAt;
  final bool? workerConfirmed;   // null=pending, true=received, false=not yet
  final String? workerConfirmedAt;
  final String status;           // pending/resident_paid/settled/carried_forward/disputed/admin_resolved
  final String? resolvedBy;
  final String? adminNote;
  final String createdAt;
  final String? closedAt;

  WeeklyBillRequest({
    required this.id,
    required this.weekId,
    required this.weekLabel,
    required this.periodFrom,
    required this.periodTo,
    required this.flatId,
    required this.billedAmount,
    required this.chargesThisWeek,
    required this.previousCarryForward,
    required this.status,
    required this.createdAt,
    this.residentConfirmed,
    this.residentConfirmedAt,
    this.workerConfirmed,
    this.workerConfirmedAt,
    this.resolvedBy,
    this.adminNote,
    this.closedAt,
  });

  factory WeeklyBillRequest.fromMap(Map<String, dynamic> map, String docId) {
    return WeeklyBillRequest(
      id: docId,
      weekId: map['weekId'] as String? ?? '',
      weekLabel: map['weekLabel'] as String? ?? '',
      periodFrom: map['periodFrom'] as String? ?? '',
      periodTo: map['periodTo'] as String? ?? '',
      flatId: map['flatId'] as String? ?? '',
      billedAmount: (map['billedAmount'] as num?)?.toDouble() ?? 0.0,
      chargesThisWeek: (map['chargesThisWeek'] as num?)?.toDouble() ?? 0.0,
      previousCarryForward: (map['previousCarryForward'] as num?)?.toDouble() ?? 0.0,
      residentConfirmed: map['residentConfirmed'] as bool?,
      residentConfirmedAt: map['residentConfirmedAt'] as String?,
      workerConfirmed: map['workerConfirmed'] as bool?,
      workerConfirmedAt: map['workerConfirmedAt'] as String?,
      status: map['status'] as String? ?? 'pending',
      resolvedBy: map['resolvedBy'] as String?,
      adminNote: map['adminNote'] as String?,
      createdAt: map['createdAt'] as String? ?? '',
      closedAt: map['closedAt'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'weekId': weekId,
      'weekLabel': weekLabel,
      'periodFrom': periodFrom,
      'periodTo': periodTo,
      'flatId': flatId,
      'billedAmount': billedAmount,
      'chargesThisWeek': chargesThisWeek,
      'previousCarryForward': previousCarryForward,
      'residentConfirmed': residentConfirmed,
      'residentConfirmedAt': residentConfirmedAt,
      'workerConfirmed': workerConfirmed,
      'workerConfirmedAt': workerConfirmedAt,
      'status': status,
      'resolvedBy': resolvedBy,
      'adminNote': adminNote,
      'createdAt': createdAt,
      'closedAt': closedAt,
    };
  }

  bool get isPending => status == 'pending';
  bool get isSettled => status == 'settled' || status == 'admin_resolved';
  bool get isCarriedForward => status == 'carried_forward';
  bool get isDisputed => status == 'disputed';
  bool get awaitingWorker => status == 'resident_paid';
  bool get residentActionNeeded => status == 'pending';
}
