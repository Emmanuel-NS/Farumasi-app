import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  final String _whatsappNumber = "+250790160172";
  final TextEditingController _searchController = TextEditingController();

  // FAQs Data (From new design)
  final List<_FaqItem> _allFaqs = [
    _FaqItem("Orders & Tracking", "Where is my order?", "You can track your order in real-time from the 'My Orders' tab in the main menu."),
    _FaqItem("Orders & Tracking", "Can I cancel my order?", "Orders can be cancelled within 10 minutes of placement. After that, please contact support."),
    _FaqItem("Orders & Tracking", "My delivery is delayed", "We apologize for the inconvenience. Heavy traffic or bad weather can cause delays."),
    _FaqItem("Payments", "How do I change my password?", "Go to Settings > Account Security > Change Password."),
    _FaqItem("Payments", "What payment methods are accepted?", "We accept MTN Mobile Money, Airtel Money, and Visa/Mastercard."),
    _FaqItem("Medical", "Can I speak to a doctor?", "Yes, use the 'Consultation' feature to book a call with a verified doctor."),
    _FaqItem("Medical", "How do I upload a prescription?", "When placing an order, tap 'Upload Prescription' and take a clear photo."),
  ];

  List<_FaqItem> _filteredFaqs = [];

  @override
  void initState() {
    super.initState();
    _filteredFaqs = _allFaqs;
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredFaqs = _allFaqs;
      } else {
        _filteredFaqs = _allFaqs.where((item) => 
          item.question.toLowerCase().contains(query) || 
          item.answer.toLowerCase().contains(query) ||
          item.category.toLowerCase().contains(query)
        ).toList();
      }
    });
  }

  Future<void> _launchWhatsApp(BuildContext context) async {
    final cleanNumber = _whatsappNumber.replaceAll(RegExp(r'[^\d+]'), '');
    final appUri = Uri.parse("whatsapp://send?phone=$cleanNumber&text=Hello! I need help with Farumasi.");
    final webUri = Uri.parse("https://wa.me/$cleanNumber?text=Hello! I need help with Farumasi.");

    try {
      if (await canLaunchUrl(appUri)) {
        await launchUrl(appUri, mode: LaunchMode.externalApplication);
      } else if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint("Could not launch WhatsApp: $e");
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Could not open WhatsApp. Please check if it is installed.")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Help & Support'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // 1. Search Bar (Added feature)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: "Search help articles...",
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.grey.shade100,
              ),
            ),
          ),

          // Search Results View
          if (_searchController.text.isNotEmpty) ...[
             if (_filteredFaqs.isEmpty)
               const Padding(
                 padding: EdgeInsets.all(32.0),
                 child: Center(child: Text("No articles found matching your search.")),
               )
             else
               Column(
                 children: _filteredFaqs.map((item) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                    child: ExpansionTile(
                      title: Text(item.question, style: const TextStyle(fontWeight: FontWeight.w500)),
                      children: [Padding(padding: const EdgeInsets.all(16), child: Text(item.answer, style: TextStyle(color: Colors.grey.shade600)))],
                    ),
                  )).toList(),
               ),
          ] else ...[
            // Original Layout (Restored)
            _buildHeroSection(),
            const SizedBox(height: 24),
            
            // 2. FAQs Section (Added feature, integrated into old layout)
             Text(
              'Frequently Asked Questions',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
             const SizedBox(height: 8),
             // Showing top 3 common FAQs
             ..._allFaqs.take(3).map((item) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                child: ExpansionTile(
                  title: Text(item.question, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  children: [Padding(padding: const EdgeInsets.all(16), child: Text(item.answer, style: TextStyle(color: Colors.grey.shade600)))],
                ),
             )).toList(),
             Center(
               child: TextButton(
                 onPressed: () {
                   // Focus the search bar to encourage searching
                   _searchController.notifyListeners(); // Just to trigger a rebuild if needed, but really we want to maybe focus. 
                   // Simpler: Just tell them to search.
                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Use the search bar to find more topics")));
                 }, 
                 child: const Text("View All FAQs")
               )
             ),

            const SizedBox(height: 16),
            Text(
              'Common Topics',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _buildTopicTile(
                context, Icons.shopping_bag_outlined, 'Orders & Tracking', 
                'Track your medicine delivery or modify orders'),
            _buildTopicTile(
                context, Icons.payment_outlined, 'Payments & Refunds', 
                'Issues with payment methods or refund requests'),
            _buildTopicTile(
                context, Icons.account_circle_outlined, 'Account Settings', 
                'Manage your profile, address, and login security'),
            _buildTopicTile(
                context, Icons.local_shipping_outlined, 'Delivery Information', 
                'Shipping times, fees, and areas covered'),
            
            const SizedBox(height: 24),
            Text(
              'Contact Us',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Colors.green,
                child: Icon(Icons.email, color: Colors.white),
              ),
              title: const Text('Email Support'),
              subtitle: const Text('support@farumasi.rw'),
              onTap: () async {
                 final Uri emailUri = Uri(
                    scheme: 'mailto',
                    path: 'support@farumasi.rw',
                    query: 'subject=Farumasi Support Request',
                  );
                  if (await canLaunchUrl(emailUri)) {
                    await launchUrl(emailUri);
                  }
              },
            ),
            const Divider(),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Colors.blue,
                child: Icon(Icons.phone, color: Colors.white),
              ),
              title: const Text('Call Center'),
              subtitle: const Text('+250 788 123 456'),
              onTap: () async {
                 final Uri phoneUri = Uri(scheme: 'tel', path: '+250788123456');
                 if (await canLaunchUrl(phoneUri)) {
                   await launchUrl(phoneUri);
                 }
              },
            ),
            const Divider(),
             ListTile(
              leading: const CircleAvatar(
                backgroundColor: Colors.green,
                child: Icon(FontAwesomeIcons.whatsapp, color: Colors.white),
              ),
              title: const Text('WhatsApp Chat'),
              subtitle: const Text('Instant Support'),
              onTap: () => _launchWhatsApp(context),
            ),
            const SizedBox(height: 32),
          ],
        ],
      ),
    );
  }

  Widget _buildHeroSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'How can we help you?',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.green.shade900),
          ),
          const SizedBox(height: 8),
          const Text(
            'Search for help topics or contact support directly.',
            style: TextStyle(fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildTopicTile(BuildContext context, IconData icon, String title, String subtitle) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: Icon(icon, color: Colors.green, size: 28),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
        onTap: () {},
      ),
    );
  }
}

class _FaqItem {
  final String category;
  final String question;
  final String answer;
  _FaqItem(this.category, this.question, this.answer);
}
