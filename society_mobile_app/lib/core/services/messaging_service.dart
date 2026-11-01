import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../../main.dart'; // To access flutterLocalNotificationsPlugin and channel
import '../../routes/app_router.dart';

class MessagingService {
  final Ref ref;
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  MessagingService(this.ref);

  Future<void> init(String userId) async {
    // Request permissions (important for iOS and Android 13+)
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      debugPrint('User granted permission for notifications');
      await _saveDeviceToken(userId);
      
      // Listen for token refreshes
      _fcm.onTokenRefresh.listen((newToken) {
        _updateDeviceToken(userId, newToken);
      });

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        RemoteNotification? notification = message.notification;
        AndroidNotification? android = message.notification?.android;

        // If `onMessage` is triggered with a notification, construct our own
        // local notification to show to users using the created channel.
        if (notification != null && android != null) {
          flutterLocalNotificationsPlugin.show(
            id: notification.hashCode,
            title: notification.title,
            body: notification.body,
            notificationDetails: NotificationDetails(
              android: AndroidNotificationDetails(
                channel.id,
                channel.name,
                channelDescription: channel.description,
                icon: '@mipmap/ic_launcher',
                importance: Importance.max,
                priority: Priority.high,
                playSound: true,
                enableVibration: true,
              ),
            ),
          );
        }
      });
      
      // Handle notification taps when app is in background
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        _handleNotificationClick(message);
      });

      // Handle notification tap when app is completely closed (terminated)
      _fcm.getInitialMessage().then((RemoteMessage? message) {
        if (message != null) {
          // Add a small delay to allow GoRouter to initialize first
          Future.delayed(const Duration(milliseconds: 500), () {
            _handleNotificationClick(message);
          });
        }
      });
      
    } else {
      debugPrint('User declined or has not accepted permission');
    }
  }

  void _handleNotificationClick(RemoteMessage message) {
    if (message.data.containsKey('route')) {
      final route = message.data['route'];
      debugPrint('Navigating to route from notification: $route');
      ref.read(routerProvider).push(route);
    }
  }

  Future<void> _saveDeviceToken(String userId) async {
    try {
      String? token = await _fcm.getToken();
      if (token != null) {
        await _updateDeviceToken(userId, token);
      }
    } catch (e) {
      debugPrint('Error getting FCM token: $e');
    }
  }

  Future<void> _updateDeviceToken(String userId, String token) async {
    try {
      // Assuming users collection exists to store profile data
      await _db.collection('users').doc(userId).set({
        'fcmToken': token,
        'tokenUpdatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      debugPrint('FCM Token updated successfully');
    } catch (e) {
      debugPrint('Error saving FCM token to Firestore: $e');
    }
  }
}

final messagingServiceProvider = Provider((ref) => MessagingService(ref));
