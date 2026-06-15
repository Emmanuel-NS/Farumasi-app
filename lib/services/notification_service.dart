import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb, ChangeNotifier;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api/repositories/patient_repository.dart';
import 'app_lifecycle_service.dart';
import 'notification_navigation.dart';

class NotificationService extends ChangeNotifier {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static const _androidChannelId = 'farumasi_channel_id';
  static const _consultChannelId = 'farumasi_consult_channel_id';

  final List<Map<String, dynamic>> notifications = [];
  final List<Map<String, dynamic>> trash = [];
  final Set<String> _pushedIds = {};
  final Set<String> _seenConsultMessageIds = {};
  bool _consultPushInitialized = false;

  bool _loading = false;
  String? _error;
  bool _usesApi = false;
  int _unreadCount = 0;
  Timer? _pollTimer;
  String? Function()? _userIdResolver;
  bool Function()? _authResolver;

  bool get isLoading => _loading;
  String? get error => _error;
  bool get usesApi => _usesApi;
  int get unreadCount =>
      _unreadCount > 0
          ? _unreadCount
          : notifications.where((n) => n['isRead'] != true).length;

  static const _inAppExcludedCategories = {
    'consult',
    'consultation',
    'chat',
    'message',
    'messages',
  };

  Future<void> init() async {
    if (kIsWeb) return;

    const androidSettings = AndroidInitializationSettings('@drawable/ic_notification');
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
      onDidReceiveNotificationResponse: (response) {
        NotificationNavigation.handle(response.payload);
      },
      onDidReceiveBackgroundNotificationResponse: _backgroundNotificationTap,
    );

    final android = flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        _androidChannelId,
        'FARUMASI Notifications',
        description: 'Order updates, payments, and deliveries',
        importance: Importance.max,
      ),
    );
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        _consultChannelId,
        'FARUMASI Consult Messages',
        description: 'New messages from your pharmacist',
        importance: Importance.high,
      ),
    );

    await _requestPermissions();
    await processLaunchNotification();
  }

  @pragma('vm:entry-point')
  static void _backgroundNotificationTap(NotificationResponse response) {
    NotificationNavigation.handle(response.payload);
  }

  Future<void> processLaunchNotification() async {
    if (kIsWeb) return;
    final details = await flutterLocalNotificationsPlugin
        .getNotificationAppLaunchDetails();
    final payload = details?.notificationResponse?.payload;
    if (details?.didNotificationLaunchApp == true && payload != null) {
      NotificationNavigation.handle(payload);
    }
  }

  void configurePolling({
    required bool Function() isAuthenticated,
    required String? Function() userId,
  }) {
    _authResolver = isAuthenticated;
    _userIdResolver = userId;
    startPolling();
  }

  void startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 60), (_) => _pollTick());
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _pollTick() async {
    final authenticated = _authResolver?.call() ?? false;
    if (!authenticated) return;
    await refreshFromApi(authenticated: true);
    await refreshConsultMessagePushes(
      myUserId: _userIdResolver?.call(),
      authenticated: true,
    );
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
      final mapped = items
          .map(_mapNotification)
          .where((n) => !_isExcludedFromInApp(n['category'] as String?))
          .toList();

      for (final n in mapped) {
        final id = '${n['id']}';
        final isUnread = n['isRead'] != true;
        if (isUnread && !previousIds.contains(id) && !_pushedIds.contains(id)) {
          await _showSystemNotification(
            id: id.hashCode,
            title: '${n['title']}',
            body: '${n['body']}',
            payload: _payloadForNotification(n),
            channelId: _androidChannelId,
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

  /// Pharmacist consult messages — push only, never listed in-app.
  Future<void> refreshConsultMessagePushes({
    required String? myUserId,
    bool authenticated = true,
  }) async {
    if (kIsWeb || !authenticated || myUserId == null) return;

    try {
      final consultations = await PatientRepository.instance.fetchConsultations(
        myUserId: myUserId,
      );

      for (final consult in consultations) {
        final pharmacistId = consult.pharmacistId;
        if (pharmacistId == null) continue;

        for (final message in consult.messages) {
          if (message.isFromPatient || message.isRead) continue;

          if (!_consultPushInitialized) {
            _seenConsultMessageIds.add(message.id);
            continue;
          }

          if (_seenConsultMessageIds.contains(message.id)) continue;

          // Skip if user is actively viewing this thread in foreground.
          if (AppLifecycleService.instance.isInForeground) {
            // Consult screen marks read on open; still push if not yet seen.
          }

          final preview = _consultPreview(message);
          await _showSystemNotification(
            id: message.id.hashCode,
            title: consult.isAnonymous
                ? 'Pharmacist message'
                : 'Message from pharmacist',
            body: preview,
            payload: NotificationNavigation.encode(
              type: 'consult',
              consultId: consult.id,
              pharmacistId: pharmacistId,
              consultAnonymous: consult.isAnonymous,
            ),
            channelId: _consultChannelId,
          );
          _seenConsultMessageIds.add(message.id);
        }
      }
      _consultPushInitialized = true;
    } catch (_) {}
  }

  String _consultPreview(PatientConsultMessage message) {
    final text = message.content.trim();
    if (text.isNotEmpty) return text;
    if (message.attachmentType == 'image') return 'Sent an image';
    if (message.attachmentName != null && message.attachmentName!.isNotEmpty) {
      return 'Sent ${message.attachmentName}';
    }
    return 'New consult message';
  }

  bool _isExcludedFromInApp(String? category) {
    if (category == null) return false;
    return _inAppExcludedCategories.contains(category.toLowerCase());
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

  String _payloadForNotification(Map<String, dynamic> n) {
    final orderId = n['orderId']?.toString();
    if (orderId != null && orderId.isNotEmpty) {
      return NotificationNavigation.encode(type: 'order', orderId: orderId);
    }
    final actionUrl = n['actionUrl'] as String?;
    if (actionUrl != null && actionUrl.isNotEmpty) {
      return NotificationNavigation.encode(type: 'url', actionUrl: actionUrl);
    }
    final category = n['category'] as String?;
    if (category == 'health_tip') {
      return NotificationNavigation.encode(type: 'tab', homeTab: 1);
    }
    return NotificationNavigation.encode(type: 'tab', homeTab: 0);
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

    await _showSystemNotification(
      id: id,
      title: title,
      body: body,
      payload: payload,
      channelId: _androidChannelId,
    );
  }

  Future<void> _showSystemNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
    String channelId = _androidChannelId,
  }) async {
    if (kIsWeb) return;

    final preview = body.length > 110 ? '${body.substring(0, 107)}…' : body;

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelId == _consultChannelId
          ? 'FARUMASI Consult Messages'
          : 'FARUMASI Notifications',
      channelDescription: channelId == _consultChannelId
          ? 'New messages from your pharmacist'
          : 'Order updates, payments, and deliveries',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      color: const Color(0xFF1E9E68),
      icon: '@drawable/ic_notification',
      largeIcon: const DrawableResourceAndroidBitmap('@mipmap/launcher_icon'),
      styleInformation: BigTextStyleInformation(
        body,
        contentTitle: title,
        summaryText: 'Tap to open in FARUMASI',
        htmlFormatBigText: false,
      ),
      ticker: title,
    );
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      subtitle: 'FARUMASI',
    );

    await flutterLocalNotificationsPlugin.show(
      id: id,
      title: title,
      body: preview,
      notificationDetails: NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      ),
      payload: payload,
    );
  }
}
