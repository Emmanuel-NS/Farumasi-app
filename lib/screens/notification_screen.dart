import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/router.dart';
import '../providers/auth_provider.dart';
import '../services/notification_service.dart';
import '../widgets/portal/portal_ui.dart';
import 'health_tips_screen.dart';
import 'order_detail_screen.dart';

class NotificationScreen extends ConsumerStatefulWidget {
  const NotificationScreen({super.key, this.isEmbedded = false});

  final bool isEmbedded;

  @override
  ConsumerState<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends ConsumerState<NotificationScreen> {
  static const _readFilters = ['All', 'Unread', 'Read'];
  static const _catFilters = ['All', 'Order', 'Health', 'Promo', 'Reminder'];

  static const _catMatch = {
    'Order': ['order', 'order_shipped'],
    'Health': ['health_tip'],
    'Promo': ['promo'],
    'Reminder': ['reminder'],
  };

  static const _catEmoji = {
    'order': '📦',
    'order_shipped': '🚚',
    'health_tip': '💊',
    'promo': '🎁',
    'reminder': '⏰',
    'general': '🔔',
  };

  int _readFilter = 0;
  int _catFilter = 0;
  List<Map<String, dynamic>> _notifications = [];

  @override
  void initState() {
    super.initState();
    NotificationService().addListener(_onServiceChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  @override
  void dispose() {
    NotificationService().removeListener(_onServiceChanged);
    super.dispose();
  }

  void _onServiceChanged() {
    if (mounted) _loadNotifications();
  }

  Future<void> _refresh() async {
    final authenticated = ref.read(authProvider).status == AuthStatus.authenticated;
    await NotificationService().refreshFromApi(authenticated: authenticated);
    _loadNotifications();
  }

  void _loadNotifications() {
    setState(() {
      var all = List<Map<String, dynamic>>.from(NotificationService().notifications);

      final readLabel = _readFilters[_readFilter];
      if (readLabel == 'Read') {
        all = all.where((n) => n['isRead'] == true).toList();
      } else if (readLabel == 'Unread') {
        all = all.where((n) => n['isRead'] != true).toList();
      }

      final catLabel = _catFilters[_catFilter];
      if (catLabel != 'All') {
        final cats = _catMatch[catLabel] ?? [];
        all = all.where((n) => cats.contains(n['category'])).toList();
      }

      _notifications = all;
    });
  }

  int get _unreadCount =>
      NotificationService().notifications.where((n) => n['isRead'] != true).length;

  void _markAsRead(dynamic id) {
    NotificationService().markAsRead(id);
  }

  void _markAllRead() {
    NotificationService().markAllRead();
  }

  void _deleteNotification(Map<String, dynamic> notification) {
    NotificationService().deleteNotification(notification['id']);
    _loadNotifications();
  }

  void _handleTap(Map<String, dynamic> notification) {
    _markAsRead(notification['id']);
    final category = notification['category'] as String?;
    final orderId = notification['orderId']?.toString();
    final actionUrl = notification['actionUrl'] as String?;

    if (orderId != null && orderId.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: orderId)),
      );
      return;
    }

    if (actionUrl != null && actionUrl.contains('/orders/')) {
      final m = RegExp(r'/orders/([^/?#]+)').firstMatch(actionUrl);
      if (m != null) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: m.group(1)!)),
        );
        return;
      }
    }

    switch (category) {
      case 'order':
      case 'order_shipped':
        if (orderId != null && orderId.isNotEmpty) {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: orderId)),
          );
        } else {
          context.go(AppRoutes.home);
        }
        break;
      case 'health_tip':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const HealthTipsScreen()),
        );
        break;
      case 'promo':
      case 'reminder':
        context.go(AppRoutes.home);
        break;
      default:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = ColoredBox(
      color: PortalColors.pageBg,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 96),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Notifications',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: PortalColors.slate900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$_unreadCount unread',
                      style: const TextStyle(fontSize: 14, color: PortalColors.slate500),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: _unreadCount == 0 ? null : _markAllRead,
                child: const Text(
                  'Mark all read',
                  style: TextStyle(
                    color: PortalColors.green,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          PortalSegmentedControl(
            options: _readFilters,
            selectedIndex: _readFilter,
            onChanged: (i) {
              setState(() => _readFilter = i);
              _loadNotifications();
            },
          ),
          const SizedBox(height: 16),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(_catFilters.length, (i) {
                return Padding(
                  padding: EdgeInsets.only(right: i < _catFilters.length - 1 ? 8 : 0),
                  child: PortalPillChip(
                    label: _catFilters[i],
                    selected: _catFilter == i,
                    onTap: () {
                      setState(() => _catFilter = i);
                      _loadNotifications();
                    },
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 20),
          if (_notifications.isEmpty)
            const PortalEmptyState(
              icon: Icons.notifications_none_outlined,
              message: 'No notifications found',
            )
          else
            ..._notifications.map(_buildRow),
        ],
      ),
    );

    if (widget.isEmbedded) return body;

    return Scaffold(
      backgroundColor: PortalColors.pageBg,
      body: SafeArea(child: body),
    );
  }

  Widget _buildRow(Map<String, dynamic> notification) {
    final category = notification['category'] as String?;
    final isRead = notification['isRead'] == true;
    final emoji = _catEmoji[category] ?? '🔔';

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: isRead ? Colors.white : PortalColors.greenLight.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: () => _handleTap(notification),
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isRead ? PortalColors.cardBorder : PortalColors.greenBorder,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(emoji, style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        notification['title'] ?? 'Notification',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isRead ? FontWeight.w500 : FontWeight.w700,
                          color: PortalColors.slate900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notification['body'] ?? '',
                        style: const TextStyle(
                          fontSize: 12,
                          color: PortalColors.slate500,
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _formatTime(notification['time']),
                        style: const TextStyle(fontSize: 10, color: PortalColors.slate400),
                      ),
                    ],
                  ),
                ),
                Column(
                  children: [
                    if (!isRead)
                      Container(
                        width: 8,
                        height: 8,
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: const BoxDecoration(
                          color: PortalColors.green,
                          shape: BoxShape.circle,
                        ),
                      ),
                    IconButton(
                      onPressed: () => _deleteNotification(notification),
                      icon: const Icon(Icons.delete_outline, size: 18),
                      color: PortalColors.slate400,
                      visualDensity: VisualDensity.compact,
                      tooltip: 'Delete',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatTime(dynamic time) {
    if (time is! DateTime) return '';
    return portalRelativeTime(time);
  }
}
