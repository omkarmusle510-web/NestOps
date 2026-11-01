import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../../monsoonproof/data/demo_seed.dart';

class InviteCodeScreen extends ConsumerStatefulWidget {
  const InviteCodeScreen({super.key});

  @override
  ConsumerState<InviteCodeScreen> createState() => _InviteCodeScreenState();
}

class _InviteCodeScreenState extends ConsumerState<InviteCodeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _inviteController = TextEditingController();
  final _flatController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _inviteController.dispose();
    _flatController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _onSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final authNotifier = ref.read(authProvider.notifier);

    final success = await authNotifier.submitInviteDetails(
      name: _nameController.text.trim(),
      flatNumber: _flatController.text.trim(),
      phone: _phoneController.text.trim(),
      inviteCode: _inviteController.text.trim(),
    );

    if (mounted) {
      if (success) {
        context.go('/');
      } else {
        final error = ref.read(authProvider).errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? 'Failed to verify invite code'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  void _enterDemo(DemoPersona persona) {
    ref.read(authProvider.notifier).loginAsDemoPersona(
          userId: persona.id,
          name: persona.name,
          role: persona.role,
          societyId: persona.societyId,
          societyName: persona.societyName,
          flatId: persona.flatId,
          category: persona.category,
        );
    context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    final isLoading = authState.status == AuthStatus.authenticating;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome to NestOps'),
        actions: [
          TextButton(
            onPressed: () => context.go('/login'),
            child: const Text('Worker Login'),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                Text('Join Your Society', style: theme.textTheme.headlineMedium),
                const SizedBox(height: 8),
                Text(
                  'Enter the invite details provided by your society administrator, or use Demo access below.',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),

                Text(
                  'Demo access',
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Tap a persona to explore NestOps without Firebase.',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                ...MonsoonProofDemoSeed.personas.map((persona) {
                  final subtitle = persona.role == 'worker'
                      ? 'Maintenance worker · drainage'
                      : '${persona.societyName} · ${persona.flatId}';
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.12),
                        child: Icon(
                          persona.role == 'worker' ? Icons.engineering : Icons.home_outlined,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      title: Text(persona.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(subtitle),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: isLoading ? null : () => _enterDemo(persona),
                    ),
                  );
                }),

                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(child: Divider(color: theme.dividerColor)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('Or sign in with invite', style: theme.textTheme.bodyMedium),
                    ),
                    Expanded(child: Divider(color: theme.dividerColor)),
                  ],
                ),
                const SizedBox(height: 20),

                TextFormField(
                  controller: _nameController,
                  enabled: !isLoading,
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration(
                    labelText: 'Full Name',
                    hintText: 'e.g., Asha Mehta',
                    prefixIcon: const Icon(Icons.person_outline_rounded),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your full name';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _flatController,
                  enabled: !isLoading,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Flat Number',
                    hintText: 'e.g., 1302',
                    prefixIcon: const Icon(Icons.apartment_rounded),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your flat number';
                    }
                    final cleanVal = value.trim();
                    if (cleanVal.length != 4 || int.tryParse(cleanVal) == null) {
                      return 'Must be a 4-digit number (e.g., 1302)';
                    }
                    final blockChar = cleanVal[0];
                    final flatNum = int.tryParse(cleanVal.substring(2));

                    if (blockChar != '1' && blockChar != '2') {
                      return 'Block must start with 1 (Block A) or 2 (Block B)';
                    }
                    if (flatNum == null || flatNum < 1 || flatNum > 4) {
                      return 'Flat number (last 2 digits) must be 01, 02, 03, or 04';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _phoneController,
                  enabled: !isLoading,
                  keyboardType: TextInputType.phone,
                  maxLength: 10,
                  decoration: InputDecoration(
                    labelText: 'Registered Phone Number',
                    hintText: '9876543210',
                    prefixIcon: const Icon(Icons.phone_rounded),
                    prefixText: '+91 ',
                    counterText: '',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your registered phone number';
                    }
                    final digits = value.trim().replaceAll(RegExp(r'\D'), '');
                    if (digits.length != 10) {
                      return 'Enter exactly 10 digits';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _inviteController,
                  enabled: !isLoading,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Invite Code',
                    hintText: 'Enter 6-digit code',
                    prefixIcon: const Icon(Icons.key_rounded),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter the invite code';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 32),

                ElevatedButton(
                  onPressed: isLoading ? null : _onSubmit,
                  child: isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text('Verify Invite'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
