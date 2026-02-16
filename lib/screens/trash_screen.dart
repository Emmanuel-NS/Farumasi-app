import 'package:flutter/material.dart';
import '../services/notification_service.dart';

class TrashScreen extends StatefulWidget {
  const TrashScreen({super.key});

  @override
  State<TrashScreen> createState() => _TrashScreenState();
}

class _TrashScreenState extends State<TrashScreen> {
  List<Map<String, dynamic>> _trash = [];

  @override
  void initState() {
    super.initState();
    _loadTrash();
  }

  void _loadTrash() {
    setState(() {
      _trash = NotificationService().trash;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trash Bin'),
        centerTitle: true,
      ),
      body: _trash.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.delete_outline, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    'Trash is empty',
                    style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _trash.length,
              itemBuilder: (context, index) {
                final notification = _trash[index];
                return ListTile(
                  leading: const Icon(Icons.delete_forever, color: Colors.red),
                  title: Text(notification['title'] ?? '', style: const TextStyle(decoration: TextDecoration.lineThrough)),
                  subtitle: Text(notification['body'] ?? ''),
                  trailing: IconButton(
                    icon: const Icon(Icons.restore, color: Colors.green),
                    onPressed: () {
                      NotificationService().restoreNotification(notification['id']);
                      _loadTrash();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Notification Restored')),
                      );
                    },
                  ),
                );
              },
            ),
    );
  }
}
