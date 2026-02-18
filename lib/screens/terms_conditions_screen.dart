import 'package:flutter/material.dart';

class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Terms & Conditions'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
      ),
      body: Scrollbar(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Last Updated: February 2026",
                style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic),
              ),
              const SizedBox(height: 24),
              const Text(
                "Welcome to Farumasi!",
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.green),
              ),
              const SizedBox(height: 16),
              const Text(
                "Please read these Terms and Conditions ('Terms', 'Terms and Conditions') carefully before using the Farumasi mobile application (the 'Service') operated by Farumasi Ltd ('us', 'we', or 'our').",
                style: TextStyle(fontSize: 15, height: 1.5),
              ),
              
              const Divider(height: 48),
              
              _buildSection(
                "1. Acceptance of Terms",
                "By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service."
              ),
              
              _buildSection(
                "2. Medical Disclaimer",
                "The Service provides a platform to connect with pharmacies and healthcare providers. It does NOT provide medical advice, diagnosis, or treatment. \n\n"
                "• Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.\n"
                "• Never disregard professional medical advice or delay in seeking it because of something you have read on this App.\n"
                "• In case of a medical emergency, call your local emergency services immediately."
              ),
              
              _buildSection(
                "3. User Accounts",
                "When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.\n\n"
                "You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password."
              ),

              _buildSection(
                "4. Prescription Verification",
                "All prescription medication orders require a valid prescription from a licensed medical practitioner. Our partner pharmacists reserve the right to reject any prescription that appears forged, expired, or invalid. You agree not to upload false or misleading medical documents."
              ),

              _buildSection(
                "5. Payments & Refunds",
                "• Payments are processed securely via third-party gateways (Mobile Money, Cards).\n"
                "• Refunds are subject to the specific policy of the fulfilling pharmacy. Generally, medication cannot be returned once dispensed due to safety regulations, unless the product is defective or incorrect."
              ),

              _buildSection(
                "6. Data Privacy",
                "Your submission of personal information through the store is governed by our Privacy Policy. We implement strict HIPAA-compliant security measures to protect your health data."
              ),
              
              _buildSection(
                "7. Code of Conduct",
                "You agree not to use the Service to:\n"
                "• Harass, abuse, or harm another person.\n"
                "• Impersonate any person or entity.\n"
                "• Engage in fraudulent activity regarding insurance or payment."
              ),

              _buildSection(
                "8. Termination",
                "We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms."
              ),

               _buildSection(
                "9. Changes to Terms",
                "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms."
              ),

              const SizedBox(height: 32),
              Center(
                child: Text(
                  "Contact Us\nsupport@farumasi.rw",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: const TextStyle(fontSize: 15, height: 1.6, color: Colors.black87),
          ),
        ],
      ),
    );
  }
}
