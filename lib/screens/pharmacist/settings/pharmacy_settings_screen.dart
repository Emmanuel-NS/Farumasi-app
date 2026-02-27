import 'package:flutter/material.dart';

class PharmacySettingsScreen extends StatefulWidget {
  const PharmacySettingsScreen({super.key});

  @override
  State<PharmacySettingsScreen> createState() => _PharmacySettingsScreenState();
}

class _PharmacySettingsScreenState extends State<PharmacySettingsScreen> {
  // Mock settings values
  bool _autoAssignOrders = true;
  bool _smsAlerts = false;
  bool _pushNotifications = true;
  bool _afterHoursEnabled = false;
  double _operatingCapacity = 150;
  String _selectedTheme = "System Default";
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Pharmacy Settings", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black87),
        actions: [
          TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Settings Saved.")));
              Navigator.pop(context);
            },
            child: const Text("Save", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
          )
        ],
      ),
      backgroundColor: Colors.grey.shade50,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSectionHeader("Order Management"),
          SwitchListTile(
               title: const Text("Auto-assign New Prescriptions", style: TextStyle(fontWeight: FontWeight.w600)),
               subtitle: const Text("Automatically assign orders matching your license schedule."),
               value: _autoAssignOrders,
               onChanged: (val) => setState(() => _autoAssignOrders = val),
               activeColor: Colors.green,
          ),
          const Divider(),
          _buildSectionHeader("Notifications & Alerts"),
          SwitchListTile(
               title: const Text("Push Notifications", style: TextStyle(fontWeight: FontWeight.w600)),
               subtitle: const Text("App alerts for high priority reviews."),
               value: _pushNotifications,
               onChanged: (val) => setState(() => _pushNotifications = val),
               activeColor: Colors.green,
          ),
          SwitchListTile(
               title: const Text("SMS Fallback Alerts", style: TextStyle(fontWeight: FontWeight.w600)),
               subtitle: const Text("Send text messages for critical delays."),
               value: _smsAlerts,
               onChanged: (val) => setState(() => _smsAlerts = val),
               activeColor: Colors.green,
          ),
          const Divider(),
          _buildSectionHeader("Operational Limits"),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Daily Order Capacity Limit", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                    Text("${_operatingCapacity.toInt()} orders", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                  ],
                ),
                Slider(
                  value: _operatingCapacity,
                  min: 50,
                  max: 500,
                  divisions: 9,
                  activeColor: Colors.green,
                  onChanged: (val) => setState(() => _operatingCapacity = val),
                ),
                const Text("Set maximum daily dispensions to prevent queue overload.", style: TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
          SwitchListTile(
            title: const Text("Accept After-Hours Emergency Prescriptions", style: TextStyle(fontWeight: FontWeight.w600)),
            value: _afterHoursEnabled,
            onChanged: (val) => setState(() => _afterHoursEnabled = val),
            activeColor: Colors.red,
          ),
          const Divider(),
          _buildSectionHeader("System Preferences"),
          ListTile(
            title: const Text("App Theme", style: TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(_selectedTheme),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () {
               // Show dialog to choose theme
            },
          ),
          const Divider(),
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton(
               onPressed: () {
                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Factory Defaults Restored.")));
               },
               style: OutlinedButton.styleFrom(
                   foregroundColor: Colors.red,
                   side: const BorderSide(color: Colors.red, width: 1.5),
                   padding: const EdgeInsets.all(16),
                   shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
               ),
               child: const Text("Reset to Factory Defaults", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
          const SizedBox(height: 30),
        ],
      )
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 16, top: 16, bottom: 8),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          color: Colors.grey.shade700,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
          fontSize: 12,
        ),
      ),
    );
  }
}
