import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb, ChangeNotifier;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api/repositories/patient_repository.dart';
import 'app_lifecycle_service.dart';
import 'background_polling_service.dart';
import 'notification_navigation.dart';
import 'notification_prefs.dart';
import 'state_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  bool _consultPrefsLoaded = false;
  bool _notificationsBootstrap = false;

  bool _loading = false;
  String? _error;
  bool _usesApi = false;
  int _unreadCount = 0;
  Timer? _pollTimer;
  Timer? _consultPollTimer;
  Duration _pollInterval = const Duration(seconds: 60);
  static const _consultPollInterval = Duration(seconds: 20);
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
        importance: Importance.max,
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
    if (isAuthenticated()) {
      unawaited(registerBackgroundNotificationPolling());
      unawaited(_ensureConsultPrefsLoaded());
    }
    startPolling();
    _startConsultPolling();
    unawaited(refreshConsultMessagePushes(
      myUserId: userId(),
      authenticated: isAuthenticated(),
    ));
  }

  void adaptPollingForForeground(bool inForeground) {
    startPolling(
      interval: inForeground
          ? const Duration(seconds: 60)
          : const Duration(minutes: 2),
    );
    _startConsultPolling(
      interval: inForeground
          ? _consultPollInterval
          : const Duration(seconds: 45),
    );
    if (!inForeground) {
      unawaited(startBackgroundPolling());
    } else {
      unawaited(stopBackgroundPolling());
    }
  }

  void _startConsultPolling({Duration? interval}) {
    final every = interval ?? _consultPollInterval;
    _consultPollTimer?.cancel();
    _consultPollTimer = Timer.periodic(every, (_) => _consultPollTick());
  }

  Future<void> _consultPollTick() async {
    final authenticated = _authResolver?.call() ?? false;
    if (!authenticated) return;
    await refreshConsultMessagePushes(
      myUserId: _userIdResolver?.call(),
      authenticated: true,
    );
  }

  Future<void> _ensureConsultPrefsLoaded() async {
    if (_consultPrefsLoaded) return;
    final prefs = await SharedPreferences.getInstance();
    _seenConsultMessageIds.addAll(prefs.getStringList(kSeenConsultMessageIdsKey) ?? const []);
    final lastPollMs = prefs.getInt(kConsultLastPollMsKey);
    if (lastPollMs == null) {
      await prefs.setInt(kConsultLastPollMsKey, DateTime.now().millisecondsSinceEpoch);
    }
    _consultPrefsLoaded = true;
  }

  Future<void> _persistSeenConsultIds() async {
    final prefs = await SharedPreferences.getInstance();
    final list = _seenConsultMessageIds.toList();
    if (list.length > 300) {
      list.removeRange(0, list.length - 300);
      _seenConsultMessageIds
        ..clear()
        ..addAll(list);
    }
    await prefs.setStringList(kSeenConsultMessageIdsKey, list);
  }

  void startPolling({Duration? interval}) {
    if (interval != null) _pollInterval = interval;
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_pollInterval, (_) => _pollTick());
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _consultPollTimer?.cancel();
    _consultPollTimer = null;
  }

  Future<void> _pollTick() async {
    final authenticated = _authResolver?.call() ?? false;
    if (!authenticated) return;
    await refreshFromApi(authenticated: true);
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
      _notificationsBootstrap = false;
      await cancelBackgroundNotificationPolling();
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

      if (!_notificationsBootstrap) {
        for (final n in mapped) {
          if (n['isRead'] != true) {
            _pushedIds.add('${n['id']}');
          }
        }
        _notificationsBootstrap = true;
      } else {
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

  /// Pharmacist consult messages — system popup, not listed in the notifications tab.
  Future<void> refreshConsultMessagePushes({
    required String? myUserId,
    bool authenticated = true,
  }) async {
    if (kIsWeb || !authenticated || myUserId == null) return;

    await _ensureConsultPrefsLoaded();
    final prefs = await SharedPreferences.getInstance();
    final lastPollMs = prefs.getInt(kConsultLastPollMsKey) ?? 0;
    final lastPollAt = DateTime.fromMillisecondsSinceEpoch(lastPollMs);
    final openConsultId = StateService().activeOpenConsultId;
    final inForeground = AppLifecycleService.instance.isInForeground;
    var pushedAny = false;

    try {
      final consultations = await PatientRepository.instance.fetchConsultations(
        myUserId: myUserId,
      );

      for (final consult in consultations) {
        final pharmacistId = consult.pharmacistId;
        if (pharmacistId == null) continue;

        final viewingThisThread =
            inForeground && openConsultId != null && openConsultId == consult.id;

        for (final message in consult.messages) {
          if (message.isFromPatient || message.isRead) continue;
          if (_seenConsultMessageIds.contains(message.id)) continue;

          // User is actively reading this chat — mark seen, no popup.
          if (viewingThisThread) {
            _seenConsultMessageIds.add(message.id);
            continue;
          }

          // Only alert for messages that arrived since we last polled (or are very recent).
          final isNewSincePoll = message.createdAt.isAfter(lastPollAt);
          final isVeryRecent =
              DateTime.now().difference(message.createdAt) < const Duration(minutes: 3);
          if (!isNewSincePoll && !isVeryRecent) {
            _seenConsultMessageIds.add(message.id);
            continue;
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
          pushedAny = true;
        }
      }

      await prefs.setInt(kConsultLastPollMsKey, DateTime.now().millisecondsSinceEpoch);
      if (pushedAny || _seenConsultMessageIds.isNotEmpty) {
        await _persistSeenConsultIds();
      }
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
      channelShowBadge: true,
      playSound: true,
      enableVibration: true,
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

  /// Show a push delivered by Firebase (foreground or background isolate).
  static Future<void> showFcmMessage(RemoteMessage message) async {
    if (kIsWeb) return;

    final data = message.data;
    final title = message.notification?.title ?? 'FARUMASI';
    final body = message.notification?.body ?? '';
    if (body.isEmpty && title == 'FARUMASI') return;

    final channelId = data['channel_id'] ?? _androidChannelId;
    final isConsult = channelId == _consultChannelId;

    String? payload = data['payload'];
    if (payload == null || payload.isEmpty) {
      final type = data['t'];
      if (type != null) {
        payload = NotificationNavigation.encode(
          type: type,
          orderId: data['orderId'],
          consultId: data['consultId'],
          pharmacistId: data['pharmacistId'],
          consultAnonymous: data['anon'] == 'true',
          homeTab: type == 'tab' ? int.tryParse(data['tab'] ?? '0') : null,
          actionUrl: data['url'],
        );
      }
    }

    final plugin = FlutterLocalNotificationsPlugin();
    const androidInit = AndroidInitializationSettings('@drawable/ic_notification');
    await plugin.initialize(
      settings: const InitializationSettings(
        android: androidInit,
        iOS: DarwinInitializationSettings(),
      ),
    );

    final android = plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(
      AndroidNotificationChannel(
        _androidChannelId,
        'FARUMASI Notifications',
        importance: Importance.max,
      ),
    );
    await android?.createNotificationChannel(
      AndroidNotificationChannel(
        _consultChannelId,
        'FARUMASI Consult Messages',
        importance: Importance.max,
      ),
    );

    final id = (payload ?? title).hashCode;
    await plugin.show(
      id: id,
      title: title,
      body: body.length > 110 ? '${body.substring(0, 107)}…' : body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          isConsult ? _consultChannelId : _androidChannelId,
          isConsult ? 'FARUMASI Consult Messages' : 'FARUMASI Notifications',
          importance: Importance.max,
          priority: Priority.high,
          icon: '@drawable/ic_notification',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }
}
