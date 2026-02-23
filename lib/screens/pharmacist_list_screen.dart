import 'package:flutter/material.dart';
import '../models/models.dart';
import '../data/dummy_data.dart';
import '../services/state_service.dart';
import 'chat_screen.dart';
import 'pharmacist/pharmacist_booking_screen.dart';

class PharmacistListScreen extends StatelessWidget {
  final Pharmacy? pharmacy;

  const PharmacistListScreen({super.key, this.pharmacy});

  void _bookSession(BuildContext context, Pharmacist pharmacist) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PharmacistBookingScreen(pharmacist: pharmacist),
      ),
    );
  }

  void _showBlockPharmacyDialog(BuildContext context) {
    if (pharmacy == null) return;
    
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Block Pharmacy?"),
        content: Text(
          "Are you sure you want to block ${pharmacy!.name}?\n\nThis will remove them from the list of pharmacies that can process your orders.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Cancel"),
          ),
          TextButton(
            onPressed: () {
              StateService().setPharmacyBlocked(pharmacy!.id, true);
              Navigator.of(ctx).pop(); // Close dialog
              Navigator.of(context).pop(); // Go back to previous screen
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text("${pharmacy!.name} has been blocked.")),
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
    // In a real app, filter pharmacists by pharmacy ID if pharmacy is provided
    final pharmacists = dummyPharmacists; 

    return Scaffold(
      appBar: AppBar(
        title: Text(pharmacy != null ? "Our Pharmacists" : "Consult a Pharmacist"),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: ListenableBuilder(
        listenable: StateService(),
        builder: (context, _) {
          final bookings = StateService().bookings;

          return Column(
            children: [
              // Display active booked sessions if any
              if (bookings.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  alignment: Alignment.centerLeft,
                  child: Row(
                    children: [
                      const Icon(Icons.event_available, color: Colors.green),
                      const SizedBox(width: 8),
                      Text(
                        "Your Upcoming Sessions (${bookings.length})",
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  height: 150,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: bookings.length,
                    itemBuilder: (context, index) {
                      final booking = bookings[index];
                      return Container(
                        width: 280,
                        margin: const EdgeInsets.only(right: 12, bottom: 8),
                        child: Card(
                          elevation: 3,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          color: Colors.green.shade50,
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const CircleAvatar(
                                      radius: 16,
                                      backgroundColor: Colors.green,
                                      child: Icon(Icons.person, size: 20, color: Colors.white),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        booking.pharmacistName,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.close, size: 18, color: Colors.red),
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(),
                                      tooltip: "Cancel",
                                      onPressed: () {
                                         showDialog(
                                          context: context,
                                          builder: (ctx) => AlertDialog(
                                            title: const Text("Cancel Session?"),
                                            content: const Text("Are you sure you want to cancel this booking?"),
                                            actions: [
                                              TextButton(
                                                onPressed: () => Navigator.pop(ctx),
                                                child: const Text("Keep"),
                                              ),
                                              TextButton(
                                                onPressed: () {
                                                  StateService().cancelBooking(booking.id);
                                                  Navigator.pop(ctx);
                                                  ScaffoldMessenger.of(context).showSnackBar(
                                                    const SnackBar(content: Text("Session cancelled")),
                                                  );
                                                },
                                                child: const Text("Cancel", style: TextStyle(color: Colors.red)),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    ),
                                  ],
                                ),
                                const Divider(),
                                Row(
                                  children: [
                                    const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                                    const SizedBox(width: 4),
                                    Text(
                                      "${booking.date.day}/${booking.date.month}/${booking.date.year}",
                                      style: const TextStyle(fontSize: 13),
                                    ),
                                    const SizedBox(width: 12),
                                    const Icon(Icons.access_time, size: 14, color: Colors.grey),
                                    const SizedBox(width: 4),
                                    Text(
                                      booking.time,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                if (booking.notes.isNotEmpty)
                                  Text(
                                    "Note: ${booking.notes}",
                                    style: TextStyle(fontSize: 12, color: Colors.grey[700], fontStyle: FontStyle.italic),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const Divider(thickness: 1),
              ],

              Expanded(
                child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: pharmacists.length,
              separatorBuilder: (_, __) => const Divider(),
              itemBuilder: (context, index) {
                final pharmacist = pharmacists[index];
                
                Color statusColor;
                String statusText;
                switch (pharmacist.status) {
                  case PharmacistStatus.available:
                    statusColor = Colors.green;
                    statusText = "Available";
                    break;
                  case PharmacistStatus.busy:
                    statusColor = Colors.orange;
                    statusText = "Busy";
                    break;
                  case PharmacistStatus.offline:
                    statusColor = Colors.grey;
                    statusText = "Offline";
                    break;
                }

                return ListTile(
                  leading: Stack(
                      children: [
                        CircleAvatar(
                          backgroundImage: NetworkImage(pharmacist.imageUrl),
                          radius: 28,
                          onBackgroundImageError: (_, __) =>
                              const Icon(Icons.person, size: 28),
                        ),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: statusColor,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                            ),
                          ),
                        ),
                      ],
                  ),
                  title: Text(
                    pharmacist.name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(pharmacist.specialty),
                      const SizedBox(height: 2),
                      Text(
                        pharmacist.organization,
                        style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 12, 
                          color: statusColor, 
                          fontWeight: FontWeight.w600
                        ),
                      ),
                    ],
                  ),
                  trailing: pharmacy != null 
                    ? null // Hide actions for partner pharmacy pharmacists
                    : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                       if (pharmacist.status != PharmacistStatus.offline)
                        IconButton(
                          icon: const Icon(Icons.calendar_month, color: Colors.blue),
                          tooltip: "Book Session",
                          onPressed: () => _bookSession(context, pharmacist),
                        ),
                      
                      // Chat Button Logic: Only active if AVAILABLE
                      if (pharmacist.status == PharmacistStatus.available)
                        IconButton(
                          icon: const Icon(Icons.chat_bubble_outline, color: Colors.green),
                          tooltip: "Chat with Pharmacist",
                          onPressed: () {
                             Navigator.push(
                               context,
                               MaterialPageRoute(
                                 builder: (_) => ChatScreen(pharmacist: pharmacist),
                               ),
                             );
                          },
                        )
                      else
                        IconButton(
                          icon: const Icon(Icons.lock_outline, color: Colors.grey),
                          tooltip: "Chat Unavailable (${statusText})",
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text("${pharmacist.name} is currently $statusText. Please try again later."),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
          if (pharmacy != null)
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
                      final isBlocked = StateService().isPharmacyBlocked(pharmacy!.id);
                      if (isBlocked) {
                         return OutlinedButton.icon(
                          onPressed: () {
                             StateService().setPharmacyBlocked(pharmacy!.id, false);
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
          );
        },
      ),
    );
  }
}
