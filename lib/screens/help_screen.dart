import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets/portal/portal_ui.dart';

class HelpScreen extends StatelessWidget {
  final bool isEmbedded;

  const HelpScreen({super.key, this.isEmbedded = false});

  static const _faqs = [
    (
      'How do I order medicine?',
      'Browse the Store, add items to your cart, then check out. We\'ll match you to the nearest verified pharmacy that has all your items in stock.',
    ),
    (
      'Can I upload a prescription?',
      'Yes. Go to Prescriptions → New, then upload a photo or PDF. A licensed pharmacist will review it before dispensing.',
    ),
    (
      'How long does delivery take?',
      'Most Kigali deliveries arrive within 60 minutes. Out-of-Kigali timing depends on the pharmacy and rider availability.',
    ),
    (
      'What payment methods are supported?',
      'Mobile Money (MTN, Airtel), card payments, and selected insurance providers. You\'ll see the available methods at checkout.',
    ),
    (
      'How do I cancel an order?',
      'Open the order from Orders → tap Cancel. Cancellation is free until the pharmacy starts preparing your items.',
    ),
  ];

  Future<void> _launch(Uri uri) async {
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = PortalPageShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!isEmbedded)
            PortalBackLink(
              label: 'Back to settings',
              onTap: () => Navigator.maybePop(context),
            ),
          const PortalPageHeader(
            title: 'Help & Support',
            subtitle: 'We\'re here for you, every step of the way.',
          ),
          const SizedBox(height: 24),
          LayoutBuilder(
            builder: (context, c) {
              final cols = c.maxWidth >= 640 ? 3 : 1;
              return GridView.count(
                crossAxisCount: cols,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: cols == 1 ? 2.8 : 1.1,
                children: [
                  PortalContactCard(
                    icon: Icons.phone_outlined,
                    label: 'Call us',
                    value: '+250 788 000 000',
                    onTap: () => _launch(Uri.parse('tel:+250788000000')),
                  ),
                  PortalContactCard(
                    icon: Icons.mail_outline,
                    label: 'Email',
                    value: 'support@farumasi.com',
                    onTap: () => _launch(Uri.parse('mailto:support@farumasi.com')),
                  ),
                  PortalContactCard(
                    icon: Icons.chat_bubble_outline,
                    label: 'WhatsApp',
                    value: 'Chat with us',
                    onTap: () => _launch(Uri.parse('https://wa.me/250788000000')),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 32),
          const PortalSectionLabel('Frequently asked'),
          const SizedBox(height: 12),
          ..._faqs.map(
            (f) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: PortalFaqTile(question: f.$1, answer: f.$2),
            ),
          ),
        ],
      ),
    );

    if (isEmbedded) return body;

    return Scaffold(
      backgroundColor: PortalColors.pageBg,
      body: body,
    );
  }
}
