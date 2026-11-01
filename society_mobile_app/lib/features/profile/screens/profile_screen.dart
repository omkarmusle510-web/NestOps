import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:society_mobile_app/features/auth/providers/auth_provider.dart';
import 'package:society_mobile_app/core/services/storage_service.dart';
import 'package:society_mobile_app/core/theme/theme_provider.dart';
import 'package:easy_localization/easy_localization.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _isEditingName = false;
  bool _isUploading = false;
  late TextEditingController _nameController;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadImage(ImageSource source) async {
    final authState = ref.read(authProvider);
    final userId = authState.userId;
    if (userId == null) return;

    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        imageQuality: 70,
        maxWidth: 500,
      );

      if (pickedFile == null) return;

      setState(() {
        _isUploading = true;
      });

      final file = File(pickedFile.path);
      // Upload using storage service under folder "profiles" and userId as the doc container
      final downloadUrl = await ref.read(storageServiceProvider).uploadImage(
        file,
        'profiles',
        userId,
      );

      // Save to Auth State & Firestore
      await ref.read(authProvider.notifier).updateProfilePicture(downloadUrl);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile picture updated successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update picture: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
      }
    }
  }

  void _showImagePickerOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: Icon(Icons.camera_alt),
                title: Text('Take a Photo'),
                onTap: () {
                  Navigator.pop(context);
                  _pickAndUploadImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: Icon(Icons.photo_library),
                title: Text('Choose from Gallery'),
                onTap: () {
                  Navigator.pop(context);
                  _pickAndUploadImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _saveName() async {
    final newName = _nameController.text.trim();
    if (newName.isEmpty) return;

    try {
      await ref.read(authProvider.notifier).updateProfileName(newName);
      setState(() {
        _isEditingName = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Name updated successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update name: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    final isResident = authState.role == 'resident';

    // Initialize controller value if name changes or is loaded
    final displayName = authState.name ?? (isResident ? 'Sanil Grover' : 'Electrician Pro');
    if (!_isEditingName) {
      _nameController.text = displayName;
    }

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text('profile.title'.tr()),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            children: [
              SizedBox(height: 16),
              // Profile Avatar with Camera Overlay
              Center(
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 56,
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                      backgroundImage: authState.profilePictureUrl != null
                          ? NetworkImage(authState.profilePictureUrl!)
                          : null,
                      child: authState.profilePictureUrl == null
                          ? Icon(Icons.person, size: 56, color: Theme.of(context).colorScheme.onSurfaceVariant)
                          : null,
                    ),
                    if (_isUploading)
                      Positioned.fill(
                        child: Container(
                          decoration: const BoxDecoration(
                            color: Color(0x73000000),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: CircularProgressIndicator(
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: _isUploading ? null : _showImagePickerOptions,
                        child: CircleAvatar(
                          radius: 18,
                          backgroundColor: theme.colorScheme.primary,
                          child: Icon(
                            Icons.camera_alt,
                            size: 16,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 24),

              // Name Display & Inline Editor
              _isEditingName
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _nameController,
                            textAlign: TextAlign.center,
                            style: theme.textTheme.headlineSmall,
                            decoration: const InputDecoration(
                              hintText: 'Enter name',
                              contentPadding: EdgeInsets.symmetric(vertical: 8),
                            ),
                            maxLength: 30,
                            buildCounter: (context, {required int currentLength, required bool isFocused, required int? maxLength}) => null,
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.check, color: Colors.green),
                          onPressed: _saveName,
                        ),
                        IconButton(
                          icon: Icon(Icons.close, color: Colors.red),
                          onPressed: () {
                            setState(() {
                              _isEditingName = false;
                            });
                          },
                        ),
                      ],
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(width: 40), // Spacer to offset pencil icon
                        Text(
                          displayName,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(width: 8),
                        IconButton(
                          icon: Icon(Icons.edit, size: 18, color: Theme.of(context).colorScheme.onSurfaceVariant),
                          onPressed: () {
                            setState(() {
                              _isEditingName = true;
                            });
                          },
                        ),
                      ],
                    ),

              Text(
                isResident 
                    ? 'Flat ${authState.flatId ?? "Unknown"} • Resident' 
                    : 'Assigned Category: ${authState.category ?? "None"} • Worker', 
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)
              ),
              SizedBox(height: 32),
              const Divider(),
              SizedBox(height: 12),

              // Links list
              _buildMenuItem(
                icon: Icons.menu_book_outlined,
                title: 'profile.user_guide'.tr(),
                onTap: () => context.push('/user-guide'),
              ),
              _buildMenuItem(
                icon: Icons.help_outline,
                title: 'profile.support'.tr(),
                onTap: () => context.push('/help-support'),
              ),
              _buildMenuItem(
                icon: Icons.security,
                title: 'profile.privacy'.tr(),
                onTap: () => context.push('/privacy-policy'),
              ),
              
              SizedBox(height: 12),
              _buildLanguageToggle(),
              SizedBox(height: 12),
              _buildThemeToggle(),
              
              SizedBox(height: 32),
              
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.colorScheme.error,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () {
                    ref.read(authProvider.notifier).logout();
                  },
                  child: Text(
                    'profile.logout'.tr(),
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildThemeToggle() {
    final themeMode = ref.watch(themeProvider);
    
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 24),
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Theme.of(context).colorScheme.surfaceContainerHighest),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(Icons.brightness_6_outlined, color: const Color(0xFF64748B)),
                SizedBox(width: 16),
                Text('profile.app_theme'.tr(), style: TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
              ],
            ),
            SegmentedButton<ThemeMode>(
              segments: const [
                ButtonSegment(value: ThemeMode.light, icon: Icon(Icons.light_mode)),
                ButtonSegment(value: ThemeMode.system, icon: Icon(Icons.brightness_auto)),
                ButtonSegment(value: ThemeMode.dark, icon: Icon(Icons.dark_mode)),
              ],
              selected: {themeMode},
              onSelectionChanged: (Set<ThemeMode> newSelection) {
                ref.read(themeProvider.notifier).setTheme(newSelection.first);
              },
              style: SegmentedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              showSelectedIcon: false,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLanguageToggle() {
    final locale = context.locale.languageCode;
    
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 24),
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Theme.of(context).colorScheme.surfaceContainerHighest),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(Icons.language, color: const Color(0xFF64748B)),
                SizedBox(width: 16),
                Text('profile.language_settings'.tr(), style: TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
              ],
            ),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'en', label: Text('EN')),
                ButtonSegment(value: 'hi', label: Text('HI')),
              ],
              selected: {locale},
              onSelectionChanged: (Set<String> newSelection) {
                context.setLocale(Locale(newSelection.first));
              },
              style: SegmentedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              showSelectedIcon: false,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Theme.of(context).colorScheme.surfaceContainerHighest),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFF64748B)),
        title: Text(
          title,
          style: TextStyle(fontWeight: FontWeight.w500),
        ),
        trailing: Icon(Icons.chevron_right, size: 20),
        onTap: onTap,
      ),
    );
  }
}
