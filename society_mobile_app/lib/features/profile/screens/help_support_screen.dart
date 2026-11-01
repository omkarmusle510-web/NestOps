import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'support_chat_screen.dart';

class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  Future<void> _makeCall(String phoneNumber) async {
    final Uri url = Uri.parse('tel:$phoneNumber');
    try {
      if (await launchUrl(url)) {
        // Success
      } else {
        throw 'Could not launch $phoneNumber';
      }
    } catch (_) {
      // Fail silently or show dialog
    }
  }

  Future<void> _sendEmail(String emailAddress) async {
    final Uri url = Uri.parse('mailto:$emailAddress?subject=Society App Support');
    try {
      if (await launchUrl(url)) {
        // Success
      } else {
        throw 'Could not email $emailAddress';
      }
    } catch (_) {
      // Fail silently
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text('Help & Support'),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'How can we help you?',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                ),
                textAlign: TextAlign.start,
              ),
              SizedBox(height: 8),
              Text(
                'Find answers to popular questions or get in touch with our management committee.',
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                textAlign: TextAlign.start,
              ),
              SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  // Navigate to support chat
                  // Assuming using go_router
                  // context.push('/support-chat'); // We will add this route to go_router later
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SupportChatScreen()));
                },
                icon: Icon(Icons.chat_bubble_outline),
                label: Text('Chat with Admin'),
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              SizedBox(height: 32),
              Text(
                'Frequently Asked Questions',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.textTheme.bodyLarge?.color,
                ),
                textAlign: TextAlign.start,
              ),
              SizedBox(height: 12),
              _buildFaqTile(
                theme,
                'My notifications are not appearing when the screen is off',
                'Please ensure you have granted background activity permissions for the app. '
                'Go to Android Settings -> Apps -> Society App -> Battery -> set to "Unrestricted". '
                'Also turn on "Allow notifications" and check that "Importance" is set to Urgent/Max.',
              ),
              _buildFaqTile(
                theme,
                'How can I update my flat phone numbers?',
                'Only the society administrator can register or update default phone numbers for flats. '
                'Please contact the main office desk using the email or phone listed below to add new members.',
              ),
              _buildFaqTile(
                theme,
                'How long does a hall booking approval take?',
                'Community hall requests are reviewed by the resident welfare committee within 24 to 48 hours. '
                'You will receive an update in the app once approved or rejected.',
              ),
              _buildFaqTile(
                theme,
                'A worker hasn\'t acknowledged my urgent complaint',
                'Emergency complaints have a 15-minute acknowledgment window. '
                'If a worker does not accept it within 15 minutes, the system auto-escalates it to the admin committee and alerts them directly.',
              ),
              _buildFaqTile(
                theme,
                'Can I register multiple vehicles?',
                'Yes, residents can add up to 2 vehicles (cars/bikes) per flat without extra charges. For additional parking slots, please reach out to the admin for availability and pricing.',
              ),
              _buildFaqTile(
                theme,
                'How are maintenance bills calculated?',
                'Maintenance bills are based on flat square footage. A standard rate is set during the annual general meeting. Any surplus is transferred to the sinking fund for future renovations.',
              ),
              SizedBox(height: 32),
              Text(
                'Contact Admin Office',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.textTheme.bodyLarge?.color,
                ),
                textAlign: TextAlign.start,
              ),
              SizedBox(height: 12),
              Card(
                elevation: 1,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(Icons.phone_outlined, color: theme.colorScheme.primary),
                          SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('+91 98765 43210', style: TextStyle(fontWeight: FontWeight.bold)),
                                Text('Monday to Saturday • 9 AM - 6 PM', style: TextStyle(fontSize: 12, color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7))),
                              ],
                            ),
                          ),
                          SizedBox(width: 8),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              minimumSize: const Size(80, 40),
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                            ),
                            onPressed: () => _makeCall('+919876543210'),
                            child: Text('Call'),
                          ),
                        ],
                      ),
                      const Divider(height: 32),
                      Row(
                        children: [
                          Icon(Icons.email_outlined, color: theme.colorScheme.primary),
                          SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('admin@society.app', style: TextStyle(fontWeight: FontWeight.bold)),
                                Text('Typically replies within 4 hours', style: TextStyle(fontSize: 12, color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7))),
                              ],
                            ),
                          ),
                          SizedBox(width: 8),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              minimumSize: const Size(80, 40),
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                            ),
                            onPressed: () => _sendEmail('admin@society.app'),
                            child: Text('Email'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFaqTile(ThemeData theme, String question, String answer) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: theme.dividerColor.withOpacity(0.1)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ExpansionTile(
        title: Text(
          question,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: theme.textTheme.bodyLarge?.color,
          ),
        ),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        expandedAlignment: Alignment.topLeft,
        children: [
          Text(
            answer,
            style: TextStyle(
              fontSize: 13,
              color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7),
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
