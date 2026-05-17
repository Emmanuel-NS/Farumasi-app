// lib/screens/rider/rider_help_screen.dart
// Help & Emergency Support screen for FARUMASI riders.

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class RiderHelpScreen extends StatelessWidget {
  const RiderHelpScreen({super.key});

  static const String _supportPhone = 'tel:+250788000000';

  Future<void> _callSupport(BuildContext context) async {
    final uri = Uri.parse(_supportPhone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not open phone app. Call +250 788 000 000'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        title: const Text(
          'Help & Support',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: Colors.grey.shade100),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        physics: const BouncingScrollPhysics(),
        children: [
          // ── Emergency call button ──────────────────────────────────────
          GestureDetector(
            onTap: () => _callSupport(context),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.red.shade600, Colors.red.shade700],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.red.withValues(alpha: 0.25),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.phone_rounded,
                        color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Call Support',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 20,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          '+250 788 000 000 — Available 24/7',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios_rounded,
                      color: Colors.white70, size: 16),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          const Text(
            'Report an Issue',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Tap an issue to contact support.',
            style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
          ),
          const SizedBox(height: 14),

          // ── Issue grid ─────────────────────────────────────────────────
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.4,
            children: [
              _IssueCard(
                icon: Icons.storefront_outlined,
                label: 'Pharmacy\nUnreachable',
                color: Colors.orange.shade600,
                onTap: () => _showIssueSheet(context, 'Pharmacy Unreachable',
                    'Cannot find or contact the pickup pharmacy.'),
              ),
              _IssueCard(
                icon: Icons.person_search_outlined,
                label: 'Patient\nUnreachable',
                color: Colors.blue.shade600,
                onTap: () => _showIssueSheet(context, 'Patient Unreachable',
                    'Cannot contact the patient at the delivery address.'),
              ),
              _IssueCard(
                icon: Icons.warning_amber_rounded,
                label: 'Accident /\nEmergency',
                color: Colors.red.shade600,
                onTap: () => _showIssueSheet(context, 'Accident / Emergency',
                    'You or someone is in danger. Support will call you immediately.',
                    isEmergency: true),
              ),
              _IssueCard(
                icon: Icons.inventory_2_outlined,
                label: 'Order\nDamaged',
                color: Colors.purple.shade600,
                onTap: () => _showIssueSheet(context, 'Order Damaged',
                    'The medication package appears damaged or compromised.'),
              ),
              _IssueCard(
                icon: Icons.wrong_location_outlined,
                label: 'Wrong\nAddress',
                color: Colors.teal.shade600,
                onTap: () => _showIssueSheet(context, 'Wrong Address',
                    'The delivery address appears to be incorrect or does not exist.'),
              ),
              _IssueCard(
                icon: Icons.qr_code_2_rounded,
                label: 'QR Not\nWorking',
                color: Colors.grey.shade600,
                onTap: () => _showIssueSheet(context, 'QR Code Not Working',
                    'Cannot scan the patient\'s QR code to confirm delivery.'),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // ── FAQ section ────────────────────────────────────────────────
          const Text(
            'Common Questions',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          _FaqTile(
            question: 'What if the patient is not at home?',
            answer:
                'Try calling the patient 3 times. If still unreachable, contact support before leaving.',
          ),
          _FaqTile(
            question: 'Can I reject a delivery after accepting?',
            answer:
                'No. Once accepted, contact support to cancel. Repeated cancellations may affect your rating.',
          ),
          _FaqTile(
            question: 'How do I get paid?',
            answer:
                'Per-trip riders receive payments after each delivery. Weekly/Monthly riders are paid at the end of their period via Mobile Money.',
          ),
          _FaqTile(
            question: 'The QR scan is failing — what do I do?',
            answer:
                'Try cleaning your camera lens, ensure good lighting, and hold steady. If still failing, use the demo fallback or call support.',
          ),
        ],
      ),
    );
  }

  void _showIssueSheet(
      BuildContext context, String title, String description,
      {bool isEmergency = false}) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => Container(
        padding: EdgeInsets.fromLTRB(
            24, 24, 24, MediaQuery.of(context).padding.bottom + 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: isEmergency ? Colors.red.shade700 : Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 14,
                  height: 1.5),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isEmergency
                      ? Colors.red.shade600
                      : const Color(0xFF1E9E68),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                icon: const Icon(Icons.phone_rounded),
                label: const Text(
                  'Call Support Now',
                  style: TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 16),
                ),
                onPressed: () {
                  Navigator.pop(context);
                  _callSupport(context);
                },
              ),
            ),
            const SizedBox(height: 8),
            Center(
              child: TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(
                  'Cancel',
                  style:
                      TextStyle(color: Colors.grey.shade500),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Issue card ───────────────────────────────────────────────────────────────

class _IssueCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _IssueCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: Colors.black87,
                height: 1.3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── FAQ tile ─────────────────────────────────────────────────────────────────

class _FaqTile extends StatefulWidget {
  final String question;
  final String answer;

  const _FaqTile({required this.question, required this.answer});

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => setState(() => _expanded = !_expanded),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 6,
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.question,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: Colors.black87,
                    ),
                  ),
                ),
                Icon(
                  _expanded ? Icons.expand_less : Icons.expand_more,
                  color: Colors.grey.shade400,
                ),
              ],
            ),
            if (_expanded) ...[
              const SizedBox(height: 10),
              Text(
                widget.answer,
                style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 13,
                    height: 1.5),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
