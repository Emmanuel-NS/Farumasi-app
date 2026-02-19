import 'package:flutter/material.dart';
import '../models/models.dart';
import '../data/dummy_data.dart';
import '../services/state_service.dart';

class PharmacistListScreen extends StatelessWidget {
  final Pharmacy pharmacy;

  const PharmacistListScreen({super.key, required this.pharmacy});

  void _showBlockPharmacyDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Block Pharmacy?"),
        content: Text(
          "Are you sure you want to block ${pharmacy.name}?\n\nThis will remove them from the list of pharmacies that can process your orders.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Cancel"),
          ),
          TextButton(
            onPressed: () {
              StateService().setPharmacyBlocked(pharmacy.id, true);
              Navigator.of(ctx).pop(); // Close dialog
              Navigator.of(context).pop(); // Go back to previous screen
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text("${pharmacy.name} has been blocked.")),
              );
            },
            child: const Text("Block", style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // In a real app, filter pharmacists by pharmacy ID
    final pharmacists = dummyPharmacists; 

    return Scaffold(
      appBar: AppBar(
        title: const Text("Our Pharmacists"),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: pharmacists.length,
              separatorBuilder: (_, __) => const Divider(),
              itemBuilder: (context, index) {
                final pharmacist = pharmacists[index];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundImage: NetworkImage(pharmacist.imageUrl),
                    radius: 28,
                    onBackgroundImageError: (_, __) =>
                        const Icon(Icons.person, size: 28),
                  ),
                  title: Text(
                    pharmacist.name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(pharmacist.specialty),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.star, size: 14, color: Colors.amber),
                          Text(
                            " ${pharmacist.rating} • ${pharmacist.yearsExperience} yrs exp",
                            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    ],
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.chat_bubble_outline, color: Colors.green),
                    onPressed: () {
                       ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Chat feature coming soon!")),
                      );
                    },
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue.withOpacity(0.1)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.privacy_tip_outlined, size: 20, color: Colors.blueGrey),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            "Your comfort and privacy matter. If any pharmacist listed here makes you feel uncomfortable viewing your order details, you have the right to block this pharmacy. Blocking prevents them from processing your future orders. You can unblock them anytime if you change your mind.",
                            style: TextStyle(color: Colors.black87, fontSize: 13, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  ListenableBuilder(
                    listenable: StateService(),
                    builder: (context, _) {
                      final isBlocked = StateService().isPharmacyBlocked(pharmacy.id);
                      if (isBlocked) {
                         return OutlinedButton.icon(
                          onPressed: () {
                             StateService().setPharmacyBlocked(pharmacy.id, false);
                          },
                          icon: const Icon(Icons.check_circle, color: Colors.green),
                          label: const Text("Unblock Pharmacy"),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.green,
                            side: const BorderSide(color: Colors.green),
                            padding: const EdgeInsets.all(16),
                          ),
                        );
                      }
                      return ElevatedButton.icon(
                        onPressed: () => _showBlockPharmacyDialog(context),
                        icon: const Icon(Icons.block),
                        label: const Text("Block Pharmacy"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red.shade50,
                          foregroundColor: Colors.red,
                          elevation: 0,
                          padding: const EdgeInsets.all(16),
                          side: BorderSide(color: Colors.red.shade200),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
