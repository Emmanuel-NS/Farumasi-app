import 'package:flutter/material.dart';

enum ProviderType { pharmacist, pharmacy, deliverer }

class TransparencyPermissionsScreen extends StatefulWidget {
  const TransparencyPermissionsScreen({super.key});

  @override
  State<TransparencyPermissionsScreen> createState() => _TransparencyPermissionsScreenState();
}

class _TransparencyPermissionsScreenState extends State<TransparencyPermissionsScreen> {
  // Dummy Data
  final List<Map<String, dynamic>> _pharmacists = [
    {
      'id': '1', 
      'name': 'Dr. Sarah M.', 
      'role': 'Senior Pharmacist', 
      'status': 'allowed',
      'image': 'assets/images/doc1.png',
      'bio': 'Dr. Sarah has over 10 years of experience in clinical pharmacy. Specializes in pediatric care.',
      'qualifications': ['PharmD - University of Rwanda', 'Certified Pediatric Pharmacist'],
      // 'rating': 4.8 
    },
    {
      'id': '2', 
      'name': 'Dr. Jean K.', 
      'role': 'Clinical Pharmacist', 
      'status': 'allowed',
      'image': 'assets/images/doc2.png',
      'bio': 'Expert in diabetes management and medication therapy management.',
      'qualifications': ['BPharm', 'Certified Diabetes Educator'],
      // 'rating': 4.5
    },
    {
      'id': '3', 
      'name': 'Dr. Patrick U.', 
      'role': 'Consultant', 
      'status': 'blocked',
      'image': 'assets/images/doc3.png',
      'bio': 'Consultant pharmacist focused on geriatric medicine.',
      'qualifications': ['MPharm', 'Geriatric Care Specialist'],
      // 'rating': 3.9
    },
  ];

  final List<Map<String, dynamic>> _pharmacies = [
    {
      'id': '1', 
      'name': 'Kigali Life Pharma', 
      'location': 'Nyarugenge, KN 2 St', 
      'status': 'preferred',
      'image': 'assets/images/pharma1.png',
      'description': '24/7 Pharmacy with home delivery and consultation services.',
      'pharmacists': ['Dr. Alice', 'Dr. Bob'],
      // 'rating': 4.9
    }, 
    {
      'id': '2', 
      'name': 'HealthPlus Kimironko', 
      'location': 'Kimironko, KG 11 Ave', 
      'status': 'allowed',
      'image': 'assets/images/pharma2.png',
      'description': 'Community pharmacy focused on accessibility and affordability.',
      'pharmacists': ['Dr. Charlie'],
      // 'rating': 4.2
    },
    {
      'id': '3', 
      'name': 'City Center Meds', 
      'location': 'CBD, KN 4 Ave', 
      'status': 'blocked',
      'image': 'assets/images/pharma3.png',
      'description': 'Central location with a wide range of imported medicines.',
      'pharmacists': ['Dr. David', 'Dr. Eve'],
      // 'rating': 3.5
    },
  ];

