import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../screens/notification_screen.dart';
import '../services/notification_service.dart';
import '../utils/badge_format.dart';

/// Bell icon with live unread count from [NotificationService].
class NotificationBadgeIcon extends StatelessWidget {
  const NotificationBadgeIcon({
    super.key,
    required this.onPressed,
    this.iconColor = Colors.white,
    this.icon = Icons.notifications_none,
    this.tooltip = 'Notifications',
    this.padding = EdgeInsets.zero,
  });

  final VoidCallback onPressed;
  final Color iconColor;
  final IconData icon;
  final String tooltip;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: NotificationService(),
      builder: (context, _) {
        final unread = NotificationService().unreadCount;
        return Padding(
          padding: padding,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: Icon(icon, color: iconColor),
                tooltip: tooltip,
                onPressed: onPressed,
              ),
              if (unread > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                    constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                    child: Text(
                      formatBadgeCount(unread),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        height: 1.1,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// Notifications are only available to signed-in patients.
class AuthNotificationBadgeIcon extends ConsumerWidget {
  const AuthNotificationBadgeIcon({
    super.key,
    this.iconColor = Colors.white,
    this.icon = Icons.notifications_none,
    this.padding = EdgeInsets.zero,
  });

  final Color iconColor;
  final IconData icon;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(authProvider).status != AuthStatus.authenticated) {
      return const SizedBox.shrink();
    }

    return NotificationBadgeIcon(
      iconColor: iconColor,
      icon: icon,
      padding: padding,
      onPressed: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const NotificationScreen()),
        );
      },
    );
  }
}
