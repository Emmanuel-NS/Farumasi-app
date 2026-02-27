import 'package:flutter/material.dart';

class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Help & Support", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black87),
      ),
      backgroundColor: Colors.grey.shade50,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const ListTile(
            leading: Icon(Icons.help_outline, color: Colors.blue),
            title: Text("FAQ", style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text("Commonly asked questions and answers."),
            trailing: Icon(Icons.arrow_forward_ios, size: 16),
          ),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.support_agent, color: Colors.green),
            title: Text("Contact Support", style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text("Live chat or email the support team."),
            trailing: Icon(Icons.arrow_forward_ios, size: 16),
          ),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.local_hospital, color: Colors.red),
            title: Text("Emergency Protocol", style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text("What to do in case of a medical system failure."),
            trailing: Icon(Icons.arrow_forward_ios, size: 16),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.info_outline, color: Colors.grey),
            title: const Text("App Version", style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: const Text("v1.0.4 (Build 402) - Farumasi Admin"),
            trailing: Chip(label: const Text("Check Updates"), backgroundColor: Colors.blue.shade50),
          ),
        ],
      )
    );
  }
}

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Privacy Policy", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black87),
      ),
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text("Privacy & Security Compliance", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            SizedBox(height: 16),
            Text("Last Updated: October 2023", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
            SizedBox(height: 24),
            Text("1. Data Protection", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text("We ensure full encryption and compliance with international health data standards. All prescription and patient data is end-to-end encrypted.", style: TextStyle(height: 1.5, color: Colors.black87)),
            SizedBox(height: 24),
            Text("2. Log Retention", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text("System audit logs, including interactions by pharmacists and drivers, are retained for 5 years as required by the regulatory authorities. These are only decrytable by admins.", style: TextStyle(height: 1.5, color: Colors.black87)),
            SizedBox(height: 24),
            Text("3. Access Control", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text("Access to specific patients' medical files is restricted exclusively to pharmacists assigned to their active prescriptions. Location tracking data expires immediately upon successful order delivery.", style: TextStyle(height: 1.5, color: Colors.black87)),
          ],
        ),
      ),
    );
  }
}
