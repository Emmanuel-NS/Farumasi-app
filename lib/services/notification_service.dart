import 'package:flutter/foundation.dart' show kIsWeb, ChangeNotifier;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api/repositories/patient_repository.dart';

class NotificationService extends ChangeNotifier {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  final List<Map<String, dynamic>> notifications = [];
  final List<Map<String, dynamic>> trash = [];
  bool _loading = false;
  String? _error;
  bool _usesApi = false;

  bool get isLoading => _loading;
  String? get error => _error;
  bool get usesApi => _usesApi;

  Future<void> init() async {
    if (kIsWeb) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await flutterLocalNotificationsPlugin.initialize(
      settings: const InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      ),
    );
    await _requestPermissions();
  }

  Future<void> _requestPermissions() async {
    if (kIsWeb) return;
    final android = flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await android?.requestNotificationsPermission();
    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: true);
  }

  Future<void> refreshFromApi({bool authenticated = true}) async {
    if (!authenticated) {
      notifications.clear();
      _usesApi = false;
      _error = null;
      notifyListeners();
      return;
    }

    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final items = await PatientRepository.instance.fetchNotifications();
      notifications
        ..clear()
        ..addAll(items.map(_mapNotification));
      _usesApi = true;
      _error = null;
    } catch (e) {
      _error = 'Could not load notifications';
      if (notifications.isEmpty) {
        _loadFallbackNotifications();
        _usesApi = false;
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Map<String, dynamic> _mapNotification(PatientNotification n) {
    return {
      'id': n.id,
      'title': n.title,
      'body': n.message,
      'time': n.createdAt,
      'category': n.category,
      'isRead': n.isRead,
      'orderId': n.orderId,
      'actionUrl': n.actionUrl,
    };
  }

  void _loadFallbackNotifications() {
    if (notifications.isNotEmpty) return;
    notifications.addAll([
      {
        'id': 'local-1',
        'title': 'Welcome to FARUMASI',
        'body': 'Sign in to receive order and prescription updates.',
        'time': DateTime.now(),
        'category': 'general',
        'isRead': false,
      },
    ]);
  }

  void clearNotifications() {
    trash.addAll(notifications);
    notifications.clear();
    notifyListeners();
  }

  void deleteNotification(dynamic id) {
    final index = notifications.indexWhere((n) => n['id'] == id);
    if (index != -1) {
      trash.add(notifications[index]);
      notifications.removeAt(index);
      notifyListeners();
    }
  }

  void restoreNotification(dynamic id) {
    final index = trash.indexWhere((n) => n['id'] == id);
    if (index != -1) {
      notifications.add(trash[index]);
      notifications.sort((a, b) => (b['time'] as DateTime).compareTo(a['time'] as DateTime));
      trash.removeAt(index);
      notifyListeners();
    }
  }

  Future<void> markAsRead(dynamic id) async {
    final index = notifications.indexWhere((n) => n['id'] == id);
    if (index == -1) return;
    notifications[index]['isRead'] = true;
    if (_usesApi && id is String && !id.startsWith('local-')) {
      try {
        await PatientRepository.instance.markNotificationRead(id);
      } catch (_) {}
    }
    notifyListeners();
  }

  Future<void> markAllRead() async {
    for (final n in notifications) {
      n['isRead'] = true;
    }
    if (_usesApi) {
      try {
        await PatientRepository.instance.markAllNotificationsRead();
      } catch (_) {}
    }
    notifyListeners();
  }

  Future<void> showNotification({
    int id = 0,
    required String title,
    required String body,
    String? payload,
  }) async {
    notifications.insert(0, {
      'id': 'local-$id',
      'title': title,
      'body': body,
      'payload': payload,
      'time': DateTime.now(),
      'category': 'general',
      'isRead': false,
    });
    notifyListeners();

    if (kIsWeb) return;

    const androidDetails = AndroidNotificationDetails(
      'farumasi_channel_id',
      'FARUMASI Notifications',
      channelDescription: 'Main channel for Farumasi app notifications',
      importance: Importance.max,
      priority: Priority.high,
    );
    await flutterLocalNotificationsPlugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: const NotificationDetails(android: androidDetails),
      payload: payload,
    );
  }
}
