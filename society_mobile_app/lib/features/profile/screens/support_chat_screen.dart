import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/services/chat_service.dart';
import '../../auth/providers/auth_provider.dart';

class SupportChatScreen extends ConsumerStatefulWidget {
  const SupportChatScreen({super.key});

  @override
  ConsumerState<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends ConsumerState<SupportChatScreen> {
  final TextEditingController _messageController = TextEditingController();

  void _sendMessage(String flatId, String senderId, bool isAdmin) async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    try {
      await ref.read(chatServiceProvider).sendMessage(
        flatId: flatId,
        senderId: senderId,
        text: text,
        isAdmin: isAdmin,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send message: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    
    // In a real app, an admin might enter a specific flat's chat.
    // Here, if they are a resident, they get their flatId.
    // If they are an admin, they would need a flatId passed in. 
    // We assume the logged-in user is a resident opening their own chat for now.
    final flatId = authState.flatId ?? 'AdminRoom'; 
    final senderId = authState.userId ?? 'Unknown';
    final isAdmin = authState.role == 'admin';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Support Chat'),
            Text(
              isAdmin ? 'Chatting with Flat $flatId' : 'App Maintainer',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onPrimary.withOpacity(0.8)),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<Message>>(
              stream: ref.watch(chatServiceProvider).getMessages(flatId),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return Center(child: Text('Error loading messages'));
                }

                final messages = snapshot.data ?? [];

                if (messages.isEmpty) {
                  return Center(
                    child: Text(
                      'No messages yet.\nSend a message to start chatting.',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  );
                }

                return ListView.builder(
                  reverse: true,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index];
                    final isMe = msg.senderId == senderId;

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.75,
                        ),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: isMe ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16),
                              topRight: const Radius.circular(16),
                              bottomLeft: Radius.circular(isMe ? 16 : 0),
                              bottomRight: Radius.circular(isMe ? 0 : 16),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                            children: [
                              Text(
                                msg.text,
                                style: TextStyle(
                                  color: isMe ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                DateFormat('hh:mm a').format(msg.timestamp),
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isMe ? theme.colorScheme.onPrimary.withOpacity(0.7) : theme.colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  offset: const Offset(0, -4),
                  blurRadius: 16,
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: theme.colorScheme.surfaceContainerHighest,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      ),
                      textCapitalization: TextCapitalization.sentences,
                      maxLines: null,
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: theme.colorScheme.primary,
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 20),
                      onPressed: () => _sendMessage(flatId, senderId, isAdmin),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
