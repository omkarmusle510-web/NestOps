class WorkerLeave {
  final String id;
  final String workerId;
  final String category;
  final DateTime startDate;
  final DateTime endDate;
  final String reason;
  final String? note;
  final String status; // 'pending', 'approved', 'rejected'
  final String createdAt;

  WorkerLeave({
    required this.id,
    required this.workerId,
    required this.category,
    required this.startDate,
    required this.endDate,
    required this.reason,
    this.note,
    required this.status,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'workerId': workerId,
      'category': category,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'reason': reason,
      'note': note,
      'status': status,
      'createdAt': createdAt,
    };
  }

  factory WorkerLeave.fromMap(Map<String, dynamic> map) {
    return WorkerLeave(
      id: map['id'] as String? ?? '',
      workerId: map['workerId'] as String? ?? '',
      category: map['category'] as String? ?? '',
      startDate: DateTime.parse(map['startDate'] as String),
      endDate: DateTime.parse(map['endDate'] as String),
      reason: map['reason'] as String? ?? '',
      note: map['note'] as String?,
      status: map['status'] as String? ?? 'pending',
      createdAt: map['createdAt'] as String? ?? '',
    );
  }
}

class WorkerPauseRequest {
  final String id;
  final String workerId;
  final String category;
  final String reason;
  final String duration; // e.g. "2 hours", "4 hours", "today"
  final String status; // 'pending', 'approved', 'rejected'
  final String createdAt;

  WorkerPauseRequest({
    required this.id,
    required this.workerId,
    required this.category,
    required this.reason,
    required this.duration,
    required this.status,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'workerId': workerId,
      'category': category,
      'reason': reason,
      'duration': duration,
      'status': status,
      'createdAt': createdAt,
    };
  }

  factory WorkerPauseRequest.fromMap(Map<String, dynamic> map) {
    return WorkerPauseRequest(
      id: map['id'] as String? ?? '',
      workerId: map['workerId'] as String? ?? '',
      category: map['category'] as String? ?? '',
      reason: map['reason'] as String? ?? '',
      duration: map['duration'] as String? ?? '',
      status: map['status'] as String? ?? 'pending',
      createdAt: map['createdAt'] as String? ?? '',
    );
  }
}

class WorkerService {
  // In-memory simulation lists
  static final List<WorkerLeave> _mockLeaves = [
    // Pre-populate one leave that expired yesterday for testing history
    WorkerLeave(
      id: 'leave_prev',
      workerId: 'mock_uid_+15550100002',
      category: 'electrical',
      startDate: DateTime.now().subtract(const Duration(days: 3)),
      endDate: DateTime.now().subtract(const Duration(days: 2)),
      reason: 'Personal work',
      status: 'approved',
      createdAt: DateTime.now().subtract(const Duration(days: 4)).toIso8601String(),
    )
  ];
  
  static final List<WorkerPauseRequest> _mockPauses = [];

  /// Applies for a worker leave (simulation auto-approves for immediate testing feedback)
  Future<void> applyLeave({
    required String workerId,
    required String category,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    String? note,
  }) async {
    await Future.delayed(const Duration(milliseconds: 500));
    final newLeave = WorkerLeave(
      id: 'leave_${DateTime.now().millisecondsSinceEpoch}',
      workerId: workerId,
      category: category,
      startDate: startDate,
      endDate: endDate,
      reason: reason,
      note: note,
      status: 'approved', // Auto-approved in mock system for immediate feedback
      createdAt: DateTime.now().toIso8601String(),
    );
    _mockLeaves.insert(0, newLeave);
  }

  /// Streams worker's leaves
  Stream<List<WorkerLeave>> streamLeaves(String workerId) {
    return Stream.periodic(const Duration(seconds: 1), (_) {
      return _mockLeaves.where((l) => l.workerId == workerId).toList();
    });
  }

  /// Applies for a workboard pause request (starts as pending, but auto-approves after 5 seconds to simulate admin response)
  Future<void> applyPauseRequest({
    required String workerId,
    required String category,
    required String reason,
    required String duration,
  }) async {
    await Future.delayed(const Duration(milliseconds: 500));
    final newPause = WorkerPauseRequest(
      id: 'pause_${DateTime.now().millisecondsSinceEpoch}',
      workerId: workerId,
      category: category,
      reason: reason,
      duration: duration,
      status: 'pending',
      createdAt: DateTime.now().toIso8601String(),
    );
    _mockPauses.insert(0, newPause);

    // Simulate auto-approval from admin after 5 seconds
    Future.delayed(const Duration(seconds: 5), () {
      final index = _mockPauses.indexWhere((p) => p.id == newPause.id);
      if (index != -1) {
        final existing = _mockPauses[index];
        _mockPauses[index] = WorkerPauseRequest(
          id: existing.id,
          workerId: existing.workerId,
          category: existing.category,
          reason: existing.reason,
          duration: existing.duration,
          status: 'approved',
          createdAt: existing.createdAt,
        );
      }
    });
  }

  /// Streams worker's pause requests
  Stream<List<WorkerPauseRequest>> streamPauses(String workerId) {
    return Stream.periodic(const Duration(seconds: 1), (_) {
      return _mockPauses.where((p) => p.workerId == workerId).toList();
    });
  }

  /// Checks if the worker for a given category is currently unavailable
  /// (i.e. has an approved leave today or an active approved pause request)
  Future<bool> isWorkerUnavailable(String category) async {
    final now = DateTime.now();
    
    // Check approved leaves
    final hasActiveLeave = _mockLeaves.any((l) =>
        l.category.toLowerCase() == category.toLowerCase() &&
        l.status == 'approved' &&
        now.isAfter(l.startDate.subtract(const Duration(minutes: 1))) &&
        now.isBefore(l.endDate.add(const Duration(days: 1)))); // covers the end day

    // Check active approved pauses
    final hasActivePause = _mockPauses.any((p) =>
        p.category.toLowerCase() == category.toLowerCase() &&
        p.status == 'approved');

    return hasActiveLeave || hasActivePause;
  }
}
