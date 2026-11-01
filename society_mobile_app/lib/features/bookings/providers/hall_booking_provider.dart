import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/hall_booking_model.dart';
import '../services/hall_booking_service.dart';

final hallBookingServiceProvider = Provider<HallBookingService>((ref) {
  return HallBookingService();
});

final hallBookingsStreamProvider = StreamProvider.family<List<HallBooking>, String>((ref, flatId) {
  final service = ref.watch(hallBookingServiceProvider);
  return service.getUserBookings(flatId);
});
