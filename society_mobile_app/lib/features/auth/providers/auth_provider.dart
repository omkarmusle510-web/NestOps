import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/auth_service.dart';
import '../../../core/services/messaging_service.dart';

enum AuthStatus {
  initial,
  authenticating,
  authenticatedResident,
  authenticatedWorker,
  authenticatedGuard,
  unauthenticated,
  error,
}

class AuthState {
  final AuthStatus status;
  final String? userId;
  final String? flatId;
  final String? role;
  final String? phone;
  final String? category;
  final String? name;
  final String? profilePictureUrl;
  final String? errorMessage;
  final List<String> readNotifications;
  final String? societyId;
  final String? societyName;
  final bool isDemo;

  AuthState({
    required this.status,
    this.userId,
    this.flatId,
    this.role,
    this.phone,
    this.category,
    this.name,
    this.profilePictureUrl,
    this.errorMessage,
    this.readNotifications = const [],
    this.societyId,
    this.societyName,
    this.isDemo = false,
  });

  factory AuthState.initial() => AuthState(status: AuthStatus.initial);

  AuthState copyWith({
    AuthStatus? status,
    String? userId,
    String? flatId,
    String? role,
    String? phone,
    String? category,
    String? name,
    String? profilePictureUrl,
    String? errorMessage,
    List<String>? readNotifications,
    String? societyId,
    String? societyName,
    bool? isDemo,
  }) {
    return AuthState(
      status: status ?? this.status,
      userId: userId ?? this.userId,
      flatId: flatId ?? this.flatId,
      role: role ?? this.role,
      phone: phone ?? this.phone,
      category: category ?? this.category,
      name: name ?? this.name,
      profilePictureUrl: profilePictureUrl ?? this.profilePictureUrl,
      errorMessage: errorMessage ?? this.errorMessage,
      readNotifications: readNotifications ?? this.readNotifications,
      societyId: societyId ?? this.societyId,
      societyName: societyName ?? this.societyName,
      isDemo: isDemo ?? this.isDemo,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  late final AuthService _authService;
  String? _verificationId;

  @override
  AuthState build() {
    _authService = ref.watch(authServiceProvider);
    
    // Check persisted session asynchronously after initialization
    Future.microtask(() => _checkPersistedSession());
    
    return AuthState.initial();
  }

  void _checkPersistedSession() async {
    final uid = _authService.currentUid;
    if (uid == null) {
      state = AuthState(status: AuthStatus.unauthenticated);
      return;
    }

    try {
      final profile = await _authService.getUserProfile(uid);
      if (profile != null) {
        _setAuthenticatedState(uid, profile);
      } else {
        state = AuthState(status: AuthStatus.unauthenticated);
      }
    } catch (e) {
      state = AuthState(status: AuthStatus.unauthenticated);
    }
  }

  void _setAuthenticatedState(String uid, Map<String, dynamic> profile) {
    // Initialize FCM Token
    ref.read(messagingServiceProvider).init(uid);

    final role = profile['role'] as String?;
    final flatId = profile['flatId'] as String?;
    final category = profile['category'] as String?;
    final phone = profile['phone'] as String?;
    final name = profile['name'] as String?;
    final profilePictureUrl = profile['profilePictureUrl'] as String?;
    final readNotifications = List<String>.from(profile['readNotifications'] ?? []);

    if (role == 'worker') {
      state = AuthState(
        status: AuthStatus.authenticatedWorker,
        userId: uid,
        role: role,
        phone: phone,
        category: category,
        name: name,
        profilePictureUrl: profilePictureUrl,
        readNotifications: readNotifications,
      );
    } else if (role == 'guard') {
      state = AuthState(
        status: AuthStatus.authenticatedGuard,
        userId: uid,
        role: role,
        phone: phone,
        name: name,
        profilePictureUrl: profilePictureUrl,
        readNotifications: readNotifications,
      );
    } else {
      state = AuthState(
        status: AuthStatus.authenticatedResident,
        userId: uid,
        role: role,
        phone: phone,
        flatId: flatId ?? 'Unknown',
        name: name,
        profilePictureUrl: profilePictureUrl,
        readNotifications: readNotifications,
      );
    }
  }

  /// Step 1: Resident Register / Login via Invite Code
  Future<bool> submitInviteDetails({
    required String name,
    required String flatNumber,
    required String phone,
    required String inviteCode,
  }) async {
    state = state.copyWith(status: AuthStatus.authenticating);
    
    // First verify if the invite code matches the flat and phone
    final result = await _authService.verifyInviteCode(flatNumber, inviteCode, phone);
    if (!result.isValid) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: result.errorMessage ?? 'Invalid Flat Number, Invite Code, or Phone Number',
      );
      return false;
    }

    try {
      final userCred = await _authService.registerWithInvite(
        name: name,
        flatNumber: flatNumber,
        phone: phone,
        inviteCode: inviteCode,
      );
      
      final uid = userCred.user?.uid;
      if (uid == null) throw Exception("Failed to get User ID");

      final profile = await _authService.getUserProfile(uid) ?? {
        'role': 'resident',
        'flatId': flatNumber,
        'phone': phone,
      };
      
      _setAuthenticatedState(uid, profile);
      return true;
    } on fb.FirebaseAuthException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.toString());
      return false;
    }
  }

  /// Step 2: Login for Workers using Phone + Worker Passcode (invite code)
  /// Mirrors the resident flow: verify against workers collection first, then Firebase auth.
  Future<bool> loginUser(String phone, String code) async {
    state = state.copyWith(status: AuthStatus.authenticating);
    
    try {
      // First verify the worker phone + invite code against the workers collection
      final result = await _authService.verifyWorkerLogin(phone, code);
      if (!result.isValid) {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: result.errorMessage ?? 'Invalid phone number or passcode',
        );
        return false;
      }

      // Verified — now register or login via Firebase Auth
      final userCred = await _authService.registerWorkerWithInvite(
        phone: phone,
        inviteCode: code,
      );
      final uid = userCred.user?.uid;
      if (uid == null) throw Exception("Failed to get User ID");

      final profile = await _authService.getUserProfile(uid) ?? {
        'role': 'worker',
        'phone': _authService.normalizePhone(phone),
      };

      _setAuthenticatedState(uid, profile);
      return true;
    } on fb.FirebaseAuthException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.toString());
      return false;
    }
  }

  /// Demo access without Firebase — MonsoonProof personas.
  void loginAsDemoPersona({
    required String userId,
    required String name,
    required String role,
    String? societyId,
    String? societyName,
    String? flatId,
    String? category,
  }) {
    if (role == 'worker') {
      state = AuthState(
        status: AuthStatus.authenticatedWorker,
        userId: userId,
        role: 'worker',
        name: name,
        category: category ?? 'drainage',
        phone: '9000000000',
        isDemo: true,
      );
    } else {
      state = AuthState(
        status: AuthStatus.authenticatedResident,
        userId: userId,
        role: 'resident',
        name: name,
        flatId: flatId ?? 'Demo',
        societyId: societyId,
        societyName: societyName,
        phone: '9000000000',
        isDemo: true,
      );
    }
  }

  /// Sign out
  Future<void> logout() async {
    final wasDemo = state.isDemo;
    state = state.copyWith(status: AuthStatus.authenticating);

    if (!wasDemo) {
      // Clear FCM token before signing out so they don't receive notifications while logged out
      final uid = state.userId;
      if (uid != null) {
        try {
          await FirebaseFirestore.instance.collection('users').doc(uid).update({
            'fcmToken': FieldValue.delete(),
          });
        } catch (e) {
          // Ignore if user document doesn't exist or offline
        }
      }
      await _authService.signOut();
    }

    state = AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> updateProfilePicture(String url) async {
    final uid = state.userId;
    if (uid == null) return;

    if (!state.isDemo) {
      await FirebaseFirestore.instance.collection('users').doc(uid).update({
        'profilePictureUrl': url,
      });
    }

    state = state.copyWith(profilePictureUrl: url);
  }

  Future<void> updateProfileName(String newName) async {
    final uid = state.userId;
    if (uid == null) return;

    if (!state.isDemo) {
      await FirebaseFirestore.instance.collection('users').doc(uid).update({
        'name': newName,
      });
    }

    state = state.copyWith(name: newName);
  }

  Future<void> markNotificationAsRead(String notificationId) async {
    final uid = state.userId;
    if (uid == null) return;
    if (state.readNotifications.contains(notificationId)) return;

    final updatedList = [...state.readNotifications, notificationId];

    // Optimistic UI update
    state = state.copyWith(readNotifications: updatedList);

    if (!state.isDemo) {
      await FirebaseFirestore.instance.collection('users').doc(uid).update({
        'readNotifications': FieldValue.arrayUnion([notificationId]),
      });
    }
  }

  Future<void> markAllNotificationsAsRead(List<String> allNotificationIds) async {
    final uid = state.userId;
    if (uid == null) return;

    // Optimistic UI update
    state = state.copyWith(readNotifications: allNotificationIds);

    if (!state.isDemo) {
      await FirebaseFirestore.instance.collection('users').doc(uid).update({
        'readNotifications': allNotificationIds,
      });
    }
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

// Service provider
final authServiceProvider = Provider<AuthService>((ref) => AuthService());

// Auth state provider using new NotifierProvider
final authProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});
