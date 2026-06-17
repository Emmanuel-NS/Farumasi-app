import 'dart:async';
import 'dart:ui' show DartPluginRegistrant;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/widgets.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'background_poll_core.dart';

/// Low-importance channel for the Android foreground service (not user alerts).
const _serviceChannelId = 'farumasi_bg_service';
const _serviceNotificationId = 889;

Future<void> ensureBackgroundPollingConfigured() async {
  if (kIsWeb) return;

  const serviceChannel = AndroidNotificationChannel(
    _serviceChannelId,
    'FARUMASI background',
    description: 'Keeps message alerts working when the screen is off',
    importance: Importance.low,
  );

  final localNotifications = FlutterLocalNotificationsPlugin();
  await localNotifications
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(serviceChannel);

  final service = FlutterBackgroundService();
  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: _onBackgroundServiceStart,
      autoStart: false,
      isForegroundMode: true,
      notificationChannelId: _serviceChannelId,
      initialNotificationTitle: 'FARUMASI',
      initialNotificationContent: 'Listening for new messages',
      foregroundServiceNotificationId: _serviceNotificationId,
      foregroundServiceTypes: [AndroidForegroundType.dataSync],
    ),
    iosConfiguration: IosConfiguration(
      autoStart: false,
      onForeground: _onBackgroundServiceStart,
      onBackground: _onIosBackground,
    ),
  );
}

@pragma('vm:entry-point')
Future<bool> _onIosBackground(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();
  await pollAndNotifyInBackground();
  return true;
}

@pragma('vm:entry-point')
void _onBackgroundServiceStart(ServiceInstance service) {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();

  if (service is AndroidServiceInstance) {
    service.setAsForegroundService();
    service.on('stopService').listen((_) => service.stopSelf());
  }

  unawaited(_backgroundPollLoop(service));
}

Future<void> _backgroundPollLoop(ServiceInstance service) async {
  await _pollIfLoggedIn(service);

  Timer? timer;
  timer = Timer.periodic(const Duration(seconds: 45), (_) async {
    if (service is AndroidServiceInstance && !(await service.isForegroundService())) {
      timer?.cancel();
      return;
    }
    await _pollIfLoggedIn(service);
  });
}

Future<void> _pollIfLoggedIn(ServiceInstance service) async {
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('farumasi_access_token');
  if (token == null || token.isEmpty) {
    if (service is AndroidServiceInstance) {
      service.stopSelf();
    }
    return;
  }

  try {
    await pollAndNotifyInBackground();
  } catch (_) {}

  if (service is AndroidServiceInstance) {
    await service.setForegroundNotificationInfo(
      title: 'FARUMASI',
      content: 'Listening for new messages',
    );
  }
}

Future<void> startBackgroundPolling() async {
  if (kIsWeb) return;
  final service = FlutterBackgroundService();
  final running = await service.isRunning();
  if (!running) {
    await service.startService();
  }
}

Future<void> stopBackgroundPolling() async {
  if (kIsWeb) return;
  final service = FlutterBackgroundService();
  if (await service.isRunning()) {
    service.invoke('stopService');
  }
}

Future<void> scheduleBackgroundPollSoon() async {}

Future<void> initBackgroundNotificationWorker() async {
  await ensureBackgroundPollingConfigured();
}

Future<void> registerBackgroundNotificationPolling() async {
  await ensureBackgroundPollingConfigured();
}

Future<void> cancelBackgroundNotificationPolling() async {
  await stopBackgroundPolling();
}
