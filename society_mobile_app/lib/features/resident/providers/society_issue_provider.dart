import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/society_issue_model.dart';

final societyIssueServiceProvider = Provider<SocietyIssueService>((ref) {
  return SocietyIssueService(FirebaseFirestore.instance);
});

class SocietyIssueService {
  final FirebaseFirestore _firestore;

  SocietyIssueService(this._firestore);

  Future<String> submitIssue(SocietyIssue issue) async {
    try {
      final docRef = _firestore.collection('society_issues').doc();
      final issueData = issue.toMap();
      
      await docRef.set(issueData);
      
      return docRef.id;
    } catch (e) {
      throw Exception('Failed to submit society issue: $e');
    }
  }

  Stream<List<SocietyIssue>> getIssuesStream() {
    return _firestore
        .collection('society_issues')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => SocietyIssue.fromMap(doc.data(), doc.id))
            .toList());
  }
}
