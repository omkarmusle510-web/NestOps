import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/complaint_model.dart';
import '../../resident/models/society_issue_model.dart';
import '../../billing/services/ledger_service.dart';

class ComplaintService {
  final LedgerService _ledgerService = LedgerService();
  FirebaseFirestore get _db => FirebaseFirestore.instance;

  // Simulator fallbacks
  static const bool _useSimulation = false;
  static final List<Complaint> _mockComplaints = [];
  static final List<SocietyIssue> _mockIssues = [
    SocietyIssue(
      id: 'issue_1',
      title: 'Common Area Lift Issue',
      description: 'Wing B main lift is vibrating and halting randomly.',
      status: 'under_review',
      reportedBy: 'Resident B-402',
      updates: [
        SocietyIssueUpdate(
          message: 'Technician called. Scheduled inspection tomorrow morning.',
          updatedBy: 'Admin Committee',
          timestamp: DateTime.now().subtract(const Duration(hours: 3)).toIso8601String(),
        ),
      ],
      createdAt: DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
    ),
    SocietyIssue(
      id: 'issue_2',
      title: 'Water Tank Cleaning Scheduled',
      description: 'Periodic maintenance cleaning for secondary drinking water overhead tank.',
      status: 'assigned',
      reportedBy: 'Admin Team',
      updates: [],
      createdAt: DateTime.now().subtract(const Duration(days: 2)).toIso8601String(),
    )
  ];

