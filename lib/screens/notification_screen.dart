import 'package:flutter/material.dart';
import '../services/notification_service.dart';
import 'order_tracking_screen.dart';
import 'orders_screen.dart';
import 'health_tips_screen.dart';
import 'medicine_store_screen.dart';

import 'trash_screen.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<Map<String, dynamic>> _notifications = [];
  String _currentFilter = 'All'; // All, Read, Unread
  String _currentCategory = 'All'; // All, order, health_tip, etc.

  @override
  void initState() {
    super.initState();
    // Load dummy data if empty for demonstration
    NotificationService().loadDummyNotifications();
    _loadNotifications();
  }

  void _loadNotifications() {
    setState(() {
      var all = NotificationService().notifications;
      
      // Filter by Status
      if (_currentFilter == 'Read') {
        all = all.where((n) => n['isRead'] == true).toList();
      } else if (_currentFilter == 'Unread') {
        all = all.where((n) => n['isRead'] == false).toList();
      }

      // Filter by Category
      if (_currentCategory != 'All') {
        all = all.where((n) => n['category'] == _currentCategory).toList();
      }

      _notifications = all;
    });
  }

  void _markAsRead(int id) {
    NotificationService().markAsRead(id);
    _loadNotifications();
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
    _markAsRead(notification['id']); // Mark as read on tap
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

  Widget _buildFilterChip(String label, bool isSelected, Function(bool) onSelected) {
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: onSelected,
      backgroundColor: Colors.grey[200],
      selectedColor: Theme.of(context).primaryColor.withValues(alpha: 0.3),
      checkmarkColor: Theme.of(context).primaryColor,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Clear All to Trash',
            onPressed: () {
              NotificationService().clearNotifications();
              _loadNotifications();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('All notifications moved to trash')),
              );
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) {
              if (value == 'Trash') {
                 Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const TrashScreen()),
                ).then((_) => _loadNotifications()); // Reload on return
              }
            },
            itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
              const PopupMenuItem<String>(
                value: 'Trash',
                child: Row(
                  children: [
                    Icon(Icons.restore_from_trash, color: Colors.grey),
                    SizedBox(width: 8),
                    Text('Trash Bin'),
                  ],
                ),
              ),
            ],
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFilterChip('All', _currentFilter == 'All', (sel) { setState(() { _currentFilter = 'All'; _loadNotifications(); }); }),
                const SizedBox(width: 8),
                _buildFilterChip('Unread', _currentFilter == 'Unread', (sel) { setState(() { _currentFilter = 'Unread'; _loadNotifications(); }); }),
                const SizedBox(width: 8),
                _buildFilterChip('Read', _currentFilter == 'Read', (sel) { setState(() { _currentFilter = 'Read'; _loadNotifications(); }); }),
                const SizedBox(width: 16),
                DropdownButton<String>(
                  value: _currentCategory,
                  underline: Container(),
                  icon: const Icon(Icons.filter_list),
                  items: ['All', 'order', 'health_tip', 'promo', 'reminder'].map((String value) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(value == 'All' ? 'All Categories' : value),
                    );
                  }).toList(),
                  onChanged: (newValue) {
                    setState(() {
                      _currentCategory = newValue!;
                      _loadNotifications();
                    });
                  },
                ),
              ],
            ),
          ),
        ),
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
                    'No notifications found',
                    style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _notifications.length,
              itemBuilder: (context, index) {
                final notification = _notifications[index];
                final category = notification['category'] as String?;
                final color = _getCategoryColor(category);
                final isRead = notification['isRead'] == true;

                return Dismissible(
                  key: Key(notification['id'].toString()), // Use ID for uniqueness
                  // Make it harder to accidentally dismiss by increasing the threshold
                  dismissThresholds: const {
                    DismissDirection.endToStart: 0.6, // Requires 60% swipe
                  },
                  // Add a confirmation dialog to prevent accidental deletions
                  confirmDismiss: (direction) async {
                    return await showDialog(
                      context: context,
                      builder: (BuildContext context) {
                        return AlertDialog(
                          title: const Text("Delete Notification?"),
                          content: const Text(
                              "Are you sure you want to move this notification to trash?"),
                          actions: <Widget>[
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(false),
                              child: const Text("CANCEL"),
                            ),
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(true),
                              child: const Text(
                                "DELETE",
                                style: TextStyle(color: Colors.red),
                              ),
                            ),
                          ],
                        );
                      },
                    );
                  },
                  background: Container(
                    color: Colors.red,
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    child: const Icon(Icons.delete, color: Colors.white),
                  ),
                  onDismissed: (direction) {
                    // Move to trash
                    NotificationService().deleteNotification(notification['id']);
                    _loadNotifications();

                    // Undo Action
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: const Text('Moved to Trash'),
                        action: SnackBarAction(
                          label: 'UNDO',
                          onPressed: () {
                            NotificationService().restoreNotification(notification['id']);
                            _loadNotifications();
                          },
                        ),
                      ),
                    );
                  },
                  child: Card(
                    color: isRead ? Colors.white : Colors.blue[50],
                    margin:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    elevation: isRead ? 0.5 : 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: isRead ? Colors.grey.shade300 : color.withValues(alpha: 0.5), 
                        width: isRead ? 1 : 1.5
                      ),
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
                              child: Stack(
                                children: [
                                  Icon(
                                    _getCategoryIcon(category),
                                    color: isRead ? Colors.grey : color,
                                    size: 24,
                                  ),
                                  if (!isRead)
                                    Positioned(
                                      right: 0,
                                      top: 0,
                                      child: Container(
                                        width: 8,
                                        height: 8,
                                        decoration: const BoxDecoration(
                                          color: Colors.red,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ),
                                ],
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
                                          style: TextStyle(
                                            fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                                            fontSize: 16,
                                            color: isRead ? Colors.black87 : Colors.black,
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
                                          color: isRead ? Colors.grey[500] : Colors.blueGrey,
                                          fontWeight: isRead ? FontWeight.normal : FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    notification['body'] ?? 'No Body',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: isRead ? Colors.grey[600] : Colors.black87,
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