  final List<Map<String, dynamic>> _deliverers = [
    {
      'id': '1', 
      'name': 'John UberMoto', 
      'vehicle': 'Motorbike (Red Yamaha)', 
      'plate': 'RAA 123A',
      'status': 'allowed',
      'image': 'assets/images/driver1.png',
      'bio': 'Fast and reliable delivery. 500+ successful deliveries.',
      'rating': 4.9
    },
    {
      'id': '2', 
      'name': 'Swift Delivery Co.', 
      'vehicle': 'Van (Toyota Hiace)', 
      'plate': 'RAB 456B',
      'status': 'preferred',
      'image': 'assets/images/driver2.png',
      'bio': 'Professional courier service for bulk or sensitive medical equipment.',
      'rating': 4.7
    },
    {
      'id': '3', 
      'name': 'Express Couriers', 
      'vehicle': 'Bike', 
      'plate': 'N/A',
      'status': 'blocked',
      'image': 'assets/images/driver3.png',
      'bio': 'Eco-friendly bicycle delivery for short distances.',
      'rating': 3.8
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transparency & Permissions'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        children: [
          _buildInfoBanner(),
          
          const SizedBox(height: 20),
          _buildSectionHeader('Transparency Policy'),
          _buildTransparencyItem(
            icon: Icons.policy,
            title: 'How We Manage Data',
            subtitle: 'Retention, sharing, and ownership policies',
            policyTitle: 'Data Management Policy',
            policyContent: 'We believe your health data belongs to you.\n\n'
              '• **Storage**: Your data is stored on secure, HIPAA-compliant servers.\n'
              '• **Access**: Only you and doctors you explicitly authorize can view your records.\n'
              '• **Retention**: We keep your records as long as your account is active, or as required by medical law.\n'
              '• **Sharing**: We never sell your personal data to advertisers. Anonymized stats may be used for research only if you opt-in.'
          ),
          _buildTransparencyItem(
            icon: Icons.shield_outlined,
            title: 'Security Standards',
            subtitle: 'Encryption and infrastructure details',
             policyTitle: 'Security Infrastructure',
             policyContent: 'Your safety is our top priority.\n\n'
              '• **Encryption**: All data is encrypted at rest using AES-256 and in transit using TLS 1.3.\n'
              '• **Audits**: Our systems undergo quarterly third-party security audits.\n'
              '• **Monitoring**: 24/7 threat detection systems are in place to prevent unauthorized access.\n'
              '• **Compliance**: We adhere to local data protection laws and international standards.'
          ),
          
          const Divider(height: 32),
          _buildSectionHeader('Provider Permissions'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              "Control specifically who can handle your prescriptions and data. Tap to view details and manage permissions.",
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
          ),
          
          ListTile(
            leading: const Icon(Icons.medical_services, color: Colors.blue),
            title: const Text('Our Pharmacists'),
            subtitle: const Text('Select who reviews your prescriptions'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () => _navigateToProviderList(context, "Pharmacists", _pharmacists, ProviderType.pharmacist),
          ),
          ListTile(
            leading: const Icon(Icons.store, color: Colors.orange),
            title: const Text('Partner Pharmacies'),
            subtitle: const Text('Choose pharmacies for your orders'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () => _navigateToProviderList(context, "Pharmacies", _pharmacies, ProviderType.pharmacy),
          ),
          ListTile(
            leading: const Icon(Icons.delivery_dining, color: Colors.purple),
            title: const Text('Delivery Partners'),
            subtitle: const Text('Manage who delivers your medicines'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () => _navigateToProviderList(context, "Delivery Partners", _deliverers, ProviderType.deliverer),
          ),
          
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  void _navigateToProviderList(BuildContext context, String title, List<Map<String, dynamic>> items, ProviderType type) {
    Navigator.push(
      context, 
      MaterialPageRoute(builder: (context) => ProviderListScreen(title: title, items: items, type: type))
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
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
      color: Colors.blue.shade50,
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, color: Colors.blue, size: 24),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Confidentiality Control", 
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                const SizedBox(height: 4),
                Text("You have the right to choose who sees your data. Tap a category below to see details and set permissions.",
                  style: TextStyle(fontSize: 12, color: Colors.blue.shade800)),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildTransparencyItem({
    required IconData icon, 
    required String title, 
    required String subtitle,
    required String policyTitle,
    required String policyContent,
  }) {
    return ListTile(
      leading: Icon(icon, color: Colors.blueGrey),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.arrow_forward_ios, size: 16),
      onTap: () => _showPolicyDialog(context, policyTitle, policyContent),
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
              height: 4, width: 40, margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
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
                  Text(content, style: const TextStyle(fontSize: 16, height: 1.6, color: Colors.black87)),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
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
}

class ProviderListScreen extends StatefulWidget {
  final String title;
  final List<Map<String, dynamic>> items;
  final ProviderType type;

  const ProviderListScreen({super.key, required this.title, required this.items, required this.type});

  @override
  State<ProviderListScreen> createState() => _ProviderListScreenState();
}

class _ProviderListScreenState extends State<ProviderListScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
      ),
      body: ListView.separated(
        itemCount: widget.items.length,
        separatorBuilder: (c, i) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final item = widget.items[index];
          return ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: CircleAvatar(
              radius: 24,
              backgroundColor: Colors.grey.shade200,
              child: Icon(_getIconForType(widget.type), color: Colors.grey),
            ),
            title: Text(item['name'], style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['role'] ?? item['location'] ?? item['vehicle'] ?? ''),
                const SizedBox(height: 4),
                _buildStatusBadge(item['status']),
              ],
            ),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (c) => ProviderDetailScreen(item: item, type: widget.type))
              );
              setState((){}); // Refresh to show new status
            },
          );
        },
      ),
    );
  }

  IconData _getIconForType(ProviderType type) {
    switch (type) {
      case ProviderType.pharmacist: return Icons.person;
      case ProviderType.pharmacy: return Icons.store;
      case ProviderType.deliverer: return Icons.local_shipping;
    }
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    String text;
    switch (status) {
      case 'preferred': color = Colors.green; text = 'Preferred'; break;
      case 'blocked': color = Colors.red; text = 'Blocked'; break;
      default: color = Colors.blueGrey; text = 'Allowed';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
      child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}

class ProviderDetailScreen extends StatefulWidget {
  final Map<String, dynamic> item;
  final ProviderType type;

  const ProviderDetailScreen({super.key, required this.item, required this.type});

  @override
  State<ProviderDetailScreen> createState() => _ProviderDetailScreenState();
}

class _ProviderDetailScreenState extends State<ProviderDetailScreen> {
  late String _currentStatus;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.item['status'];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Provider Details'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 20),
                  Center(
                    child: Column(
                      children: [
                        CircleAvatar(
                          radius: 50,
                          backgroundColor: Colors.grey.shade200,
                          child: Icon(_getIconForType(widget.type), size: 50, color: Colors.grey),
                        ),
                        const SizedBox(height: 16),
                        Text(widget.item['name'], style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                        Text(widget.item['role'] ?? widget.item['location'] ?? widget.item['vehicle'] ?? '', 
                          style: TextStyle(color: Colors.grey.shade600)),
                        const SizedBox(height: 8),
                        if (widget.type == ProviderType.deliverer)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.star, color: Colors.amber, size: 18),
                              Text(" ${widget.item['rating']} Rating", style: const TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          )
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildDetailSection("About", widget.item['bio'] ?? widget.item['description'] ?? 'No description available.'),
                        
                        if (widget.type == ProviderType.pharmacist) ...[
                          const SizedBox(height: 20),
                          _buildListDetailSection("Qualifications", widget.item['qualifications']),
                        ],

                        if (widget.type == ProviderType.pharmacy) ...[
                           const SizedBox(height: 20),
                          _buildDetailSection("Location", widget.item['location']),
                           const SizedBox(height: 20),
                          _buildListDetailSection("Available Pharmacists", widget.item['pharmacists']),
                        ],

                        if (widget.type == ProviderType.deliverer) ...[
                           const SizedBox(height: 20),
                          _buildDetailSection("Vehicle Details", "${widget.item['vehicle']}\nPlate: ${widget.item['plate']}"),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),
                  const Divider(),
                  
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Permission Settings", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        const Text("Decide how you want to interact with this provider.", style: TextStyle(color: Colors.grey)),
                        const SizedBox(height: 16),
                        
                        Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade200),
                            borderRadius: BorderRadius.circular(12)
                          ),
                          child: Column(
                            children: [
                              _buildRadioOption("allowed", "Allowed", "Can be assigned to you (Default)"),
                              const Divider(height: 1),
                              _buildRadioOption("preferred", "Preferred", "Prioritize this provider when available", color: Colors.green),
                              const Divider(height: 1),
                              _buildRadioOption("blocked", "Blocked (Never)", "Never assign this provider to me", color: Colors.red),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -5))]
            ),
            child: ElevatedButton(
              onPressed: () {
                setState(() => widget.item['status'] = _currentStatus);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Permissions updated successfully"))
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text("Save Changes", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRadioOption(String value, String title, String subtitle, {Color? color}) {
    return RadioListTile<String>(
      value: value, 
      groupValue: _currentStatus, 
      onChanged: (val) => setState(() => _currentStatus = val!),
      title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      activeColor: color ?? Colors.blue,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }

  Widget _buildDetailSection(String title, String content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title.toUpperCase(), style: TextStyle(color: Colors.grey.shade500, fontWeight: FontWeight.bold, fontSize: 12)),
        const SizedBox(height: 8),
        Text(content, style: const TextStyle(fontSize: 15, height: 1.5, color: Colors.black87)),
      ],
    );
  }

  Widget _buildListDetailSection(String title, List<dynamic>? items) {
    if (items == null) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title.toUpperCase(), style: TextStyle(color: Colors.grey.shade500, fontWeight: FontWeight.bold, fontSize: 12)),
        const SizedBox(height: 8),
        ...items.map((item) => Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            children: [
              const Icon(Icons.check_circle_outline, size: 16, color: Colors.green),
              const SizedBox(width: 8),
              Text(item.toString(), style: const TextStyle(fontSize: 15)),
            ],
          ),
        )).toList(),
      ],
    );
  }

  IconData _getIconForType(ProviderType type) {
    switch (type) {
      case ProviderType.pharmacist: return Icons.person;
      case ProviderType.pharmacy: return Icons.store;
      case ProviderType.deliverer: return Icons.local_shipping;
    }
  }
}
