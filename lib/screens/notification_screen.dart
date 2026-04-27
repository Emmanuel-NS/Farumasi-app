import 'package:flutter/material.dart';
import '../services/notification_service.dart';
import '../services/state_service.dart';
import 'order_tracking_screen.dart';
import 'orders_screen.dart';
import 'health_tips_screen.dart';
import 'medicine_store_screen.dart';
import 'cart_screen.dart';

import 'trash_screen.dart';

class NotificationScreen extends StatefulWidget {     final bool isEmbedded;

  const NotificationScreen({super.key, this.isEmbedded = false});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<Map<String, dynamic>> _notifications = [];
  String _currentFilter = 'All'; // All, Read, Unread
  String _currentCategory = 'All'; // All, order, health_tip, etc.
  bool _isRightSidebarVisible = false;

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
        return const Color(0xFF1E9E68);
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

  Widget _buildFilterChip(
    String label,
    bool isSelected,
    Function(bool) onSelected,
  ) {
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: onSelected,
      backgroundColor: Colors.grey[200],
      selectedColor: Theme.of(context).primaryColor.withValues(alpha: 0.3),
      checkmarkColor: Theme.of(context).primaryColor,
    );
  }

  Widget _buildMainNotificationsBody() {
    return _notifications.isEmpty
        ? Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.notifications_off_outlined,
                  size: 64,
                  color: Colors.grey,
                ),
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
                key: Key(notification['id'].toString()),
                dismissThresholds: const {DismissDirection.endToStart: 0.6},
                confirmDismiss: (direction) async {
                  return await showDialog(
                    context: context,
                    builder: (BuildContext context) {
                      return AlertDialog(
                        title: const Text("Delete Notification?"),
                        content: const Text(
                          "Are you sure you want to move this notification to trash?",
                        ),
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
                  NotificationService().deleteNotification(notification['id']);
                  _loadNotifications();

                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('Moved to Trash'),
                      action: SnackBarAction(
                        label: 'UNDO',
                        onPressed: () {
                          NotificationService().restoreNotification(
                            notification['id'],
                          );
                          _loadNotifications();
                        },
                      ),
                    ),
                  );
                },
                child: Card(
                  color: isRead ? Colors.white : Colors.blue[50],
                  margin: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  elevation: isRead ? 0.5 : 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: isRead
                          ? Colors.grey.shade300
                          : color.withValues(alpha: 0.5),
                      width: isRead ? 1 : 1.5,
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
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        notification['title'] ?? 'No Title',
                                        style: TextStyle(
                                          fontWeight: isRead
                                              ? FontWeight.normal
                                              : FontWeight.bold,
                                          fontSize: 16,
                                          color: isRead
                                              ? Colors.black87
                                              : Colors.black,
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
                                        color: isRead
                                            ? Colors.grey[500]
                                            : Colors.blueGrey,
                                        fontWeight: isRead
                                            ? FontWeight.normal
                                            : FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  notification['body'] ?? 'No Body',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: isRead
                                        ? Colors.grey[600]
                                        : Colors.black87,
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
          );
  }

  Widget _buildRightSidebar() {
    final allNotifications =
        List<Map<String, dynamic>>.from(NotificationService().notifications)
          ..sort((a, b) {
            final at = a['time'];
            final bt = b['time'];
            if (at is DateTime && bt is DateTime) return bt.compareTo(at);
            return 0;
          });

    return Container(
      width: 340,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(left: BorderSide(color: Colors.grey.shade200)),
      ),
      child: ListenableBuilder(
        listenable: StateService(),
        builder: (context, _) {
          final cartItems = StateService().cartItems;
          final cartTotal = StateService().totalAmount;

          return SafeArea(
            left: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.notifications_none, size: 18),
                        const SizedBox(width: 6),
                        const Text(
                          'Notifications',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () {
                            setState(() {
                              _currentFilter = 'All';
                              _currentCategory = 'All';
                              _loadNotifications();
                            });
                          },
                          child: const Text('Show all'),
                        ),
                        IconButton(
                          tooltip: 'Close panel',
                          onPressed: () {
                            setState(() => _isRightSidebarVisible = false);
                          },
                          icon: const Icon(Icons.close, size: 18),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    if (allNotifications.isEmpty)
                      _buildContextEmptyCard(
                        icon: Icons.notifications_off_outlined,
                        text: 'No notifications available.',
                      )
                    else
                      ...allNotifications.take(5).map((n) {
                        final isRead = n['isRead'] == true;
                        final category = n['category'] as String?;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(10),
                            onTap: () => _handleNotificationTap(n),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isRead
                                    ? Colors.white
                                    : const Color(0xFFEAF3FF),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: Colors.grey.shade200),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    _getCategoryIcon(category),
                                    size: 16,
                                    color: _getCategoryColor(category),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          n['title'] ?? 'No title',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontWeight: isRead
                                                ? FontWeight.w500
                                                : FontWeight.w700,
                                            fontSize: 12,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          _formatTime(n['time']),
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        const Icon(Icons.shopping_cart_outlined, size: 18),
                        const SizedBox(width: 6),
                        const Text(
                          'Cart List',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const CartScreen(),
                              ),
                            );
                          },
                          child: const Text('Open'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    if (cartItems.isEmpty)
                      _buildContextEmptyCard(
                        icon: Icons.remove_shopping_cart_outlined,
                        text: 'Your cart is empty.',
                      )
                    else
                      ...cartItems.take(5).map((item) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.medication_outlined, size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.medicine.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'x${item.quantity} • ${item.total.toStringAsFixed(0)} RWF',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey.shade700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.close, size: 16),
                                  onPressed: () => StateService()
                                      .removeFromCart(item.medicine.id),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    if (cartItems.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEAF8F1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFBFE4CE)),
                        ),
                        child: Row(
                          children: [
                            const Text(
                              'Total',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                            const Spacer(),
                            Text(
                              '${cartTotal.toStringAsFixed(0)} RWF',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF1E9E68),
                              ),
                            ),
                          ],
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

  Widget _buildContextEmptyCard({
    required IconData icon,
    required String text,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Icon(icon, color: Colors.grey.shade400, size: 20),
          const SizedBox(height: 6),
          Text(
            text,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.isEmbedded ? null : AppBar(
        title: const Text('Notifications'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(
              _isRightSidebarVisible
                  ? Icons.view_sidebar
                  : Icons.view_sidebar_outlined,
            ),
            tooltip: _isRightSidebarVisible
                ? 'Hide right sidebar'
                : 'Show right sidebar',
            onPressed: () {
              setState(() => _isRightSidebarVisible = !_isRightSidebarVisible);
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Clear All to Trash',
            onPressed: () {
              NotificationService().clearNotifications();
              _loadNotifications();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('All notifications moved to trash'),
                ),
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
                _buildFilterChip('All', _currentFilter == 'All', (sel) {
                  setState(() {
                    _currentFilter = 'All';
                    _loadNotifications();
                  });
                }),
                const SizedBox(width: 8),
                _buildFilterChip('Unread', _currentFilter == 'Unread', (sel) {
                  setState(() {
                    _currentFilter = 'Unread';
                    _loadNotifications();
                  });
                }),
                const SizedBox(width: 8),
                _buildFilterChip('Read', _currentFilter == 'Read', (sel) {
                  setState(() {
                    _currentFilter = 'Read';
                    _loadNotifications();
                  });
                }),
                const SizedBox(width: 16),
                DropdownButton<String>(
                  value: _currentCategory,
                  underline: Container(),
                  icon: const Icon(Icons.filter_list),
                  items: ['All', 'order', 'health_tip', 'promo', 'reminder']
                      .map((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(
                            value == 'All' ? 'All Categories' : value,
                          ),
                        );
                      })
                      .toList(),
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
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth < 1100) {
            return _buildMainNotificationsBody();
          }

          return Stack(
            children: [
              _buildMainNotificationsBody(),
              if (_isRightSidebarVisible)
                Positioned(
                  top: 12,
                  right: 12,
                  bottom: 12,
                  child: Material(
                    elevation: 10,
                    borderRadius: BorderRadius.circular(14),
                    clipBehavior: Clip.antiAlias,
                    child: _buildRightSidebar(),
                  ),
                ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        tooltip: 'Simulate Notification',
        onPressed: () async {
          await NotificationService().showNotification(
            title: 'Test Notification',
            body:
                'This is a test notification generated at ${TimeOfDay.now().format(context)}',
          );
          _loadNotifications(); // Refresh the list
        },
        child: const Icon(Icons.add_alert),
      ),
    );
  }
}
