import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/complaint_service.dart';
import '../models/complaint_model.dart';
import '../../resident/models/society_issue_model.dart';

// Complaint Service Provider
final complaintServiceProvider = Provider<ComplaintService>((ref) {
  return ComplaintService();
});

// Complaints Stream Provider (family to watch specific flat)
final complaintsStreamProvider = StreamProvider.family<List<Complaint>, String>((ref, flatId) {
  final service = ref.watch(complaintServiceProvider);
  return service.streamComplaints(flatId);
});

// Society Issues Stream Provider
final societyIssuesStreamProvider = StreamProvider<List<SocietyIssue>>((ref) {
  final service = ref.watch(complaintServiceProvider);
  return service.streamSocietyIssues();
});
