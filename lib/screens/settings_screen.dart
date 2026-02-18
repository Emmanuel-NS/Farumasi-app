import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'security_screen.dart';
import 'data_privacy_screen.dart';
import 'transparency_permissions_screen.dart';
import 'terms_conditions_screen.dart';
import 'help_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  // Notification Preferences
  Map<String, bool> _notificationCategories = {
    'orders': true,
    'health_tips': true,
    'promotions': false,
    'app_updates': true,
    'reminders': true,
  };

  Map<String, bool> _notificationChannels = {
    'push': true,
    'email': true,
    'sms': false,
    'whatsapp': false,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        children: [
          _buildHeader("Notifications & Updates"),
          
          Container(
            color: Colors.white,
            child: Column(
              children: [
                _buildChannelSection(),
                const Divider(height: 1, indent: 16),
                _buildCategorySection(),
              ],
            ),
          ),
          
          const SizedBox(height: 20),
          _buildHeader("Account Security"),
          Container(
            color: Colors.white,
            child: Column(
              children: [
                 ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.security, color: Colors.green),
                  ),
                  title: const Text('Security Center'),
                   subtitle: const Text('2FA, Biometrics, Login history'),
                   trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                   onTap: () {
                     Navigator.push(context, MaterialPageRoute(builder: (c) => const SecurityScreen()));
                   },
                 ),
                 const Divider(height: 1, indent: 64),
                 ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.privacy_tip, color: Colors.indigo),
                  ),
                  title: const Text('Data Privacy'),
                   subtitle: const Text('Manage data, permissions & passcode'),
                   trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                   onTap: () {
                     Navigator.push(context, MaterialPageRoute(builder: (c) => const DataPrivacyScreen()));
                   },
                 ),
              ],
            ),
          ),

          const SizedBox(height: 20),
          _buildHeader("Transparency & Control"),
          Container(
            color: Colors.white,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.verified_user, color: Colors.blue),
                  title: const Text('Permissions & Policies'),
                  subtitle: const Text('Pharmacists, Delivery, Data Management'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(builder: (c) => const TransparencyPermissionsScreen()));
                  },
                ),
                const Divider(height: 1, indent: 64),
                ListTile(
                  leading: const Icon(Icons.description, color: Colors.blue), 
                  title: const Text('Terms & Conditions'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                  onTap: () {
                     Navigator.push(context, MaterialPageRoute(builder: (c) => const TermsConditionsScreen()));
                  },
                ),
                const Divider(height: 1, indent: 64),
                ListTile(
                  leading: const Icon(Icons.help_outline, color: Colors.blue),
                  title: const Text('Help & Support'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                  onTap: () {
                     Navigator.push(context, MaterialPageRoute(builder: (c) => const HelpScreen()));
                  },
                ),
                 const Divider(height: 1, indent: 64),
                ListTile(
                  leading: const Icon(Icons.info_outline, color: Colors.blue), // Changed icon
                  title: const Text('About App'),
                  subtitle: const Text('Version 1.0.0'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                  onTap: () {
                     showAboutDialog(
                      context: context,
                      applicationName: 'Farumasi App',
                      applicationVersion: '1.0.0',
                      applicationIcon: const Icon(Icons.local_pharmacy, size: 50, color: Colors.green),
                      children: [
                        const Text("Farumasi App connects you with trusted pharmacies and doctors for seamless healthcare delivery."),
                      ]
                    );
                  },
                ),
              ],
            ),
          ),

           const SizedBox(height: 20),
           _buildHeader("Preferences"),
           Container(
            color: Colors.white,
            child: Column(
              children: [
                 ListTile(
                  leading: const Icon(Icons.language, color: Colors.grey),
                  title: const Text('Language'),
                   trailing: DropdownButtonHideUnderline(
                     child: DropdownButton<String>(
                       value: 'en',
                       items: const [
                         DropdownMenuItem(value: 'en', child: Text("English")),
                         DropdownMenuItem(value: 'fr', child: Text("Français")),
                         DropdownMenuItem(value: 'rw', child: Text("Kinyarwanda")),
                       ], 
                       onChanged: (v) {},
                       style: const TextStyle(color: Colors.black87, fontSize: 14),
                     ),
                   ),
                 ),
                 const Divider(height: 1, indent: 16),
                 ListTile(
                  leading: const Icon(Icons.dark_mode_outlined, color: Colors.grey),
                  title: const Text('Theme'),
                   trailing: Text("System Default", style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
                   onTap: () {},
                 ),
              ],
            ),
           ),
           const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildChannelSection() {
    return ExpansionTile(
      leading: const Icon(Icons.notifications_active_outlined, color: Colors.blue),
      title: const Text("Where to reach you"),
      subtitle: Text(_getEnabledChannels(), maxLines: 1, overflow: TextOverflow.ellipsis),
      children: _notificationChannels.keys.map((key) {
        return SwitchListTile(
          title: Text(_formatKey(key)),
          value: _notificationChannels[key]!,
          activeColor: Colors.green,
          dense: true,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          onChanged: (val) {
             setState(() => _notificationChannels[key] = val);
          },
        );
      }).toList(),
    );
  }

  Widget _buildCategorySection() {
    return ExpansionTile(
      leading: const Icon(Icons.category_outlined, color: Colors.orange),
      title: const Text("What to notify you about"),
      subtitle: const Text("Customize your content"),
      initiallyExpanded: true,
      children: [
        _buildSwitch("Order Updates", "Tracking, delivery status, receipts", 'orders'),
        _buildSwitch("Health Tips", "Daily remedies, wellness advice", 'health_tips'),
        _buildSwitch("Reminders", "Medication schedules, refill alerts", 'reminders'),
        _buildSwitch("Promotions", "Discounts, deals, flash sales", 'promotions'),
        _buildSwitch("Did You Know?", "Fun medical facts & trivia", 'app_updates'),
      ],
    );
  }

  Widget _buildSwitch(String title, String subtitle, String key) {
    return SwitchListTile(
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
      subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
      value: _notificationCategories[key] ?? false,
      activeColor: Colors.green,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      onChanged: (val) {
        setState(() => _notificationCategories[key] = val);
      },
    );
  }

  void _showTermsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Terms & Conditions"),
        content: SizedBox(
          height: 300,
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildTermsSection("1. Service Usage", "By using this app, you agree to provide accurate medical information and abide by our community guidelines."),
                const SizedBox(height: 12),
                _buildTermsSection("2. User Accounts", "You are responsible for maintaining the confidentiality of your account password."),
                const SizedBox(height: 12),
                _buildTermsSection("3. Medical Disclaimer", "This app is not a substitute for professional medical advice, diagnosis, or treatment."),
                 const SizedBox(height: 12),
                _buildTermsSection("4. Liability", "We connect you to partners but are not liable for the independent actions of pharmacies or delivery personnel."),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Close")),
        ],
      ),
    );
  }

  Widget _buildTermsSection(String title, String content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(content, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
      ],
    );
  }

  void _showHelpDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Help & Support"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              leading: const Icon(Icons.email, color: Colors.green),
              title: const Text("Contact Support"),
              subtitle: const Text("support@farumasi.rw"),
              contentPadding: EdgeInsets.zero,
              onTap: () {}, // Launch email
            ),
            ListTile(
              leading: const Icon(Icons.phone, color: Colors.green),
              title: const Text("Call Center"),
              subtitle: const Text("+250 788 000 000"),
              contentPadding: EdgeInsets.zero,
              onTap: () {}, // Launch dialer
            ),
             const SizedBox(height: 8),
            const Text("FAQs", style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
             Text("• How do I reset my PIN?\n• Can I change my pharmacist?\n• Where is my order?", style: TextStyle(color: Colors.grey.shade700, height: 1.5)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Close")),
        ],
      ),
    );
  }

  Widget _buildHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          color: Colors.grey.shade600,
          fontWeight: FontWeight.bold,
          fontSize: 12,
          letterSpacing: 1.0,
        ),
      ),
    );
  }

  String _formatKey(String key) {
    switch(key) {
      case 'push': return "Push Notifications";
      case 'email': return "Email";
      case 'sms': return "SMS Text Message";
      case 'whatsapp': return "WhatsApp";
      default: return key;
    }
  }

  String _getEnabledChannels() {
    final enabled = _notificationChannels.entries.where((e) => e.value).map((e) => _formatKey(e.key)).toList();
    if (enabled.isEmpty) return "None";
    if (enabled.length == _notificationChannels.length) return "All Channels";
    return enabled.join(", ");
  }
}
