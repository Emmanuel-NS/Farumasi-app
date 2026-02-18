import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'security_screen.dart';
import 'data_privacy_screen.dart';

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
