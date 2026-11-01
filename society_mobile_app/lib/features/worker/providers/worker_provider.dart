import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../complaints/models/complaint_model.dart';
import '../../complaints/providers/complaints_provider.dart';
import '../services/worker_service.dart';

// Worker Service Provider
final workerServiceProvider = Provider<WorkerService>((ref) {
  return WorkerService();
});

// Worker Complaints Stream Provider (by category)
final workerComplaintsStreamProvider = StreamProvider.family<List<Complaint>, String>((ref, category) {
  final complaintService = ref.watch(complaintServiceProvider);
  return complaintService.streamWorkerComplaints(category);
});

// Worker Leaves Stream Provider (by worker ID)
final workerLeavesStreamProvider = StreamProvider.family<List<WorkerLeave>, String>((ref, workerId) {
  final workerService = ref.watch(workerServiceProvider);
  return workerService.streamLeaves(workerId);
});

// Worker Pauses Stream Provider (by worker ID)
final workerPausesStreamProvider = StreamProvider.family<List<WorkerPauseRequest>, String>((ref, workerId) {
  final workerService = ref.watch(workerServiceProvider);
  return workerService.streamPauses(workerId);
});

// Worker Unavailability Alert Stream Provider (watches leaves and active pauses every 2 seconds)
final workerUnavailableStreamProvider = StreamProvider.family<bool, String>((ref, category) {
  final workerService = ref.watch(workerServiceProvider);
  return Stream.periodic(const Duration(seconds: 2), (_) => category)
      .asyncMap((cat) => workerService.isWorkerUnavailable(cat));
});
