import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

class InviteVerificationResult {
  final bool isValid;
  final String? errorMessage;
  InviteVerificationResult({required this.isValid, this.errorMessage});
}

class AuthService {
  FirebaseAuth get _auth => FirebaseAuth.instance;
  FirebaseFirestore get _db => FirebaseFirestore.instance;

  // Mock data for development when Firebase configurations are not fully wired up
  static const bool _useSimulation = false;

  /// Normalize any phone input to +91XXXXXXXXXX format.
  /// Strips all non-digits, takes the last 10, prepends +91.
  String normalizePhone(String phone) {
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    final last10 = digits.length >= 10 ? digits.substring(digits.length - 10) : digits;
    return '+91$last10';
  }

  // Robust phone comparison helper — normalizes both before comparing
  bool _comparePhones(String phone1, String phone2) {
    final norm1 = normalizePhone(phone1);
    final norm2 = normalizePhone(phone2);
    return norm1 == norm2;
  }

  /// Verifies if the invite code matches the registered flat number in Firestore
  /// AND that the phone number is in the flat's authorized phoneNumbers list.
  Future<InviteVerificationResult> verifyInviteCode(String flatNumber, String inviteCode, String phone) async {
    if (_useSimulation && inviteCode == '123456') {
      return InviteVerificationResult(isValid: true);
    }
    
    try {
      final doc = await _db.collection('flats').doc(flatNumber).get();
      if (!doc.exists) {
        return InviteVerificationResult(
          isValid: false,
          errorMessage: 'Flat $flatNumber does not exist in the society database.',
        );
      }
      
      final data = doc.data();
      if (data == null) {
        return InviteVerificationResult(isValid: false, errorMessage: 'Flat data is empty.');
      }
      
      if (data['inviteCode'] != inviteCode) {
        return InviteVerificationResult(
          isValid: false,
          errorMessage: 'Incorrect invite code for Flat $flatNumber.',
        );
      }

      final List<dynamic> registeredPhones = data['phoneNumbers'] ?? [];
      final hasMatchingPhone = registeredPhones.any((registeredPhone) => 
        _comparePhones(registeredPhone.toString(), phone)
      );

      if (!hasMatchingPhone) {
        return InviteVerificationResult(
          isValid: false,
          errorMessage: 'Phone number is not registered for Flat $flatNumber by the administrator.',
        );
      }

      return InviteVerificationResult(isValid: true);
    } catch (e) {
      debugPrint('Error verifying invite code: $e');
      return InviteVerificationResult(
        isValid: false,
        errorMessage: 'Unable to verify invite. Please check your connection and try again.',
      );
    }
  }

  /// Verifies worker login: checks phone + inviteCode against the workers collection.
  /// Similar to how resident login checks flat + inviteCode + phone.
  Future<InviteVerificationResult> verifyWorkerLogin(String phone, String inviteCode) async {
    if (_useSimulation && inviteCode == '123456') {
      return InviteVerificationResult(isValid: true);
    }

    try {
      // Query workers by inviteCode
      final querySnapshot = await _db
          .collection('workers')
          .where('inviteCode', isEqualTo: inviteCode)
          .get();

      if (querySnapshot.docs.isEmpty) {
        return InviteVerificationResult(
          isValid: false,
          errorMessage: 'Incorrect worker passcode. Please check with your administrator.',
        );
      }

      // Find the worker with the matching phone
      final workerDoc = querySnapshot.docs.where((doc) {
        return _comparePhones(doc.data()['phone']?.toString() ?? '', phone);
      }).firstOrNull;

      if (workerDoc == null) {
        return InviteVerificationResult(
          isValid: false,
          errorMessage: 'No worker registered with this phone number for the provided passcode.',
        );
      }

      final workerData = workerDoc.data();

      // Check if the worker is active
      if (workerData['active'] != true) {
        return InviteVerificationResult(
          isValid: false,
          errorMessage: 'Your worker account has been deactivated. Contact the administrator.',
        );
      }

      return InviteVerificationResult(isValid: true);
    } catch (e) {
      debugPrint('Error verifying worker login: $e');
      return InviteVerificationResult(
        isValid: false,
        errorMessage: 'Unable to verify. Please check your connection and try again.',
      );
    }
  }

