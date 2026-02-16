import 'package:flutter/material.dart';
import '../services/notification_service.dart';

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
                return Dismissible(
                  key: Key(notification['time'].toString()),
                  background: Container(color: Colors.red),
                  onDismissed: (direction) {
                     // Optionally remove from service
                  },
                  child: Card(
                    margin:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    elevation: 2,
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Theme.of(context).primaryColor,
                        child: const Icon(Icons.notifications,
                            color: Colors.white),
                      ),
                      title: Text(notification['title'] ?? 'No Title',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Text(notification['body'] ?? 'No Body'),
                          const SizedBox(height: 8),
                          Text(
                            notification['time'].toString().substring(0, 16),
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          await NotificationService().showNotification(
            title: 'Test Notification',
            body: 'This is a test notification generated at ${TimeOfDay.now().format(context)}',
          );
          _loadNotifications(); // Refresh the list
        },
        child: const Icon(Icons.add_alert),
        tooltip: 'Simulate Notification',
      ),
    );
  }
}
