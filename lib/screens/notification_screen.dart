import 'package:flutter/material.dart';
import '../services/notification_service.dart';
import 'order_tracking_screen.dart';
import 'orders_screen.dart';
import 'health_tips_screen.dart';
import 'medicine_store_screen.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<Map<String, dynamic>> _notifications = [];

  @override
  void initState() {
    super.initState();
    // Load dummy data if empty for demonstration
    NotificationService().loadDummyNotifications();
    _loadNotifications();
  }

  void _loadNotifications() {
    setState(() {
      _notifications = NotificationService().notifications;
    });
  }

  Color _getCategoryColor(String? category) {
    switch (category) {
      case 'order':
        return Colors.blue;
      case 'order_shipped':
        return Colors.indigo;
      case 'health_tip':
        return Colors.green;
      case 'promo':
        return Colors.purple;
      case 'reminder':
        return Colors.amber.shade700;
        case 'general':
      default:
        return Colors.grey;
    }
  }

  IconData _getCategoryIcon(String? category) {
    switch (category) {
      case 'order':
        return Icons.shopping_bag;
      case 'order_shipped':
        return Icons.local_shipping;
      case 'health_tip':
        return Icons.health_and_safety;
      case 'promo':
        return Icons.local_offer;
      case 'reminder':
        return Icons.access_alarm;
          case 'general':
      default:
        return Icons.notifications;
    }
  }

  void _handleNotificationTap(Map<String, dynamic> notification) {
    final category = notification['category'] as String?;
    
    Widget? destinationScreen;

    switch (category) {
      case 'order':
        destinationScreen = const OrdersScreen();
        break;
      case 'order_shipped':
        // Extract ID or use dummy
        destinationScreen = const OrderTrackingScreen(orderId: 'ORD-2024-001');
        break;
      case 'health_tip':
        destinationScreen = const HealthTipsScreen();
        break;
      case 'promo':
      case 'reminder':
        // Go to store for promos and generic reminders (like refills)
        destinationScreen = const MedicineStoreScreen();
        break;
      default:
        // No specific action
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Viewing notification details...')),
        );
        return;
    }

    // if (destinationScreen != null) { // Unnecessary check if all paths return a widget or break
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => destinationScreen!),
      );
    // }
  }

  String _formatTime(dynamic time) {
    if (time == null) return '';
    if (time is! DateTime) return time.toString();
    
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inDays > 0) {
      if (difference.inDays == 1) return 'Yesterday';
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadNotifications,
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () {
              NotificationService().clearNotifications();
              _loadNotifications();
            },
          ),
        ],
      ),
      body: _notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off_outlined,
                      size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    'No notifications yet',
                    style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _notifications.isEmpty ? 0 : _notifications.length,
              itemBuilder: (context, index) {
                // Show newest first
                final notification = _notifications.reversed.toList()[index];
                final category = notification['category'] as String?;
                final color = _getCategoryColor(category);

                return Dismissible(
                  key: Key(notification['time'].toString()),
                  background: Container(
                    color: Colors.red,
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    child: const Icon(Icons.delete, color: Colors.white),
                  ),
                  onDismissed: (direction) {
                     // Optionally remove from service
                  },
                  child: Card(
                    margin:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: color.withValues(alpha: 0.3), width: 1),
                    ),
                    child: InkWell(
                      onTap: () => _handleNotificationTap(notification),
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                _getCategoryIcon(category),
                                color: color,
                                size: 24,
                              ),
                            ),
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
                                          notification['title'] ?? 'No Title',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        _formatTime(notification['time']),
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey[500],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    notification['body'] ?? 'No Body',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey[700],
                                      height: 1.3,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        tooltip: 'Simulate Notification',
        onPressed: () async {
          await NotificationService().showNotification(
            title: 'Test Notification',
            body: 'This is a test notification generated at ${TimeOfDay.now().format(context)}',
          );
          _loadNotifications(); // Refresh the list
        },
        child: const Icon(Icons.add_alert),
      ),
    );
  }
}
