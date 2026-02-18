import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  final String _whatsappNumber = "+250790160172";

  Future<void> _launchWhatsApp(BuildContext context) async {
    final cleanNumber = _whatsappNumber.replaceAll(RegExp(r'[^\d+]'), '');
    
    // 1. Try launching with the whatsapp:// scheme (app specific)
    final appUri = Uri.parse("whatsapp://send?phone=$cleanNumber&text=Hello! I need help with Farumasi.");
    
    // 2. Fallback to web link (works on both mobile and web)
    final webUri = Uri.parse("https://wa.me/$cleanNumber?text=Hello! I need help with Farumasi.");

    try {
      if (await canLaunchUrl(appUri)) {
        await launchUrl(appUri, mode: LaunchMode.externalApplication);
      } else if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      } else {
        // Just try launching the web URI anyway as a last resort
        // (Sometimes canLaunchUrl returns false on Android 11+ but launchUrl still works if queries are set)
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint("Could not launch WhatsApp: $e");
      // Show error to user
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
          _buildHeroSection(),
          const SizedBox(height: 24),
          _buildSectionHeader('Common Topics'),
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
          _buildSectionHeader('Contact Us'),
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
          
          const SizedBox(height: 40),
          Center(
            child: Text(
              'Still need help?',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          const SizedBox(height: 80), // Space for FAB
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _launchWhatsApp(context),
        backgroundColor: const Color(0xFF25D366), 
        tooltip: "Chat on WhatsApp",
        child: const FaIcon(FontAwesomeIcons.whatsapp, color: Colors.white, size: 32),
      ),
    );
  }

  Widget _buildHeroSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.green.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "How can we help you?",
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.green,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Find answers to common questions or contact our support team directly.",
            style: TextStyle(color: Colors.grey[700], fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: Colors.black87,
      ),
    );
  }

  Widget _buildTopicTile(BuildContext context, IconData icon, String title, String subtitle) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.green.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: Colors.green),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
        onTap: () {
          // Placeholder for topic details
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("Viewing $title")),
          );
        },
      ),
    );
  }
}
