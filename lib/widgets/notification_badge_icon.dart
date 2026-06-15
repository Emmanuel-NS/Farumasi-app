import 'package:flutter/material.dart';

import '../services/notification_service.dart';

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
                      unread > 99 ? '99+' : '$unread',
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
