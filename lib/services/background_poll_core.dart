import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'notification_navigation.dart';
import 'notification_prefs.dart';

const _accessTokenKey = 'farumasi_access_token';
const _refreshTokenKey = 'farumasi_refresh_token';
const _apiBaseUrlKey = 'farumasi_api_base_url';
const _androidChannelId = 'farumasi_channel_id';
const _consultChannelId = 'farumasi_consult_channel_id';

Future<void> persistApiBaseUrlForBackground(String baseUrl) async {
  if (kIsWeb || baseUrl.isEmpty) return;
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_apiBaseUrlKey, baseUrl);
}

String _readApiBaseUrl(SharedPreferences prefs) {
  final stored = prefs.getString(_apiBaseUrlKey);
  if (stored != null && stored.isNotEmpty) return stored;
  const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  if (fromEnv.isNotEmpty) return fromEnv;
  if (kIsWeb) return 'http://127.0.0.1:8000/api/v1';
  if (defaultTargetPlatform == TargetPlatform.android) {
    return 'https://farumasi-app.onrender.com/api/v1';
  }
  return 'http://127.0.0.1:8000/api/v1';
}

Future<void> pollAndNotifyInBackground() async {
  if (kIsWeb) return;

  final prefs = await SharedPreferences.getInstance();
  var accessToken = prefs.getString(_accessTokenKey);
  if (accessToken == null || accessToken.isEmpty) return;

  final dio = Dio(BaseOptions(
    baseUrl: _readApiBaseUrl(prefs),
    connectTimeout: const Duration(seconds: 25),
    receiveTimeout: const Duration(seconds: 25),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer $accessToken',
    },
  ));

  Future<void> run() async {
    final notifResponse = await dio.get('/notifications/', queryParameters: {'limit': 30});
    final items = (notifResponse.data as List<dynamic>?) ?? const [];
    await _showNewNotifications(prefs, items);

    final consultResponse = await dio.get('/consultations/', queryParameters: {'limit': 50});
    final consultData = consultResponse.data;
    final List<dynamic> consultItems;
    if (consultData is Map && consultData['items'] is List) {
      consultItems = consultData['items'] as List;
    } else if (consultData is List) {
      consultItems = consultData;
    } else {
      consultItems = const [];
    }
    await _showNewConsultMessages(prefs, consultItems);
  }

  try {
    await run();
  } on DioException catch (e) {
    if (e.response?.statusCode != 401) return;
    final refreshed = await _tryRefreshToken(prefs, dio);
    if (!refreshed) return;
    accessToken = prefs.getString(_accessTokenKey);
    if (accessToken == null) return;
    dio.options.headers['Authorization'] = 'Bearer $accessToken';
    try {
      await run();
    } catch (_) {}
  } catch (_) {}
}

Future<bool> _tryRefreshToken(SharedPreferences prefs, Dio dio) async {
  final refreshToken = prefs.getString(_refreshTokenKey);
  if (refreshToken == null || refreshToken.isEmpty) return false;
  try {
    final response = await dio.post('/auth/refresh', data: {'refresh_token': refreshToken});
    final data = response.data as Map<String, dynamic>;
    await prefs.setString(_accessTokenKey, data['access_token'] as String);
    await prefs.setString(_refreshTokenKey, data['refresh_token'] as String);
    return true;
  } catch (_) {
    return false;
  }
}

