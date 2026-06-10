// lib/screens/rider/rider_notifications_screen.dart
// Notifications screen for FARUMASI riders.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../models/rider_models.dart';
import '../../providers/rider_provider.dart';

// Notification type constants
const _kDelivery = 'delivery';
const _kPayment = 'payment';
const _kAlert = 'alert';

class RiderNotificationsScreen extends ConsumerWidget {
  /// Called after popping when a delivery-type notification is tapped.
  /// If null, pops and shows a snackbar hint instead.
  final VoidCallback? onDeliveryTapped;

  /// Called after popping when a payment-type notification is tapped.
  /// If null, pops and shows a snackbar hint instead.
  final VoidCallback? onPaymentTapped;

  const RiderNotificationsScreen({
    super.key,
    this.onDeliveryTapped,
    this.onPaymentTapped,
  });

  void _handleTap(
      BuildContext context, WidgetRef ref, RiderNotificationItem n) {
    ref.read(riderProvider.notifier).markNotificationRead(n.id);

    switch (n.type) {
      case _kDelivery:
        // Capture messenger before pop to keep the reference valid
        final messenger = ScaffoldMessenger.of(context);
        Navigator.pop(context);
        if (onDeliveryTapped != null) {
          onDeliveryTapped!();
        } else {
          messenger.showSnackBar(
            const SnackBar(
              content: Text('Check Home tab for new deliveries.'),
              behavior: SnackBarBehavior.floating,
              duration: Duration(seconds: 3),
            ),
          );
        }
      case _kPayment:
        final messenger = ScaffoldMessenger.of(context);
        Navigator.pop(context);
        if (onPaymentTapped != null) {
          onPaymentTapped!();
        } else {
          messenger.showSnackBar(
            const SnackBar(
              content: Text('Check the Earnings tab for payment details.'),
              behavior: SnackBarBehavior.floating,
              duration: Duration(seconds: 3),
            ),
          );
        }
      default:
        // 'alert', 'system' — already marked read, no navigation needed
        break;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(riderProvider).notifications;
    final unreadCount = ref.watch(riderProvider).unreadNotificationCount;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Notifications',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            if (unreadCount > 0)
              Text(
                '$unreadCount unread',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF1E9E68),
                ),
              ),
          ],
        ),
        actions: [
          if (unreadCount > 0)
            TextButton.icon(
              onPressed: () =>
                  ref.read(riderProvider.notifier).markAllNotificationsRead(),
              icon: const Icon(Icons.done_all_rounded,
                  size: 16, color: Color(0xFF1E9E68)),
              label: const Text(
                'Mark all read',
                style: TextStyle(
                  color: Color(0xFF1E9E68),
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: Colors.grey.shade100),
        ),
      ),
      body: notifications.isEmpty
          ? _EmptyNotifications()
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              physics: const BouncingScrollPhysics(),
              itemCount: notifications.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _NotificationTile(
                notification: notifications[i],
                onTap: () => _handleTap(context, ref, notifications[i]),
              ),
            ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final RiderNotificationItem notification;
  final VoidCallback onTap;

  const _NotificationTile({
    required this.notification,
    required this.onTap,
  });

  Color get _typeColor {
    switch (notification.type) {
      case _kDelivery:
        return const Color(0xFF1E9E68);
      case _kPayment:
        return Colors.blue.shade600;
      case _kAlert:
        return Colors.orange.shade600;
      default:
        return Colors.grey.shade600;
    }
  }

  IconData get _typeIcon {
    switch (notification.type) {
      case _kDelivery:
        return Icons.motorcycle_rounded;
      case _kPayment:
        return Icons.account_balance_wallet_rounded;
      case _kAlert:
        return Icons.warning_amber_rounded;
      default:
        return Icons.info_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: notification.isRead
              ? Colors.white
              : const Color(0xFFE8F5EE),
          borderRadius: BorderRadius.circular(16),
          border: notification.isRead
              ? null
              : Border.all(
                  color: const Color(0xFF1E9E68).withValues(alpha: 0.3),
                  width: 1,
                ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 6,
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: _typeColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(_typeIcon, color: _typeColor, size: 18),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notification.title,
                    style: TextStyle(
                      fontWeight: notification.isRead
                          ? FontWeight.w500
                          : FontWeight.bold,
                      fontSize: 14,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.message,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _timeAgo(notification.createdAt),
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade400,
                    ),
                  ),
                ],
              ),
            ),
            if (!notification.isRead)
              Container(
                width: 10,
                height: 10,
                margin: const EdgeInsets.only(top: 4),
                decoration: const BoxDecoration(
                  color: Color(0xFF1E9E68),
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('d MMM').format(dt);
  }
}

class _EmptyNotifications extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.notifications_none_rounded,
              size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          const Text(
            'No notifications yet',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black54,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Delivery updates and alerts will appear here.',
            style: TextStyle(color: Colors.grey.shade400, fontSize: 14),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
