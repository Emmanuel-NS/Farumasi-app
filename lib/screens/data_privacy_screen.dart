import 'package:flutter/material.dart';

class DataPrivacyScreen extends StatefulWidget {
  const DataPrivacyScreen({super.key});

  @override
  State<DataPrivacyScreen> createState() => _DataPrivacyScreenState();
}

class _DataPrivacyScreenState extends State<DataPrivacyScreen> {
  // Privacy Settings State
  bool _requirePasscodeForOrders = false;
  bool _hideSensitiveConditions = true;
  bool _shareAnonymousAnalytics = true;
  bool _allowDoctorAccess = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Data Privacy'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        children: [
          _buildInfoBanner(),
          
          const SizedBox(height: 20),
          _buildSectionHeader("Access Control"),
          
          SwitchListTile(
            title: const Text('Lock Order History'),
            subtitle: const Text('Require passcode to view past medicines'),
            secondary: const Icon(Icons.lock_outline, color: Colors.indigo),
            value: _requirePasscodeForOrders,
            activeColor: Colors.green,
            onChanged: (val) {
              if (val) {
                _showSetupPasscodeDialog();
              } else {
                setState(() => _requirePasscodeForOrders = false);
              }
            },
          ),
          SwitchListTile(
            title: const Text('Hide Sensitive Conditions'),
            subtitle: const Text('Blur sensitive items in dashboard'),
            secondary: const Icon(Icons.visibility_off_outlined, color: Colors.indigo),
            value: _hideSensitiveConditions,
            activeColor: Colors.green,
            onChanged: (val) => setState(() => _hideSensitiveConditions = val),
          ),

          const Divider(),
          _buildSectionHeader("Usage & Analytics"),
          SwitchListTile(
            title: const Text('Share Analytics'),
            subtitle: const Text('Help us improve with anonymous usage data'),
            secondary: const Icon(Icons.analytics_outlined, color: Colors.orange),
            value: _shareAnonymousAnalytics,
            activeColor: Colors.green,
            onChanged: (val) => setState(() => _shareAnonymousAnalytics = val),
          ),

          const Divider(),
          _buildSectionHeader("Your Data Rights"),
           ListTile(
            title: const Text('Request Data Export'),
            subtitle: const Text('Get a copy of all your stored health data'),
            leading: const Icon(Icons.download_outlined, color: Colors.blueGrey),
            onTap: () {
               ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Export requested. You will receive an email shortly."))
              );
            },
          ),
          ListTile(
            title: const Text('Retention Policy'),
            subtitle: const Text('How long we keep your data'),
            leading: const Icon(Icons.history, color: Colors.blueGrey),
            onTap: () {
              // Show retention policy
            },
          ),
          
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: _confirmDeleteAccount,
              icon: const Icon(Icons.delete_forever, color: Colors.red),
              label: const Text('Delete My Account'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
                padding: const EdgeInsets.all(16),
              ),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.bold,
          color: Colors.grey.shade600,
        ),
      ),
    );
  }

  Widget _buildInfoBanner() {
    return Container(
      color: Colors.indigo.shade50,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          const Icon(Icons.verified_user_outlined, color: Colors.indigo, size: 32),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Your Privacy is Protected", 
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.indigo)),
                Text("We comply with HIPAA & GDPR standards to keep your health data safe.",
                  style: TextStyle(fontSize: 12, color: Colors.indigo.shade700)),
              ],
            ),
          )
        ],
      ),
    );
  }

  void _showSetupPasscodeDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Set Privacy Passcode"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text("Enter a 4-digit PIN to lock your order history."),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              obscureText: true,
              maxLength: 4,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: "0000",
                counterText: "",
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context), 
            child: const Text("Cancel")
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.length == 4) {
                setState(() => _requirePasscodeForOrders = true);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Passcode set successfully!"))
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text("Set PIN"),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteAccount() {
    showDialog(
      context: context, 
      builder: (ctx) => AlertDialog(
        title: const Text("Delete Account"),
        content: const Text("Are you sure? This will permanently erase your medical history and prescriptions."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          TextButton(
            onPressed: () {
              // Perform delete API call
              Navigator.pop(ctx);
              Navigator.pop(context); 
            }, 
            child: const Text("Delete Permanently", style: TextStyle(color: Colors.red))
          ),
        ],
      )
    );
  }
}
