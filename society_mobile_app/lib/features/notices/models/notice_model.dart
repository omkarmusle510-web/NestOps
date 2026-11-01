class Notice {
  final String id;
  final String title;
  final String topic;
  final String content;
  final String author;
  final String createdAt;

  Notice({
    required this.id,
    required this.title,
    required this.topic,
    required this.content,
    required this.author,
    required this.createdAt,
  });

  factory Notice.fromMap(Map<String, dynamic> map, String docId) {
    return Notice(
      id: docId,
      title: map['title'] as String? ?? '',
      topic: map['topic'] as String? ?? 'General',
      content: map['content'] as String? ?? '',
      author: map['author'] as String? ?? 'Admin',
      createdAt: map['createdAt'] != null 
          ? (map['createdAt'] is String ? map['createdAt'] : map['createdAt'].toDate().toIso8601String())
          : DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'topic': topic,
      'content': content,
      'author': author,
      'createdAt': createdAt,
    };
  }
}
