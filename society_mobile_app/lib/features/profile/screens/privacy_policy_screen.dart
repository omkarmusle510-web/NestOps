import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text('Privacy Policy'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Privacy Policy',
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.primary,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Last updated: June 24, 2026',
              style: theme.textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            SizedBox(height: 24),
            _buildSection(
              theme,
              '1. Information We Collect',
              'We collect various types of information to provide and improve our services to all society residents:\n\n'
              '• Profile Information: Name, phone number, flat number, role (resident, worker, admin), and profile picture (if uploaded).\n'
              '• Device Information: Device ID, operating system version, and app version for push notifications and troubleshooting.\n'
              '• Usage Data: Information on how you interact with the app, including login timestamps, screen visits, and feature usage.\n'
              '• Society Activities: Complaint details, feedback notes, community hall booking logs, and visitor approval/rejection histories.\n'
              '• Communications: Records of chat messages with admins and feedback submitted through the help and support channel.\n'
              '• Device Permissions: Camera and gallery access (used exclusively for profile pictures, attaching photos to complaints, and chat media).',
            ),
            SizedBox(height: 20),
            _buildSection(
              theme,
              '2. How We Use Information',
              'The information collected is strictly utilized for society management purposes:\n\n'
              '• Authentication & Security: To verify your identity as an authorized resident or worker and protect against unauthorized access.\n'
              '• Operations Management: For handling complaints, tracking maintenance worker assignments, and managing community hall bookings.\n'
              '• Notifications & Alerts: To notify you regarding gate visitor arrivals, package deliveries, administrative notices, and emergency escalations.\n'
              '• Community Interaction: To display basic profile cards to the admin and committee members to ensure community safety.\n'
              '• Improvement of Services: To analyze application performance, fix software bugs, and improve the user experience.',
            ),
            SizedBox(height: 20),
            _buildSection(
              theme,
              '3. Information Sharing & Disclosure',
              'We respect your privacy. Your personal information is not sold to third-party services. However, information may be shared in the following scenarios:\n\n'
              '• Within the Society: Essential details (name, flat number) are visible to society guards for visitor verification and to admins for record-keeping.\n'
              '• Maintenance Workers: Only relevant complaint details (flat number, issue description, attached photos) are shared with assigned workers.\n'
              '• Legal Requirements: We may disclose your information if required to do so by law, court order, or governmental request.',
            ),
            SizedBox(height: 20),
            _buildSection(
              theme,
              '4. Data Storage & Security',
              'We prioritize the security of your data using industry-standard protocols:\n\n'
              '• All data is securely stored on Google Firebase infrastructure (Firebase Auth, Cloud Firestore, Firebase Storage).\n'
              '• Access is restricted using role-based security rules (Residents, Workers, Guards, and Admins). You cannot access data belonging to other flats unless explicitly authorized.\n'
              '• All communications, including support chats and complaint notes, are encrypted in transit using SSL/TLS.',
            ),
            SizedBox(height: 20),
            _buildSection(
              theme,
              '5. Data Retention & Deletion',
              'Your data is retained as long as you are an active member of the society. Upon moving out, the society admin will deactivate your account. You have the right to request the deletion of your personal data by contacting the management committee. Please note that certain records (like past maintenance logs and ledger entries) may be retained for administrative and legal compliance.',
            ),
            SizedBox(height: 20),
            _buildSection(
              theme,
              '6. Contact Us',
              'If you have any questions, concerns, or suggestions regarding this Privacy Policy, or if you wish to exercise your data rights, please contact the Society Office at support@society.app or reach out to us via the in-app Support Chat.',
            ),
            SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(ThemeData theme, String title, String body) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: const Color(0xDD000000),
          ),
        ),
        SizedBox(height: 8),
        Text(
          body,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: const Color(0x8A000000),
            height: 1.5,
          ),
        ),
      ],
    );
  }
}
