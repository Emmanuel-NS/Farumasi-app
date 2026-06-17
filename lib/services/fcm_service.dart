import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:flutter/widgets.dart';

import '../api/repositories/auth_repository.dart';
import '../firebase_options.dart';
import 'notification_navigation.dart';
import 'notification_service.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!DefaultFirebaseOptions.isConfigured) return;
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await NotificationService.showFcmMessage(message);
}

/// Registers the device FCM token with FARUMASI API and handles incoming pushes.
class FcmService {
  FcmService._();
  static final FcmService instance = FcmService._();

  final _authRepo = AuthRepository();
  bool _initialized = false;
  StreamSubscription<String>? _tokenRefreshSub;

  bool get isAvailable => !kIsWeb && DefaultFirebaseOptions.isConfigured;

  Future<void> init() async {
    if (kIsWeb || _initialized) return;
    if (!DefaultFirebaseOptions.isConfigured) {
      debugPrint('FCM: Firebase not configured — skipping (see docs/FCM_SETUP.md)');
      return;
    }

    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);

      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      FirebaseMessaging.onMessage.listen(_onForegroundMessage);
      FirebaseMessaging.onMessageOpenedApp.listen(_onOpenedFromBackground);
      final initial = await messaging.getInitialMessage();
      if (initial != null) {
        _handleNavigation(initial);
      }

      _tokenRefreshSub = messaging.onTokenRefresh.listen((token) {
        unawaited(_syncToken(token));
      });

      _initialized = true;
      unawaited(syncTokenIfLoggedIn());
    } catch (e) {
      debugPrint('FCM init failed: $e');
    }
  }

  Future<void> syncTokenIfLoggedIn() async {
    if (!isAvailable || !_initialized) return;
    if (!await _authRepo.isLoggedIn) return;

    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        await _syncToken(token);
      }
    } catch (e) {
      debugPrint('FCM token fetch failed: $e');
    }
  }

  Future<void> clearTokenOnLogout() async {
    if (!isAvailable) return;
    try {
      await _authRepo.clearFcmToken();
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) {}
  }

  Future<void> _syncToken(String token) async {
    if (!await _authRepo.isLoggedIn) return;
    final platform = kIsWeb
        ? 'web'
        : Platform.isAndroid
            ? 'android'
            : Platform.isIOS
                ? 'ios'
                : 'android';
    try {
      await _authRepo.registerFcmToken(token: token, platform: platform);
    } catch (e) {
      debugPrint('FCM token register failed: $e');
    }
  }

  void _onForegroundMessage(RemoteMessage message) {
    unawaited(NotificationService.showFcmMessage(message));
  }

  void _onOpenedFromBackground(RemoteMessage message) {
    _handleNavigation(message);
  }

  void _handleNavigation(RemoteMessage message) {
    final payload = _extractPayload(message);
    if (payload != null) {
      NotificationNavigation.handle(payload);
    }
  }

  static String? _extractPayload(RemoteMessage message) {
    final data = message.data;
    final direct = data['payload'];
    if (direct != null && direct.isNotEmpty) return direct;

    final type = data['t'];
    if (type == null) return null;

    return NotificationNavigation.encode(
      type: type,
      orderId: data['orderId'],
      consultId: data['consultId'],
      pharmacistId: data['pharmacistId'],
      consultAnonymous: data['anon'] == 'true',
      homeTab: type == 'tab' ? int.tryParse(data['tab'] ?? '0') : null,
      actionUrl: data['url'],
    );
  }

  void dispose() {
    _tokenRefreshSub?.cancel();
    _tokenRefreshSub = null;
  }
}
