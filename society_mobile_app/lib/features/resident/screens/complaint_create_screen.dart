import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../complaints/providers/complaints_provider.dart';
import '../../complaints/models/complaint_model.dart';
import '../../worker/providers/worker_provider.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import '../../../core/services/storage_service.dart';

class ComplaintCreateScreen extends ConsumerStatefulWidget {
  const ComplaintCreateScreen({super.key});

  @override
  ConsumerState<ComplaintCreateScreen> createState() => _ComplaintCreateScreenState();
}

class _ComplaintCreateScreenState extends ConsumerState<ComplaintCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _customSlotController = TextEditingController();

  String _selectedCategory = 'electrical';
  String _selectedUrgency = 'low';
  String _selectedAvailability = 'anytime_today';

  File? _selectedImage;
  final ImagePicker _imagePicker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    final pickedFile = await _imagePicker.pickImage(source: source, imageQuality: 70, maxWidth: 1024, maxHeight: 1024);
    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
    }
  }

  // Ironing specifics
  int _shirtsCount = 0;
  int _trousersCount = 0;
  int _sareesCount = 0;
  int _othersCount = 0;

  final Map<String, double> _ironingRates = {
    'shirts': 10.0,
    'trousers': 15.0,
    'sarees': 25.0,
    'others': 10.0,
  };

  double get _ironingTotal => 
      (_shirtsCount * _ironingRates['shirts']!) +
      (_trousersCount * _ironingRates['trousers']!) +
      (_sareesCount * _ironingRates['sarees']!) +
      (_othersCount * _ironingRates['others']!);

  bool _isCheckingDuplicate = false;
  bool _hasDuplicate = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _checkDuplicate();
    _descriptionController.addListener(_onDescriptionChanged);
  }

  void _onDescriptionChanged() {
    final text = _descriptionController.text.toLowerCase();
    final emergencyKeywords = ['smoke', 'sparks', 'sparking', 'flood', 'flooding', 'gas', 'burning', 'fire', 'shock'];
    
    bool hasEmergencyKeyword = emergencyKeywords.any((keyword) => text.contains(keyword));
    
    if (hasEmergencyKeyword && _selectedUrgency != 'emergency') {
      setState(() {
        _selectedUrgency = 'emergency';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Emergency keywords detected. Urgency auto-set to Emergency.'),
          backgroundColor: AppTheme.emergencyColor,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _customSlotController.dispose();
    super.dispose();
  }

  void _checkDuplicate() async {
    final authState = ref.read(authProvider);
    final flatId = authState.flatId;
    if (flatId == null) return;

    setState(() {
      _isCheckingDuplicate = true;
    });

    final isDuplicate = await ref.read(complaintServiceProvider).checkDuplicateComplaint(
      flatId,
      _selectedCategory,
    );

    if (mounted) {
      setState(() {
        _hasDuplicate = isDuplicate;
        _isCheckingDuplicate = false;
      });
    }
  }

  void _submit() async {
    if (_selectedCategory != 'ironing' && !_formKey.currentState!.validate()) return;
    if (_selectedCategory == 'ironing' && _shirtsCount == 0 && _trousersCount == 0 && _sareesCount == 0 && _othersCount == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one cloth for ironing.'), backgroundColor: Colors.red),
      );
      return;
    }

    final authState = ref.read(authProvider);
    final flatId = authState.flatId;
    if (flatId == null) return;

    setState(() {
      _isSubmitting = true;
    });

    final now = DateTime.now().toIso8601String();
    
    // SLA Definitions based on urgency
    // Emergency: 15 mins, High: 12 hrs, Medium: 48 hrs, Low: 96 hrs (4 days)
    Duration slaDuration;
    switch (_selectedUrgency) {
      case 'emergency':
        slaDuration = const Duration(minutes: 15);
        break;
      case 'high':
        slaDuration = const Duration(hours: 12);
        break;
      case 'medium':
        slaDuration = const Duration(days: 2);
        break;
      default:
        slaDuration = const Duration(days: 4);
    }

    final slaDeadline = DateTime.now().add(slaDuration).toIso8601String();

    String? imageUrl;
    if (_selectedImage != null) {
      try {
        final storageService = ref.read(storageServiceProvider);
        final uniqueId = DateTime.now().millisecondsSinceEpoch.toString();
        imageUrl = await storageService.uploadImage(_selectedImage!, 'complaints', uniqueId);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Image upload failed: $e'), backgroundColor: Colors.red),
          );
        }
        setState(() {
          _isSubmitting = false;
        });
        return;
      }
    }

    final complaint = Complaint(
      id: '', // Will be assigned mock ID by service
      flatId: flatId,
      category: _selectedCategory,
      description: _descriptionController.text.trim(),
      urgency: _selectedUrgency,
      isEmergency: _selectedUrgency == 'emergency',
      status: 'submitted',
      availability: Availability(
        type: _selectedCategory == 'housekeeping' ? 'general_area' : _selectedAvailability,
        customSlot: (_selectedCategory != 'housekeeping' && _selectedAvailability == 'custom') 
            ? _customSlotController.text.trim() 
            : null,
      ),
      images: imageUrl != null ? [imageUrl] : [],
      ironingDetails: _selectedCategory == 'ironing' ? {
        'counts': {
          'shirts': _shirtsCount,
          'trousers': _trousersCount,
          'sarees': _sareesCount,
          'others': _othersCount,
        },
        'rates': _ironingRates,
        'totalCost': _ironingTotal,
        'countConfirmedByWorker': false,
        'paymentStatus': 'pending',
      } : null,
      timeline: [
        TimelineEvent(
          action: 'Complaint created',
          performedBy: authState.phone ?? 'Resident',
          role: 'resident',
          timestamp: now,
        ),
      ],
      slaDeadline: slaDeadline,
      createdAt: now,
      updatedAt: now,
    );

    final complaintId = await ref.read(complaintServiceProvider).submitComplaint(complaint);

    if (mounted) {
      context.go('/complaint-submitted?category=${Uri.encodeComponent(_selectedCategory)}&urgency=${Uri.encodeComponent(_selectedUrgency)}&id=${Uri.encodeComponent(complaintId)}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final workerUnavailableAsync = ref.watch(workerUnavailableStreamProvider(_selectedCategory));
    final isWorkerUnavailable = workerUnavailableAsync.maybeWhen(
      data: (val) => val,
      orElse: () => false,
    );
    
    return Scaffold(
      appBar: AppBar(
        title: Text('New Complaint'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category Selector
                Text('Category', style: theme.textTheme.titleLarge),
                SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: Text('Electrical', style: TextStyle(fontSize: 12)),
                      selected: _selectedCategory == 'electrical',
                      onSelected: (selected) {
                        if (selected) {
                          setState(() => _selectedCategory = 'electrical');
                          _checkDuplicate();
                        }
                      },
                    ),
                    ChoiceChip(
                      label: Text('Plumbing', style: TextStyle(fontSize: 12)),
                      selected: _selectedCategory == 'plumbing',
                      onSelected: (selected) {
                        if (selected) {
                          setState(() => _selectedCategory = 'plumbing');
                          _checkDuplicate();
                        }
                      },
                    ),
                    ChoiceChip(
                      label: Text('Housekeeping', style: TextStyle(fontSize: 12)),
                      selected: _selectedCategory == 'housekeeping',
                      onSelected: (selected) {
                        if (selected) {
                          setState(() {
                            _selectedCategory = 'housekeeping';
                            _selectedUrgency = 'low';
                          });
                          _checkDuplicate();
                        }
                      },
                    ),
                    ChoiceChip(
                      label: Text('Ironing', style: TextStyle(fontSize: 12)),
                      selected: _selectedCategory == 'ironing',
                      onSelected: (selected) {
                        if (selected) {
                          setState(() {
                            _selectedCategory = 'ironing';
                            _selectedUrgency = 'low';
                          });
                          _checkDuplicate();
                        }
                      },
                    ),
                  ],
                ),
                SizedBox(height: 20),

                // Housekeeping General Area Banner
                if (_selectedCategory == 'housekeeping')
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.withValues(alpha: 0.15),
                      border: Border.all(color: Colors.blue.shade700, width: 1.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline, color: Colors.blue.shade800),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Society Common Areas Only',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue.shade900,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Housekeeping requests are strictly for common areas (lobbies, corridors, gym, etc.). No visit time is required.',
                                style: TextStyle(fontSize: 13, height: 1.4),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                // Worker Unavailability Warning Banner
                if (isWorkerUnavailable)
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.15),
                      border: Border.all(color: Colors.amber.shade700, width: 1.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.warning_amber_rounded, color: Colors.amber.shade800),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Worker Currently Unavailable',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.amber.shade900,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'The worker for this category is currently on leave or paused. Delays in initial response or resolution may occur.',
                                style: TextStyle(fontSize: 13, height: 1.4),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                // Duplicate Warning Banner
                if (_isCheckingDuplicate)
                  const LinearProgressIndicator()
                else if (_hasDuplicate)
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.highPriorityColor.withValues(alpha: 0.15),
                      border: Border.all(color: AppTheme.highPriorityColor, width: 1.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.warning_amber_rounded, color: AppTheme.highPriorityColor),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Duplicate Warning',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.highPriorityColor,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'You already have an active, unresolved $_selectedCategory complaint for Flat ${ref.read(authProvider).flatId}. You can still proceed if this is a separate issue.',
                                style: TextStyle(fontSize: 13, height: 1.4),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                // Urgency Selector (Hidden for Housekeeping and Ironing)
                if (_selectedCategory != 'housekeeping' && _selectedCategory != 'ironing') ...[
                  Text('Urgency Level', style: theme.textTheme.titleLarge),
                  SizedBox(height: 12),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      ChoiceChip(
                        label: Text('Low'),
                        selected: _selectedUrgency == 'low',
                        selectedColor: AppTheme.lowPriorityColor.withValues(alpha: 0.25),
                        onSelected: (s) => s ? setState(() => _selectedUrgency = 'low') : null,
                      ),
                      ChoiceChip(
                        label: Text('Medium'),
                        selected: _selectedUrgency == 'medium',
                        selectedColor: AppTheme.mediumPriorityColor.withValues(alpha: 0.25),
                        onSelected: (s) => s ? setState(() => _selectedUrgency = 'medium') : null,
                      ),
                      ChoiceChip(
                        label: Text('High'),
                        selected: _selectedUrgency == 'high',
                        selectedColor: AppTheme.highPriorityColor.withValues(alpha: 0.25),
                        onSelected: (s) => s ? setState(() => _selectedUrgency = 'high') : null,
                      ),
                      ChoiceChip(
                        label: Text('Emergency'),
                        selected: _selectedUrgency == 'emergency',
                        selectedColor: AppTheme.emergencyColor.withValues(alpha: 0.25),
                        onSelected: (s) => s ? setState(() => _selectedUrgency = 'emergency') : null,
                      ),
                    ],
                  ),
                  
                  // Emergency Alert Warning
                  if (_selectedUrgency == 'emergency')
                    Container(
                      margin: const EdgeInsets.only(top: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.emergencyColor.withValues(alpha: 0.1),
                        border: Border.all(color: AppTheme.emergencyColor),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.report_problem, color: AppTheme.emergencyColor),
                          SizedBox(width: 12),
                          const Expanded(
                            child: Text(
                              'WARNING: Select Emergency only for dangerous events (e.g. fire hazard, major sparking, indoor flooding). Abuse may lead to admin flags.',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.emergencyColor,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  SizedBox(height: 24),
                ],

                // Description Input (or Cloth Counter for Ironing)
                if (_selectedCategory == 'ironing') ...[
                  Text('Clothes to Iron', style: theme.textTheme.titleLarge),
                  SizedBox(height: 12),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: Theme.of(context).colorScheme.surfaceContainerHighest),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        _buildCounterRow('Shirts (₹${_ironingRates['shirts']?.toInt()})', _shirtsCount, (v) => setState(() => _shirtsCount = v)),
                        const Divider(),
                        _buildCounterRow('Trousers (₹${_ironingRates['trousers']?.toInt()})', _trousersCount, (v) => setState(() => _trousersCount = v)),
                        const Divider(),
                        _buildCounterRow('Sarees (₹${_ironingRates['sarees']?.toInt()})', _sareesCount, (v) => setState(() => _sareesCount = v)),
                        const Divider(),
                        _buildCounterRow('Others (₹${_ironingRates['others']?.toInt()})', _othersCount, (v) => setState(() => _othersCount = v)),
                        SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Estimated Total:', style: theme.textTheme.titleMedium),
                              Text('₹${_ironingTotal.toStringAsFixed(0)}', style: theme.textTheme.titleMedium?.copyWith(
                                color: theme.colorScheme.primary,
                                fontWeight: FontWeight.bold,
                              )),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  Text('Describe the Issue', style: theme.textTheme.titleLarge),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: _descriptionController,
                    maxLines: 4,
                    maxLength: 500,
                    decoration: InputDecoration(
                      hintText: 'Provide details (minimum 10 characters)...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    validator: (value) {
                      if (_selectedCategory == 'ironing') return null; // skipped
                      if (value == null || value.trim().length < 10) {
                        return 'Description must be at least 10 characters long';
                      }
                      if (value.trim().length > 500) {
                        return 'Description cannot exceed 500 characters';
                      }
                      return null;
                    },
                  ),
                ],
                SizedBox(height: 20),

                // Availability Slots Selector (Hidden for Housekeeping)
                if (_selectedCategory != 'housekeeping') ...[
                  Text('Preferred Visit Time', style: theme.textTheme.titleLarge),
                  SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _selectedAvailability,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'anytime_today', child: Text('Anytime Today')),
                      DropdownMenuItem(value: 'morning', child: Text('Morning Slot (9 AM - 12 PM)')),
                      DropdownMenuItem(value: 'evening', child: Text('Evening Slot (4 PM - 7 PM)')),
                      DropdownMenuItem(value: 'custom', child: Text('Custom Time Slot')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedAvailability = val);
                    },
                  ),

                  // Custom Time Slot Input
                  if (_selectedAvailability == 'custom') ...[
                    SizedBox(height: 16),
                    TextFormField(
                      controller: _customSlotController,
                      decoration: InputDecoration(
                        labelText: 'Specify Custom Time Slot',
                        hintText: 'e.g., Sat 2 PM, Tomorrow after 5 PM',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      validator: (value) {
                        if (_selectedAvailability == 'custom' && (value == null || value.trim().isEmpty)) {
                          return 'Please specify your custom availability slot';
                        }
                        return null;
                      },
                    ),
                  ],
                ],

                SizedBox(height: 24),

                // Image Attachment Card
                Card(
                  elevation: 0,
                  color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Attach Image (Optional)',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 12),
                        if (_selectedImage != null) ...[
                          Stack(
                            alignment: Alignment.topRight,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.file(
                                  _selectedImage!,
                                  height: 200,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              IconButton(
                                icon: Icon(Icons.cancel, color: Colors.white),
                                onPressed: () => setState(() => _selectedImage = null),
                              ),
                            ],
                          ),
                          SizedBox(height: 12),
                        ],
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _pickImage(ImageSource.camera),
                                icon: Icon(Icons.camera_alt),
                                label: Text('Camera'),
                              ),
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _pickImage(ImageSource.gallery),
                                icon: Icon(Icons.photo_library),
                                label: Text('Gallery'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                SizedBox(height: 48),

                // Submit Button
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text('Submit Complaint'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCounterRow(String label, int value, Function(int) onChanged) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 16)),
        Row(
          children: [
            IconButton(
              icon: Icon(Icons.remove_circle_outline),
              onPressed: value > 0 ? () => onChanged(value - 1) : null,
              color: value > 0 ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            SizedBox(
              width: 30,
              child: Text(
                value.toString(),
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
            IconButton(
              icon: Icon(Icons.add_circle_outline),
              onPressed: () => onChanged(value + 1),
              color: Theme.of(context).colorScheme.primary,
            ),
          ],
        ),
      ],
    );
  }
}
