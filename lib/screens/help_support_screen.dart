import 'package:flutter/material.dart';

class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Help & Support'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // 1. Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: TextField(
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
          
          const SizedBox(height: 24),

          // 2. Direct Contact
          const Text("Contact Us", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildQuickAction(
            context,
            icon: Icons.chat_bubble_outline,
            title: "Live Chat",
            subtitle: "Typically replies in 5 min",
            color: Colors.green,
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Connecting to support agent...")));
            },
          ),
          _buildQuickAction(
            context,
            icon: Icons.phone_in_talk,
            title: "Call Center",
            subtitle: "+250 788 000 000 (Toll free)",
            color: Colors.blue,
            onTap: () {},
          ),
          _buildQuickAction(
            context,
            icon: Icons.email_outlined,
            title: "Email Support",
            subtitle: "support@farumasi.rw",
            color: Colors.orange,
            onTap: () {},
          ),

          const SizedBox(height: 32),

          // 3. FAQs Grouped
          const Text("Frequently Asked Questions", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          
          _buildFaqGroup(
            "My Orders", 
            [
              _FaqItem("Where is my order?", "You can track your order in real-time from the 'My Orders' tab in the main menu."),
              _FaqItem("Can I cancel my order?", "Orders can be cancelled within 10 minutes of placement. After that, please contact support."),
              _FaqItem("My delivery is delayed", "We apologize for the inconvenience. Heavy traffic or bad weather can cause delays."),
            ]
          ),
          
          _buildFaqGroup(
            "Account & Payments", 
            [
              _FaqItem("How do I change my password?", "Go to Settings > Account Security > Change Password."),
              _FaqItem("What payment methods are accepted?", "We accept MTN Mobile Money, Airtel Money, and Visa/Mastercard."),
              _FaqItem("Is my data safe?", "Yes, we use military-grade encryption to protect your health data."),
            ]
          ),

          _buildFaqGroup(
            "Medical Services", 
            [
              _FaqItem("Can I speak to a doctor?", "Yes, use the 'Consultation' feature to book a call with a verified doctor."),
              _FaqItem("How do I upload a prescription?", "When placing an order, tap 'Upload Prescription' and take a clear photo."),
            ]
          ),

          const SizedBox(height: 32),
          Center(
            child: TextButton(
              onPressed: () {}, 
              child: const Text("View All Articles", style: TextStyle(color: Colors.green))
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAction(BuildContext context, {required IconData icon, required String title, required String subtitle, required Color color, required VoidCallback onTap}) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
        onTap: onTap,
      ),
    );
  }

  Widget _buildFaqGroup(String title, List<_FaqItem> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: Text(title.toUpperCase(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade600)),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: Colors.grey.shade200),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: items.map((item) => ExpansionTile(
              title: Text(item.question, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              expandedAlignment: Alignment.centerLeft,
              childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                Text(item.answer, style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.5)),
              ],
            )).toList(),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _FaqItem {
  final String question;
  final String answer;
  _FaqItem(this.question, this.answer);
}