  /// Registers a new user via Invite Code (using Email/Password under the hood)
  Future<UserCredential> registerWithInvite({
    required String name,
    required String flatNumber,
    required String phone,
    required String inviteCode,
  }) async {
    final normalizedPhone = normalizePhone(phone);
    final email = '${normalizedPhone.replaceAll('+', '')}@society.app';
    
    try {
      // 1. Create account using Phone as Email, and Invite Code as Password
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: inviteCode,
      );

      // 2. Save profile in Firestore
      if (credential.user != null) {
        await _db.collection('users').doc(credential.user!.uid).set({
          'name': name,
          'phone': normalizedPhone,
          'flatId': flatNumber,
          'role': 'resident',
          'createdAt': FieldValue.serverTimestamp(),
          'status': 'active',
        });
      }

      return credential;
    } on FirebaseAuthException catch (e) {
      if (e.code == 'email-already-in-use') {
        // If they already registered, just log them in instead and update flatId
        final credential = await loginWithPhoneAndCode(normalizedPhone, inviteCode);
        if (credential.user != null) {
          await _db.collection('users').doc(credential.user!.uid).set({
            'name': name,
            'phone': normalizedPhone,
            'flatId': flatNumber,
            'role': 'resident',
            'status': 'active',
          }, SetOptions(merge: true));
        }
        return credential;
      }
      throw Exception(e.message ?? 'Registration failed');
    }
  }

  /// Registers or logs in a worker using phone + invite code.
  /// Creates a Firebase Auth account and Firestore user doc with role=worker.
  Future<UserCredential> registerWorkerWithInvite({
    required String phone,
    required String inviteCode,
  }) async {
    final normalizedPhone = normalizePhone(phone);
    // Use 'worker.' prefix to avoid collision with resident accounts using the same phone
    final email = 'worker.${normalizedPhone.replaceAll('+', '')}@society.app';

    // Fetch worker data to get name and category
    final querySnapshot = await _db
        .collection('workers')
        .where('inviteCode', isEqualTo: inviteCode)
        .get();

    final workerDoc = querySnapshot.docs.where((doc) {
      return _comparePhones(doc.data()['phone']?.toString() ?? '', phone);
    }).firstOrNull;

    final workerData = workerDoc?.data();
    final workerName = workerData?['name'] ?? 'Worker';
    final workerCategory = workerData?['category'] ?? '';

    try {
      // Try to create a new account
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: inviteCode,
      );

      if (credential.user != null) {
        await _db.collection('users').doc(credential.user!.uid).set({
          'name': workerName,
          'phone': normalizedPhone,
          'role': 'worker',
          'category': workerCategory,
          'createdAt': FieldValue.serverTimestamp(),
          'status': 'active',
        });
      }

      return credential;
    } on FirebaseAuthException catch (e) {
      if (e.code == 'email-already-in-use') {
        // Already registered — just log in and sync data
        final credential = await loginWithPhoneAndCode(normalizedPhone, inviteCode, role: 'worker');
        if (credential.user != null) {
          await _db.collection('users').doc(credential.user!.uid).set({
            'name': workerName,
            'phone': normalizedPhone,
            'category': workerCategory,
            'status': 'active',
          }, SetOptions(merge: true));
        }
        return credential;
      }
      throw Exception(e.message ?? 'Worker login failed');
    }
  }

  /// Logs in an existing user or worker using their Phone and Passcode/Invite Code
  Future<UserCredential> loginWithPhoneAndCode(String phone, String code, {String role = 'resident'}) async {
    final normalizedPhone = normalizePhone(phone);
    // Workers use 'worker.' prefix to keep accounts separate from residents
    final prefix = role == 'worker' ? 'worker.' : '';
    final email = '$prefix${normalizedPhone.replaceAll('+', '')}@society.app';
    
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email,
        password: code,
      );
    } on FirebaseAuthException catch (e) {
      throw Exception(e.message ?? 'Login failed. Check your phone number and code.');
    }
  }

  Future<Map<String, dynamic>?> getUserProfile(String uid, {String? simulatedPhone, String? simulatedFlatId}) async {
    // Simulation fallback
    if (uid.isEmpty || uid.startsWith('mock_uid_') || simulatedPhone != null) {
      final phone = simulatedPhone ?? '';
      if (phone.endsWith('01')) {
        return {'role': 'resident', 'flatId': simulatedFlatId ?? '1302', 'phone': phone};
      } else if (phone.endsWith('02')) {
        return {'role': 'worker', 'category': 'electrical', 'phone': phone};
      } else if (phone.endsWith('03')) {
        return {'role': 'worker', 'category': 'plumbing', 'phone': phone};
      } else if (phone.endsWith('04')) {
        return {'role': 'worker', 'category': 'housekeeping', 'phone': phone};
      } else if (phone.endsWith('05')) {
        return {'role': 'worker', 'category': 'ironing', 'phone': phone};
      } else if (phone.endsWith('06')) {
        return {'role': 'guard', 'phone': phone};
      }
      return {'role': 'resident', 'flatId': simulatedFlatId ?? '1302', 'phone': phone};
    }

    try {
      final doc = await _db.collection('users').doc(uid).get();
      return doc.data();
    } catch (e) {
      debugPrint('Error getting user profile: $e');
      return null;
    }
  }

  /// Signs the user out
  Future<void> signOut() async {
    if (_useSimulation) return;
    try {
      await _auth.signOut();
    } catch (e) {
      debugPrint('Error signing out: $e');
    }
  }

  /// Get current user UID
  String? get currentUid {
    if (_useSimulation) return null;
    try {
      return _auth.currentUser?.uid;
    } catch (e) {
      return null;
    }
  }
}
