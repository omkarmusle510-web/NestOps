import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/hall_booking_provider.dart';

class HallBookingListScreen extends ConsumerWidget {
  const HallBookingListScreen({super.key});

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'approved':
        return Colors.green;
      case 'rejected':
      case 'cancelled':
        return Colors.red;
      default:
        return const Color(0xFF9E9E9E);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final flatId = ref.watch(authProvider).flatId ?? '';
    final bookingsAsync = ref.watch(hallBookingsStreamProvider(flatId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text('Community Hall Bookings'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(hallBookingsStreamProvider(flatId));
          await Future.delayed(const Duration(milliseconds: 600));
        },
        child: bookingsAsync.when(
          data: (bookings) {
            if (bookings.isEmpty) {
              return SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Container(
                  height: MediaQuery.of(context).size.height - 200,
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.event_busy, size: 64, color: Theme.of(context).colorScheme.surfaceContainerHighest),
                      SizedBox(height: 16),
                      Text('No bookings found', style: TextStyle(fontSize: 18, color: const Color(0xFF9E9E9E))),
                      SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: () => context.push('/hall-booking-create'),
                        icon: Icon(Icons.add),
                        label: Text('Book Community Hall'),
                      ),
                    ],
                  ),
                ),
              );
            }
  
            return ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: bookings.length,
              itemBuilder: (context, index) {
              final booking = bookings[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              booking.eventName,
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _getStatusColor(booking.status).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              booking.status.toUpperCase(),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: _getStatusColor(booking.status),
                              ),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 12),
                      Row(
                        children: [
                          Icon(Icons.calendar_today, size: 16, color: const Color(0xFF9E9E9E)),
                          SizedBox(width: 8),
                          Text(booking.date == booking.endDate || booking.endDate.isEmpty
                              ? booking.date
                              : '${booking.date} to ${booking.endDate}'),
                        ],
                      ),
                      SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.access_time, size: 16, color: const Color(0xFF9E9E9E)),
                          SizedBox(width: 8),
                          Text(booking.timeSlot),
                        ],
                      ),
                      SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.people, size: 16, color: const Color(0xFF9E9E9E)),
                          SizedBox(width: 8),
                          Text('${booking.guestCount} Guests'),
                        ],
                      ),
                      if (booking.status == 'pending') ...[
                        SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: theme.colorScheme.primary,
                                  side: BorderSide(color: theme.colorScheme.primary),
                                ),
                                onPressed: () {
                                  context.push('/hall-booking-create', extra: booking);
                                },
                                child: Text('Edit Request'),
                              ),
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.red,
                                  side: const BorderSide(color: Colors.red),
                                ),
                                onPressed: () {
                                  ref.read(hallBookingServiceProvider).updateBookingStatus(booking.id, 'cancelled');
                                },
                                child: Text('Cancel'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              );
             },
           );
         },
         loading: () => Center(child: CircularProgressIndicator()),
         error: (e, st) => Center(child: Text('Error: $e')),
       ),
      ),
      floatingActionButton: bookingsAsync.hasValue && (bookingsAsync.value?.isNotEmpty ?? false)
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/hall-booking-create'),
              icon: Icon(Icons.add),
              label: Text('Book Hall'),
            )
          : null,
    );
  }
}
