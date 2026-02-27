import 'package:flutter/material.dart';

enum NotificationType { order, consultation, system, inventory }

class AppNotification {
  final String id;
  final String title;
  final String message;
  final DateTime time;
  final NotificationType type;
  bool isRead;

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    required this.type,
    this.isRead = false,
  });
}

class PharmacistNotificationsScreen extends StatefulWidget {
  const PharmacistNotificationsScreen({super.key});

  @override
  State<PharmacistNotificationsScreen> createState() => _PharmacistNotificationsScreenState();
}

class _PharmacistNotificationsScreenState extends State<PharmacistNotificationsScreen> {
  final List<AppNotification> _notifications = [
    AppNotification(
      id: "n1",
      title: "New Order Request",
      message: "Order #ORD-8492 placed by Alice Uwase. Requires prescription review.",
      time: DateTime.now().subtract(const Duration(minutes: 5)),
      type: NotificationType.order,
    ),
    AppNotification(
      id: "n2",
      title: "Consultation Booked",
      message: "John Mugabo scheduled a video consultation for today at 2:00 PM.",
      time: DateTime.now().subtract(const Duration(minutes: 45)),
      type: NotificationType.consultation,
    ),
    AppNotification(
      id: "n3",
      title: "Low Inventory Warning",
      message: "Amoxicillin 500mg stock is below the threshold (Only 5 left).",
      time: DateTime.now().subtract(const Duration(hours: 2)),
      type: NotificationType.inventory,
      isRead: true,
    ),
    AppNotification(
      id: "n4",
      title: "System Maintenance",
      message: "Scheduled platform maintenance tonight at 2:00 AM.",
      time: DateTime.now().subtract(const Duration(days: 1)),
      type: NotificationType.system,
      isRead: true,
    ),
    AppNotification(
      id: "n5",
      title: "Order Completed",
      message: "Order #ORD-8488 has been picked up by the patient.",
      time: DateTime.now().subtract(const Duration(days: 1, hours: 4)),
      type: NotificationType.order,
      isRead: true,
    ),
  ];

  void _markAllAsRead() {
    setState(() {
      for (var n in _notifications) {
        n.isRead = true;
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("All notifications marked as read", style: TextStyle(color: Colors.white)), backgroundColor: Colors.black87),
    );
  }

  void _deleteNotification(String id) {
    setState(() {
      _notifications.removeWhere((n) => n.id == id);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Notification removed", style: TextStyle(color: Colors.white)), backgroundColor: Colors.black87),
    );
  }

  Widget _buildIcon(NotificationType type) {
    switch (type) {
      case NotificationType.order:
        return CircleAvatar(backgroundColor: Colors.green.shade50, child: const Icon(Icons.shopping_bag_outlined, color: Colors.green));
      case NotificationType.consultation:
        return CircleAvatar(backgroundColor: Colors.blue.shade50, child: const Icon(Icons.video_camera_front_outlined, color: Colors.blue));
      case NotificationType.inventory:
        return CircleAvatar(backgroundColor: Colors.orange.shade50, child: const Icon(Icons.warning_amber_rounded, color: Colors.orange));
      case NotificationType.system:
        return CircleAvatar(backgroundColor: Colors.purple.shade50, child: const Icon(Icons.settings_system_daydream, color: Colors.purple));
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);
    if (difference.inMinutes < 60) {
      return "${difference.inMinutes}m ago";
    } else if (difference.inHours < 24) {
      return "${difference.inHours}h ago";
    } else if (difference.inDays < 7) {
      return "${difference.inDays}d ago";
    } else {
      return "${time.day}/${time.month}/${time.year}";
    }
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => !n.isRead).length;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Notifications", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 18)),
            if (unreadCount > 0)
              Text("$unreadCount unread messages", style: TextStyle(color: Colors.green.shade800, fontSize: 12, fontWeight: FontWeight.w500)),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        actions: [
          TextButton(
            onPressed: _notifications.isEmpty ? null : _markAllAsRead,
            child: Text("Mark all read", style: TextStyle(color: _notifications.isEmpty ? Colors.grey : Colors.green.shade800, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off_outlined, size: 80, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text("You're all caught up!", style: TextStyle(color: Colors.grey.shade600, fontSize: 18, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  Text("No new notifications at this time.", style: TextStyle(color: Colors.grey.shade400, fontSize: 14)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: _notifications.length,
              itemBuilder: (context, index) {
                final notification = _notifications[index];
                
                return Dismissible(
                  key: Key(notification.id),
                  direction: DismissDirection.endToStart,
                  onDismissed: (_) => _deleteNotification(notification.id),
                  background: Container(
                    color: Colors.red.shade400,
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 24),
                    child: const Icon(Icons.delete_outline, color: Colors.white),
                  ),
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        notification.isRead = true;
                      });
                      // Normally this would route to order detail or consultation screen
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: notification.isRead ? Colors.white : Colors.green.shade50.withValues(alpha: 0.3),
                        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildIcon(notification.type),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        notification.title,
                                        style: TextStyle(
                                          fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.bold,
                                          fontSize: 15,
                                          color: Colors.black87,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      _formatTime(notification.time),
                                      style: TextStyle(
                                        color: notification.isRead ? Colors.grey : Colors.green.shade800,
                                        fontSize: 12,
                                        fontWeight: notification.isRead ? FontWeight.normal : FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  notification.message,
                                  style: TextStyle(
                                    color: notification.isRead ? Colors.grey.shade600 : Colors.black87,
                                    fontSize: 14,
                                    height: 1.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (!notification.isRead) ...[
                            const SizedBox(width: 12),
                            Container(
                              margin: const EdgeInsets.only(top: 6),
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Colors.green,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
