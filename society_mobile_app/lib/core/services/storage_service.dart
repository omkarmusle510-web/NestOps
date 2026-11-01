import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final storageServiceProvider = Provider<StorageService>((ref) {
  return StorageService(FirebaseStorage.instance);
});

class StorageService {
  final FirebaseStorage _storage;

  StorageService(this._storage);

  /// Uploads an image to Firebase Storage and returns the download URL
  /// [folder] should be 'complaints' or 'society_issues'
  Future<String> uploadImage(File imageFile, String folder, String id) async {
    try {
      final fileName = DateTime.now().millisecondsSinceEpoch.toString();
      final extension = imageFile.path.split('.').last;
      
      final storageRef = _storage.ref().child('$folder/$id/$fileName.$extension');
      
      // Determine content type
      String contentType = 'image/jpeg';
      if (extension.toLowerCase() == 'png') {
        contentType = 'image/png';
      } else if (extension.toLowerCase() == 'gif') {
        contentType = 'image/gif';
      }
      
      // Upload the file with explicit metadata
      final uploadTask = await storageRef.putFile(
        imageFile,
        SettableMetadata(contentType: contentType),
      );
      
      // Get the download URL
      final downloadUrl = await uploadTask.ref.getDownloadURL();
      
      return downloadUrl;
    } catch (e) {
      throw Exception('Failed to upload image: $e');
    }
  }
}