Future<void> _showNewNotifications(
  SharedPreferences prefs,
  List<dynamic> items,
) async {
  final seen = _loadStringSet(prefs, kSeenNotificationIdsKey);
  final plugin = await _ensurePlugin();

  for (final raw in items) {
    if (raw is! Map) continue;
    final map = Map<String, dynamic>.from(raw);
    final id = '${map['id']}';
    final isRead = map['is_read'] == true || map['isRead'] == true;
    if (isRead || id.isEmpty || seen.contains(id)) continue;

    final title = (map['title'] as String?)?.trim();
    if (title == null || title.isEmpty) continue;
    final body = (map['message'] as String?)?.trim() ??
        (map['body'] as String?)?.trim() ??
        'Open FARUMASI to view';

    final orderId = map['order_id']?.toString();
    final payload = orderId != null && orderId.isNotEmpty
        ? NotificationNavigation.encode(type: 'order', orderId: orderId)
        : NotificationNavigation.encode(type: 'tab', homeTab: 0);

    await plugin.show(
      id: id.hashCode,
      title: title,
      body: body.length > 110 ? '${body.substring(0, 107)}…' : body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannelId,
          'FARUMASI Notifications',
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
    seen.add(id);
  }

  await _saveStringSet(prefs, kSeenNotificationIdsKey, seen);
}

Future<void> _showNewConsultMessages(
  SharedPreferences prefs,
  List<dynamic> consultItems,
) async {
  final seen = _loadStringSet(prefs, kSeenConsultMessageIdsKey);
  final lastPollMs = prefs.getInt(kConsultLastPollMsKey) ?? 0;
  final lastPollAt = DateTime.fromMillisecondsSinceEpoch(lastPollMs);
  final plugin = await _ensurePlugin();
  var pushedAny = false;

  for (final raw in consultItems) {
    if (raw is! Map) continue;
    final consult = Map<String, dynamic>.from(raw);
    final consultId = '${consult['id']}';
    final pharmacistId = consult['pharmacist_id']?.toString();
    if (consultId.isEmpty || pharmacistId == null) continue;
    final isAnonymous = consult['is_anonymous'] == true;

    final messages = consult['messages'] as List<dynamic>? ?? const [];
    for (final msgRaw in messages) {
      if (msgRaw is! Map) continue;
      final msg = Map<String, dynamic>.from(msgRaw);
      final messageId = '${msg['id']}';
      if (messageId.isEmpty || seen.contains(messageId)) continue;

      if (msg['is_read'] == true) continue;

      final senderId = msg['sender_id']?.toString();
      final patientId = consult['patient_id']?.toString();
      if (senderId != null && patientId != null && senderId == patientId) continue;

      final sentAtRaw = msg['sent_at'] as String? ?? msg['created_at'] as String?;
      final sentAt = sentAtRaw != null ? DateTime.tryParse(sentAtRaw) : null;
      if (sentAt == null) continue;

      final isNewSincePoll = sentAt.isAfter(lastPollAt);
      final isRecent =
          DateTime.now().difference(sentAt) < const Duration(hours: 48);
      if (!isNewSincePoll && !isRecent) {
        seen.add(messageId);
        continue;
      }

      final content = (msg['content'] as String?)?.trim() ?? '';
      final body = content.isNotEmpty
          ? content
          : (msg['attachment_type'] == 'image' ? 'Sent an image' : 'New consult message');

      await plugin.show(
        id: messageId.hashCode,
        title: isAnonymous ? 'Pharmacist message' : 'Message from pharmacist',
        body: body.length > 110 ? '${body.substring(0, 107)}…' : body,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            _consultChannelId,
            'FARUMASI Consult Messages',
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
        payload: NotificationNavigation.encode(
          type: 'consult',
          consultId: consultId,
          pharmacistId: pharmacistId,
          consultAnonymous: isAnonymous,
        ),
      );
      seen.add(messageId);
      pushedAny = true;
    }
  }

  await prefs.setInt(kConsultLastPollMsKey, DateTime.now().millisecondsSinceEpoch);
  if (pushedAny || seen.isNotEmpty) {
    await _saveStringSet(prefs, kSeenConsultMessageIdsKey, seen);
  }
}

Future<FlutterLocalNotificationsPlugin> _ensurePlugin() async {
  final plugin = FlutterLocalNotificationsPlugin();
  const androidInit = AndroidInitializationSettings('@drawable/ic_notification');
  const iosInit = DarwinInitializationSettings();
  await plugin.initialize(
    settings: const InitializationSettings(android: androidInit, iOS: iosInit),
  );

  final android = plugin.resolvePlatformSpecificImplementation<
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
  return plugin;
}

Set<String> _loadStringSet(SharedPreferences prefs, String key) {
  final raw = prefs.getStringList(key);
  if (raw == null) return <String>{};
  return raw.toSet();
}

Future<void> _saveStringSet(SharedPreferences prefs, String key, Set<String> seen) async {
  final trimmed = seen.toList();
  if (trimmed.length > 300) {
    trimmed.removeRange(0, trimmed.length - 300);
  }
  await prefs.setStringList(key, trimmed);
}
