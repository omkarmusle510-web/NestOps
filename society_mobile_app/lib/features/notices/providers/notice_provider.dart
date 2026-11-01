import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/notice_service.dart';
import '../models/notice_model.dart';

final noticeServiceProvider = Provider<NoticeService>((ref) {
  return NoticeService();
});

final noticesStreamProvider = StreamProvider<List<Notice>>((ref) {
  final service = ref.watch(noticeServiceProvider);
  return service.streamNotices();
});
