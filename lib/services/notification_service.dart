import 'package:flutter/foundation.dart' show kIsWeb, ChangeNotifier;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api/repositories/patient_repository.dart';

class NotificationService extends ChangeNotifier {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static const _androidChannelId = 'farumasi_channel_id';

  final List<Map<String, dynamic>> notifications = [];
  final List<Map<String, dynamic>> trash = [];
  final Set<String> _pushedIds = {};

  bool _loading = false;
  String? _error;
  bool _usesApi = false;
  int _unreadCount = 0;

  bool get isLoading => _loading;
  String? get error => _error;
  bool get usesApi => _usesApi;
  int get unreadCount =>
      _unreadCount > 0
          ? _unreadCount
          : notifications.where((n) => n['isRead'] != true).length;

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

    final android = flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        _androidChannelId,
        'FARUMASI Notifications',
        description: 'Order updates, payments, and messages',
        importance: Importance.max,
      ),
    );

    await _requestPermissions();
  }

  Future<void> _requestPermissions() async {
    if (kIsWeb) return;
    final android = flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await android?.requestNotificationsPermission();
    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: true);
  }

  Future<void> refreshFromApi({bool authenticated = true}) async {
    if (!authenticated) {
      notifications.clear();
      _usesApi = false;
      _error = null;
      _unreadCount = 0;
      notifyListeners();
      return;
    }

    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final previousIds = notifications.map((n) => '${n['id']}').toSet();
      final items = await PatientRepository.instance.fetchNotifications();
      final mapped = items.map(_mapNotification).toList();

      for (final n in mapped) {
        final id = '${n['id']}';
        final isUnread = n['isRead'] != true;
        if (isUnread && !previousIds.contains(id) && !_pushedIds.contains(id)) {
          await _showSystemNotification(
            id: id.hashCode,
            title: '${n['title']}',
            body: '${n['body']}',
          );
          _pushedIds.add(id);
        }
      }

      notifications
        ..clear()
        ..addAll(mapped);

      _unreadCount = await PatientRepository.instance.fetchUnreadNotificationCount();
      _usesApi = true;
      _error = null;
    } catch (e) {
      _error = 'Could not load notifications';
      _usesApi = notifications.isNotEmpty;
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

  void clearNotifications() {
    trash.addAll(notifications);
    notifications.clear();
    _unreadCount = 0;
    notifyListeners();
  }

  void deleteNotification(dynamic id) {
    final index = notifications.indexWhere((n) => n['id'] == id);
    if (index != -1) {
      if (notifications[index]['isRead'] != true && _unreadCount > 0) {
        _unreadCount--;
      }
      trash.add(notifications[index]);
      notifications.removeAt(index);
      notifyListeners();
    }
  }

  void restoreNotification(dynamic id) {
    final index = trash.indexWhere((n) => n['id'] == id);
    if (index != -1) {
      notifications.add(trash[index]);
      notifications.sort(
        (a, b) => (b['time'] as DateTime).compareTo(a['time'] as DateTime),
      );
      trash.removeAt(index);
      notifyListeners();
    }
  }

  Future<void> markAsRead(dynamic id) async {
    final index = notifications.indexWhere((n) => n['id'] == id);
    if (index == -1) return;
    if (notifications[index]['isRead'] != true) {
      notifications[index]['isRead'] = true;
      if (_unreadCount > 0) _unreadCount--;
    }
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
    _unreadCount = 0;
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
    _unreadCount++;
    notifyListeners();

    await _showSystemNotification(id: id, title: title, body: body, payload: payload);
  }

  Future<void> _showSystemNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    if (kIsWeb) return;

    const androidDetails = AndroidNotificationDetails(
      _androidChannelId,
      'FARUMASI Notifications',
      channelDescription: 'Order updates, payments, and messages',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      icon: '@mipmap/ic_launcher',
    );
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    await flutterLocalNotificationsPlugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: const NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      ),
      payload: payload,
    );
  }
}