  /// Submits a complaint to Firestore (or adds to simulated memory list)
  /// Returns the complaint ID assigned.
  Future<String> submitComplaint(Complaint complaint) async {
    if (_useSimulation) {
      await Future.delayed(const Duration(seconds: 1));
      // In simulation, assign a mock ID if not present
      final mockId = complaint.id.isEmpty ? 'mock_complaint_${DateTime.now().millisecondsSinceEpoch}' : complaint.id;
      final simulatedComplaint = complaint.copyWith(id: mockId);
      _mockComplaints.insert(0, simulatedComplaint);
      return mockId;
    }

    try {
      if (complaint.id.isEmpty) {
        // Generate Sequential ID using a Firestore Transaction
        final counterRef = _db.collection('metadata').doc('counters');
        return await _db.runTransaction((transaction) async {
          final snapshot = await transaction.get(counterRef);
          int newCount = 1;
          if (snapshot.exists) {
            newCount = (snapshot.data()?['complaints'] ?? 0) + 1;
          }
          
          transaction.set(counterRef, {'complaints': newCount}, SetOptions(merge: true));
          
          final docId = 'CMP-${newCount.toString().padLeft(4, '0')}';
          final newComplaint = complaint.copyWith(id: docId);
          
          final docRef = _db.collection('complaints').doc(docId);
          transaction.set(docRef, newComplaint.toMap());
          
          return docId;
        });
      } else {
        // If an ID is already provided (e.g., retries)
        await _db.collection('complaints').doc(complaint.id).set(complaint.toMap());
        return complaint.id;
      }
    } catch (e) {
      debugPrint('Firestore submitComplaint failed, falling back to simulation: $e');
      final mockId = complaint.id.isEmpty ? 'mock_complaint_${DateTime.now().millisecondsSinceEpoch}' : complaint.id;
      _mockComplaints.insert(0, complaint.copyWith(id: mockId));
      return mockId;
    }
  }
  /// Edits an existing complaint
  Future<void> editComplaint(
    String complaintId,
    String newCategory,
    String newDescription,
    String newUrgency,
    Availability newAvailability,
  ) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Complaint details updated by resident',
      performedBy: 'Resident',
      role: 'resident',
      timestamp: now,
    );

    await _updateComplaintState(
      complaintId: complaintId,
      timelineEvent: timelineEvent,
      additionalUpdates: {
        'category': newCategory,
        'description': newDescription,
        'urgency': newUrgency,
        'availability': newAvailability.toMap(),
      },
    );
  }


  /// Streams real-time complaints list for the current flat
  Stream<List<Complaint>> streamComplaints(String flatId) {
    if (_useSimulation) {
      // Return a simulated stream that yields updates when modified
      return Stream.periodic(const Duration(seconds: 1), (_) {
        return _mockComplaints.where((c) => c.flatId == flatId).toList();
      });
    }

    try {
      return _db
          .collection('complaints')
          .where('flatId', isEqualTo: flatId)
          .orderBy('createdAt', descending: true)
          .snapshots()
          .map((snapshot) {
        return snapshot.docs
            .map((doc) => Complaint.fromMap(doc.data(), doc.id))
            .toList();
      });
    } catch (e) {
      debugPrint('Firestore streamComplaints error: $e');
      // Stream simulated list in case of errors
      return Stream.periodic(const Duration(seconds: 1), (_) {
        return _mockComplaints.where((c) => c.flatId == flatId).toList();
      });
    }
  }

  /// Streams public society bulletins
  Stream<List<SocietyIssue>> streamSocietyIssues() {
    if (_useSimulation) {
      return Stream.periodic(const Duration(seconds: 1), (_) => _mockIssues);
    }

    try {
      return _db
          .collection('society_issues')
          .orderBy('createdAt', descending: true)
          .snapshots()
          .map((snapshot) {
        return snapshot.docs
            .map((doc) => SocietyIssue.fromMap(doc.data(), doc.id))
            .toList();
      });
    } catch (e) {
      debugPrint('Firestore streamSocietyIssues error: $e');
      return Stream.periodic(const Duration(seconds: 1), (_) => _mockIssues);
    }
  }

  /// Checks if there is an existing unresolved complaint of the same category for this flat
  Future<bool> checkDuplicateComplaint(String flatId, String category) async {
    if (_useSimulation) {
      return _mockComplaints.any(
        (c) => c.flatId == flatId && c.category == category && c.status != 'closed',
      );
    }

    try {
      final snapshot = await _db
          .collection('complaints')
          .where('flatId', isEqualTo: flatId)
          .where('category', isEqualTo: category)
          .get();
      
      return snapshot.docs.any((doc) => doc.data()['status'] != 'closed');
    } catch (e) {
      debugPrint('Firestore checkDuplicateComplaint error: $e');
      return _mockComplaints.any(
        (c) => c.flatId == flatId && c.category == category && c.status != 'closed',
      );
    }
  }

  /// Reopens a complaint, adding a timeline event and incrementing reopen count
  Future<void> reopenComplaint(String complaintId, String note) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Complaint reopened',
      performedBy: 'Resident',
      role: 'resident',
      note: note.isNotEmpty ? note : null,
      timestamp: now,
    );

    if (_useSimulation) {
      await Future.delayed(const Duration(milliseconds: 500));
      final index = _mockComplaints.indexWhere((c) => c.id == complaintId);
      if (index != -1) {
        final existing = _mockComplaints[index];
        final newReopenCount = existing.reopenCount + 1;
        // Auto-escalate after 3 reopens per PRD
        final autoEscalate = newReopenCount >= 3;
        final finalStatus = autoEscalate ? 'escalated' : 'reopened';
        final timeline = [...existing.timeline, timelineEvent];
        if (autoEscalate) {
          timeline.add(TimelineEvent(
            action: 'Auto-escalated: Complaint reopened $newReopenCount times',
            performedBy: 'System',
            role: 'admin',
            note: 'Automatically escalated due to repeated reopenings',
            timestamp: now,
          ));
        }
        _mockComplaints[index] = existing.copyWith(
          status: finalStatus,
          reopenCount: newReopenCount,
          timeline: timeline,
          updatedAt: now,
        );
      }
      return;
    }

    try {
      final docRef = _db.collection('complaints').doc(complaintId);
      await _db.runTransaction((transaction) async {
        final snapshot = await transaction.get(docRef);
        if (!snapshot.exists) return;
        
        final data = snapshot.data()!;
        final currentReopenCount = data['reopenCount'] as int? ?? 0;
        final currentTimeline = List<Map<String, dynamic>>.from(data['timeline'] ?? []);
        
        currentTimeline.add(timelineEvent.toMap());
        
        transaction.update(docRef, {
          'status': 'reopened',
          'reopenCount': currentReopenCount + 1,
          'timeline': currentTimeline,
          'updatedAt': now,
        });
      });
    } catch (e) {
      debugPrint('Firestore reopenComplaint failed, fallback to simulation: $e');
      // Apply locally
      final index = _mockComplaints.indexWhere((c) => c.id == complaintId);
      if (index != -1) {
        final existing = _mockComplaints[index];
        final newReopenCount = existing.reopenCount + 1;
        final autoEscalate = newReopenCount >= 3;
        final finalStatus = autoEscalate ? 'escalated' : 'reopened';
        final timeline = [...existing.timeline, timelineEvent];
        if (autoEscalate) {
          timeline.add(TimelineEvent(
            action: 'Auto-escalated: Complaint reopened $newReopenCount times',
            performedBy: 'System',
            role: 'admin',
            note: 'Automatically escalated due to repeated reopenings',
            timestamp: now,
          ));
        }
        _mockComplaints[index] = existing.copyWith(
          status: finalStatus,
          reopenCount: newReopenCount,
          timeline: timeline,
          updatedAt: now,
        );
      }
    }
  }

  /// Resident confirms that a revisit schedule is acceptable
  Future<void> confirmRevisitSchedule(String complaintId) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Resident confirmed scheduled revisit time',
      performedBy: 'Resident',
      role: 'resident',
      timestamp: now,
    );

    if (_useSimulation) {
      await Future.delayed(const Duration(milliseconds: 500));
      final index = _mockComplaints.indexWhere((c) => c.id == complaintId);
      if (index != -1) {
        final existing = _mockComplaints[index];
        _mockComplaints[index] = existing.copyWith(
          timeline: [...existing.timeline, timelineEvent],
          updatedAt: now,
        );
      }
      return;
    }

    try {
      final docRef = _db.collection('complaints').doc(complaintId);
      await _db.runTransaction((transaction) async {
        final snapshot = await transaction.get(docRef);
        if (!snapshot.exists) return;
        
        final data = snapshot.data()!;
        final currentTimeline = List<Map<String, dynamic>>.from(data['timeline'] ?? []);
        currentTimeline.add(timelineEvent.toMap());
        
        transaction.update(docRef, {
          'timeline': currentTimeline,
          'updatedAt': now,
        });
      });
    } catch (e) {
      debugPrint('Firestore confirmRevisitSchedule failed: $e');
      final index = _mockComplaints.indexWhere((c) => c.id == complaintId);
      if (index != -1) {
        final existing = _mockComplaints[index];
        _mockComplaints[index] = existing.copyWith(
          timeline: [...existing.timeline, timelineEvent],
          updatedAt: now,
        );
      }
    }
  }

  /// Confirms completion of a complaint (Closed state)
  Future<void> confirmComplaintCompleted(String complaintId) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Resident confirmed resolution',
      performedBy: 'Resident',
      role: 'resident',
      timestamp: now,
    );

    if (_useSimulation) {
      await Future.delayed(const Duration(milliseconds: 500));
      final index = _mockComplaints.indexWhere((c) => c.id == complaintId);
      if (index != -1) {
        final existing = _mockComplaints[index];
        _mockComplaints[index] = existing.copyWith(
          status: 'closed',
          timeline: [...existing.timeline, timelineEvent],
          updatedAt: now,
        );
      }
      return;
    }

    try {
      final docRef = _db.collection('complaints').doc(complaintId);
      await _db.runTransaction((transaction) async {
        final snapshot = await transaction.get(docRef);
        if (!snapshot.exists) return;
        
        final data = snapshot.data()!;
        final currentTimeline = List<Map<String, dynamic>>.from(data['timeline'] ?? []);
        
        currentTimeline.add(timelineEvent.toMap());
        
        transaction.update(docRef, {
          'status': 'closed',
          'timeline': currentTimeline,
          'updatedAt': now,
        });
      });
    } catch (e) {
      debugPrint('Firestore confirmComplaintCompleted failed, fallback to simulation: $e');
      final index = _mockComplaints.indexWhere((c) => c.id == complaintId);
      if (index != -1) {
        final existing = _mockComplaints[index];
        _mockComplaints[index] = existing.copyWith(
          status: 'closed',
          timeline: [...existing.timeline, timelineEvent],
          updatedAt: now,
        );
      }
    }
  }

  /// Resident manually closes the complaint
  Future<void> closeComplaintManually(String complaintId, String reason) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Resident closed the complaint',
      performedBy: 'Resident',
      role: 'resident',
      note: reason.isNotEmpty ? reason : null,
      timestamp: now,
    );

    if (_useSimulation) {
      await Future.delayed(const Duration(milliseconds: 500));
      final index = _mockComplaints.indexWhere((c) => c.id == complaintId);
      if (index != -1) {
        final existing = _mockComplaints[index];
        _mockComplaints[index] = existing.copyWith(
          status: 'closed',
          timeline: [...existing.timeline, timelineEvent],
          updatedAt: now,
        );
      }
      return;
    }

    try {
      final docRef = _db.collection('complaints').doc(complaintId);
      await _db.runTransaction((transaction) async {
        final snapshot = await transaction.get(docRef);
        if (!snapshot.exists) return;
        
        final data = snapshot.data()!;
        final currentTimeline = List<Map<String, dynamic>>.from(data['timeline'] ?? []);
        
        currentTimeline.add(timelineEvent.toMap());
        
        transaction.update(docRef, {
          'status': 'closed',
          'timeline': currentTimeline,
          'updatedAt': now,
        });
      });
    } catch (e) {
      debugPrint('Firestore closeComplaintManually failed, fallback to simulation: $e');
      final index = _mockComplaints.indexWhere((c) => c.id == complaintId);
      if (index != -1) {
        final existing = _mockComplaints[index];
        _mockComplaints[index] = existing.copyWith(
          status: 'closed',
          timeline: [...existing.timeline, timelineEvent],
          updatedAt: now,
        );
      }
    }
  }

  /// Helper to update a complaint's state in simulation or Firestore
  Future<void> _updateComplaintState({
    required String complaintId,
    String? status,
    required TimelineEvent timelineEvent,
    WorkerNote? workerNote,
    Availability? newAvailability,
    Map<String, dynamic>? additionalUpdates,
  }) async {
    final now = DateTime.now().toIso8601String();
    
    if (_useSimulation) {
      await Future.delayed(const Duration(milliseconds: 500));
      final index = _mockComplaints.indexWhere((c) => c.id == complaintId);
      if (index != -1) {
        final existing = _mockComplaints[index];
        _mockComplaints[index] = existing.copyWith(
          status: status ?? existing.status,
          timeline: [...existing.timeline, timelineEvent],
          workerNotes: workerNote != null ? [...existing.workerNotes, workerNote] : existing.workerNotes,
          availability: newAvailability ?? existing.availability,
          ironingDetails: additionalUpdates != null && additionalUpdates.containsKey('ironingDetails') 
              ? additionalUpdates['ironingDetails'] as Map<String, dynamic>
              : existing.ironingDetails,
          updatedAt: now,
        );
      }
      return;
    }

    try {
      final docRef = _db.collection('complaints').doc(complaintId);
      await _db.runTransaction((transaction) async {
        final snapshot = await transaction.get(docRef);
        if (!snapshot.exists) return;

        final data = snapshot.data()!;
        final currentTimeline = List<Map<String, dynamic>>.from(data['timeline'] ?? []);
        currentTimeline.add(timelineEvent.toMap());

        final currentNotes = List<Map<String, dynamic>>.from(data['workerNotes'] ?? []);
        if (workerNote != null) {
          currentNotes.add(workerNote.toMap());
        }

        final updates = <String, dynamic>{
          'timeline': currentTimeline,
          'workerNotes': currentNotes,
          'updatedAt': now,
          ...?additionalUpdates,
        };
        if (status != null) {
          updates['status'] = status;
        }

        if (newAvailability != null) {
          updates['availability'] = newAvailability.toMap();
        }

        transaction.update(docRef, updates);
      });
    } catch (e) {
      debugPrint('Firestore update failed, fallback to simulation: $e');
      final index = _mockComplaints.indexWhere((c) => c.id == complaintId);
      if (index != -1) {
        final existing = _mockComplaints[index];
        _mockComplaints[index] = existing.copyWith(
          status: status ?? existing.status,
          timeline: [...existing.timeline, timelineEvent],
          workerNotes: workerNote != null ? [...existing.workerNotes, workerNote] : existing.workerNotes,
          availability: newAvailability ?? existing.availability,
          ironingDetails: additionalUpdates != null && additionalUpdates.containsKey('ironingDetails') 
              ? additionalUpdates['ironingDetails'] as Map<String, dynamic>
              : existing.ironingDetails,
          updatedAt: now,
        );
      }
    }
  }

  /// Worker streams complaints of their category
  Stream<List<Complaint>> streamWorkerComplaints(String category) {
    if (_useSimulation) {
      return Stream.periodic(const Duration(seconds: 1), (_) {
        return _mockComplaints.where((c) => c.category.toLowerCase() == category.toLowerCase()).toList();
      });
    }

    try {
      return _db
          .collection('complaints')
          .where('category', isEqualTo: category)
          .orderBy('createdAt', descending: true)
          .snapshots()
          .map((snapshot) {
        return snapshot.docs
            .map((doc) => Complaint.fromMap(doc.data(), doc.id))
            .toList();
      });
    } catch (e) {
      debugPrint('Firestore streamWorkerComplaints error: $e');
      return Stream.periodic(const Duration(seconds: 1), (_) {
        return _mockComplaints.where((c) => c.category.toLowerCase() == category.toLowerCase()).toList();
      });
    }
  }

  /// Worker accepts the complaint and provides an ETA
  Future<void> acceptComplaintWithETA(String complaintId, String workerName, String eta) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Job Accepted. ETA: $eta',
      performedBy: workerName,
      role: 'worker',
      timestamp: now,
    );
    final workerNote = WorkerNote(
      author: workerName,
      note: 'Job accepted. ETA: $eta',
      timestamp: now,
    );

    await _updateComplaintState(
      complaintId: complaintId,
      status: 'accepted',
      timelineEvent: timelineEvent,
      workerNote: workerNote,
      additionalUpdates: {
        'eta': eta,
      },
    );
    
    // Attempt to get flatId to simulate push notification to resident
    // (If not readily available we will simulate with a generic topic or fetch it)
    if (_useSimulation) {
      _simulatePushNotification(
        topic: 'resident_app',
        title: 'Worker Assigned & ETA',
        body: 'Worker $workerName has accepted your request. Estimated Arrival: $eta',
      );
    } else {
       _simulatePushNotification(
        topic: 'resident_app',
        title: 'Worker Assigned & ETA',
        body: 'Worker $workerName has accepted your request. Estimated Arrival: $eta',
      );
    }
  }

  /// Worker marks complaint as visited (inspected)
  Future<void> markComplaintVisited(String complaintId, String workerName, String? note) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Worker inspected issue',
      performedBy: workerName,
      role: 'worker',
      note: note,
      timestamp: now,
    );
    final workerNote = note != null && note.trim().isNotEmpty
        ? WorkerNote(author: workerName, note: note.trim(), timestamp: now)
        : null;

    await _updateComplaintState(
      complaintId: complaintId,
      status: 'visited',
      timelineEvent: timelineEvent,
      workerNote: workerNote,
    );
  }

  /// Worker marks complaint as need tools
  Future<void> markComplaintNeedTools(
    String complaintId, 
    String workerName, 
    String toolsDescription, 
    String? note,
    String toolsResponsibility,
  ) async {
    final now = DateTime.now().toIso8601String();
    final combinedNote = 'Need Tools: $toolsDescription${note != null && note.trim().isNotEmpty ? " | Note: $note" : ""}';
    final timelineEvent = TimelineEvent(
      action: 'Worker marked: Need Tools ($toolsDescription). Responsibility: $toolsResponsibility',
      performedBy: workerName,
      role: 'worker',
      note: note,
      timestamp: now,
    );
    final workerNote = WorkerNote(author: workerName, note: combinedNote, timestamp: now);

    await _updateComplaintState(
      complaintId: complaintId,
      status: 'need_tools',
      timelineEvent: timelineEvent,
      workerNote: workerNote,
      additionalUpdates: {
        'toolsDescription': toolsDescription,
        'toolsResponsibility': toolsResponsibility,
        'toolsProcured': false,
      },
    );
  }

  /// Mark tools as procured and optionally schedule revisit or just update timeline
  Future<void> markToolsProcured(String complaintId, String userName, String userRole, String flatId, String category) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Tools procured and ready for revisit',
      performedBy: userName,
      role: userRole,
      timestamp: now,
    );

    // Send Push Notification
    if (userRole == 'resident') {
      _simulatePushNotification(
        topic: 'worker_$category',
        title: 'Tools Ready',
        body: 'Resident at Flat $flatId has procured the required tools for Complaint $complaintId.',
      );
    } else {
      _simulatePushNotification(
        topic: 'resident_$flatId',
        title: 'Tools Ready',
        body: 'The worker has procured the tools. They will schedule a revisit shortly.',
      );
    }

    await _updateComplaintState(
      complaintId: complaintId,
      status: 'reopened', // Move to reopened so worker can explicitly schedule a revisit date/time
      timelineEvent: timelineEvent,
      additionalUpdates: {
        'toolsProcured': true,
      },
    );
  }

  void _simulatePushNotification({required String topic, required String title, required String body}) {
    // In a real app, this would use Firebase Messaging API or a Cloud Function trigger.
    debugPrint('\n=== PUSH NOTIFICATION SIMULATION ===');
    debugPrint('To Topic: $topic');
    debugPrint('Title: $title');
    debugPrint('Body: $body');
    debugPrint('====================================\n');
  }

  /// Worker schedules a revisit
  Future<void> scheduleComplaintRevisit(String complaintId, String workerName, String timeSlot, String? note) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Revisit scheduled for $timeSlot',
      performedBy: workerName,
      role: 'worker',
      note: note,
      timestamp: now,
    );
    final workerNote = note != null && note.trim().isNotEmpty
        ? WorkerNote(author: workerName, note: 'Revisit Scheduled: $note', timestamp: now)
        : null;

    await _updateComplaintState(
      complaintId: complaintId,
      status: 'revisit_scheduled',
      timelineEvent: timelineEvent,
      workerNote: workerNote,
      newAvailability: Availability(type: 'custom', customSlot: timeSlot),
    );
  }

  /// Worker marks resident as unavailable
  Future<void> markResidentUnavailable(String complaintId, String workerName, String? note) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Resident was unavailable',
      performedBy: workerName,
      role: 'worker',
      note: note,
      timestamp: now,
    );
    final workerNote = note != null && note.trim().isNotEmpty
        ? WorkerNote(author: workerName, note: 'Resident Unavailable: $note', timestamp: now)
        : null;

    await _updateComplaintState(
      complaintId: complaintId,
      status: 'reopened', // Resets/reopens the complaint for resident action
      timelineEvent: timelineEvent,
      workerNote: workerNote,
    );
  }

  /// Worker marks complaint completed
  Future<void> completeComplaint(String complaintId, String workerName, String? note) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Worker marked completed',
      performedBy: workerName,
      role: 'worker',
      note: note,
      timestamp: now,
    );
    final workerNote = note != null && note.trim().isNotEmpty
        ? WorkerNote(author: workerName, note: 'Completed: $note', timestamp: now)
        : null;

    await _updateComplaintState(
      complaintId: complaintId,
      status: 'awaiting_confirmation',
      timelineEvent: timelineEvent,
      workerNote: workerNote,
    );
  }

  // --- IRONING SPECIFIC METHODS ---

  Future<void> confirmIroningCount(String complaintId, String workerName, Map<String, dynamic> currentIroningDetails) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Iron Lady confirmed clothes count and picked up',
      performedBy: workerName,
      role: 'worker',
      timestamp: now,
    );

    final updatedDetails = Map<String, dynamic>.from(currentIroningDetails);
    updatedDetails['countConfirmedByWorker'] = true;

    await _updateComplaintState(
      complaintId: complaintId,
      status: 'visited', // Status moves to visited as she picked them up
      timelineEvent: timelineEvent,
      additionalUpdates: {'ironingDetails': updatedDetails},
    );
  }

  Future<void> markIroningReturnedAndCharge(String complaintId, String workerName, Map<String, dynamic> currentIroningDetails, String flatId) async {
    final now = DateTime.now().toIso8601String();
    final timelineEvent = TimelineEvent(
      action: 'Iron Lady returned clothes. Bill added to Ledger.',
      performedBy: workerName,
      role: 'worker',
      timestamp: now,
    );

    final updatedDetails = Map<String, dynamic>.from(currentIroningDetails);
    updatedDetails['clothesReturned'] = true;

    // Post to ledger
    double totalCost = (updatedDetails['totalCost'] as num?)?.toDouble() ?? 0.0;
    await _ledgerService.addCharge(
      flatId: flatId,
      category: 'ironing',
      amount: totalCost,
      description: 'Ironing order completed on ${DateTime.now().toLocal().toString().split(' ')[0]}',
      relatedComplaintId: complaintId,
    );

    // Close the complaint immediately, as payment is now handled via Ledger
    await _updateComplaintState(
      complaintId: complaintId,
      status: 'closed',
      timelineEvent: timelineEvent,
      additionalUpdates: {'ironingDetails': updatedDetails},
    );
  }
}
