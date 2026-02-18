import 'package:flutter/material.dart';

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  bool _twoFactorEnabled = true;
  bool _biometricEnabled = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Security Center'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        children: [
          _buildAlertBanner(),
          const SizedBox(height: 16),
          _buildSectionHeader('Account Protection'),
          SwitchListTile(
            title: const Text('Two-Factor Authentication (2FA)'),
            subtitle: const Text('Extra layer of security for logins'),
            value: _twoFactorEnabled,
            activeColor: Colors.green,
            onChanged: (val) {
              setState(() => _twoFactorEnabled = val);
              // enhance: Show confirm dialog/enter code
            },
          ),
          SwitchListTile(
            title: const Text('Biometric Login'),
            subtitle: const Text('Use FaceID/Fingerprint'),
            value: _biometricEnabled,
            activeColor: Colors.green,
            onChanged: (val) {
              setState(() => _biometricEnabled = val);
              // enhance: Authenticate biometric
            },
          ),
          ListTile(
            title: const Text('Change Password'),
            subtitle: const Text('Last changed 3 months ago'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () {
              // Navigate to change password
            },
          ),
          
          const Divider(),
          _buildSectionHeader('Data Privacy (Health Data)'),
          ListTile(
            title: const Text('Data Encryption Status'),
            subtitle: const Text('Active (AES-256)'),
            leading: const Icon(Icons.lock, color: Colors.green),
            trailing: const Icon(Icons.check_circle, color: Colors.green),
          ),
          ListTile(
            title: const Text('Manage Permissions'),
            subtitle: const Text('Review app access to camera, location'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () {
              // Open app settings
            },
          ),
           ListTile(
            title: const Text('Download My Data'),
            subtitle: const Text('Request copy of your medical history'),
            trailing: const Icon(Icons.download),
            onTap: () {
              // Request data export
            },
          ),

          const Divider(),
          _buildSectionHeader('Device Management'),
          ListTile(
            title: const Text('Active Sessions'),
            subtitle: const Text('Samsung S21 (Current) • Kigali, RW'),
            trailing: const Text('Log out all', style: TextStyle(color: Colors.red)),
            onTap: () {
              // Log out other sessions
            },
          ),

          const Divider(),
          _buildSectionHeader('Transparency & Community'),
          ListTile(
            leading: const Icon(Icons.policy, color: Colors.blueGrey),
            title: const Text('How We Manage Data'),
            subtitle: const Text('Retention, sharing, and ownership policies'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () => _showPolicyDialog(
              context, 
              'Data Management Policy',
              'We believe your health data belongs to you.\n\n'
              '• **Storage**: Your data is stored on secure, HIPAA-compliant servers.\n'
              '• **Access**: Only you and doctors you explicitly authorize can view your records.\n'
              '• **Retention**: We keep your records as long as your account is active, or as required by medical law.\n'
              '• **Sharing**: We never sell your personal data to advertisers. Anonymized stats may be used for research only if you opt-in.'
            ),
          ),
          ListTile(
            leading: const Icon(Icons.shield_outlined, color: Colors.blueGrey),
            title: const Text('Security Standards'),
            subtitle: const Text('Encryption and infrastructure details'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () => _showPolicyDialog(
              context,
              'Security Infrastructure',
              'Your safety is our top priority.\n\n'
              '• **Encryption**: All data is encrypted at rest using AES-256 and in transit using TLS 1.3.\n'
              '• **Audits**: Our systems undergo quarterly third-party security audits.\n'
              '• **Monitoring**: 24/7 threat detection systems are in place to prevent unauthorized access.\n'
              '• **Compliance**: We adhere to local data protection laws and international standards.'
            ),
          ),
          ListTile(
            leading: const Icon(Icons.handshake, color: Colors.blueGrey),
            title: const Text('Code of Conduct'),
            subtitle: const Text('Community guidelines and expectations'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () => _showPolicyDialog(
              context,
              'Community Code of Conduct',
              'To ensure a safe environment for everyone:\n\n'
              '1. **Respect**: Treat all pharmacists, doctors, and support staff with dignity.\n'
              '2. **Honesty**: Provide accurate medical history to ensure safe prescriptions.\n'
              '3. **Zero Tolerance**: Harassment, abuse, or fraudulent activity will result in immediate account suspension.\n'
              '4. **Safety**: Do not use this app for emergency situations; call emergency services immediately.'
            ),
          ),
          
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: () {
                // Show delete confirmation
                showDialog(
                  context: context, 
                  builder: (ctx) => AlertDialog(
                    title: const Text("Delete Account"),
                    content: const Text("Are you sure you want to delete your account? This action is permanent and cannot be undone. All your health data will be erased."),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
                      TextButton(
                        onPressed: () {
                          // Perform delete API call
                          Navigator.pop(ctx);
                          Navigator.pop(context); // Go back to settings/login
                        }, 
                        child: const Text("Delete", style: TextStyle(color: Colors.red))
                      ),
                    ],
                  )
                );
              },
              icon: const Icon(Icons.delete_forever, color: Colors.red),
              label: const Text('Delete Account', style: TextStyle(color: Colors.red)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.red),
                padding: const EdgeInsets.all(16),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _showPolicyDialog(BuildContext context, String title, String content) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Container(
              height: 4,
              width: 40,
              margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(24),
                children: [
                  Text(
                    content,
                    style: const TextStyle(fontSize: 16, height: 1.6, color: Colors.black87),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 50),
                    ),
                    child: const Text('I Understand'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
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

  Widget _buildAlertBanner() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        border: Border.all(color: Colors.green),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: const [
          Icon(Icons.shield, color: Colors.green),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              "Your health data is encrypted and secured according to HIPAA/GDPR standards.",
              style: TextStyle(fontSize: 13, color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }
}
