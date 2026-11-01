import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class Message {
  final String id;
  final String senderId;
  final String text;
  final DateTime timestamp;
  final bool isAdmin;

  Message({
    required this.id,
    required this.senderId,
    required this.text,
    required this.timestamp,
    required this.isAdmin,
  });

  factory Message.fromMap(String id, Map<String, dynamic> map) {
    return Message(
      id: id,
      senderId: map['senderId'] ?? '',
      text: map['text'] ?? '',
      timestamp: (map['timestamp'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isAdmin: map['isAdmin'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'senderId': senderId,
      'text': text,
      'timestamp': FieldValue.serverTimestamp(),
      'isAdmin': isAdmin,
    };
  }
}

class ChatService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Stream<List<Message>> getMessages(String flatId) {
    return _db
        .collection('support_chats')
        .doc(flatId)
        .collection('messages')
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => Message.fromMap(doc.id, doc.data())).toList();
    });
  }

  Future<void> sendMessage({
    required String flatId,
    required String senderId,
    required String text,
    required bool isAdmin,
  }) async {
    final chatDoc = _db.collection('support_chats').doc(flatId);
    
    // Ensure chat document exists (useful for admins to list chats)
    await chatDoc.set({
      'lastMessage': text,
      'lastUpdated': FieldValue.serverTimestamp(),
      'flatId': flatId,
    }, SetOptions(merge: true));

    final msg = Message(
      id: '',
      senderId: senderId,
      text: text,
      timestamp: DateTime.now(),
      isAdmin: isAdmin,
    );

    await chatDoc.collection('messages').add(msg.toMap());
  }
}

final chatServiceProvider = Provider<ChatService>((ref) => ChatService());
