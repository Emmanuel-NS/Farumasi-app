import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'dart:io';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();

  factory NotificationService() {
    return _instance;
  }

  NotificationService._internal();

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  Future<void> init() async {
    // Android Initialization
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS Initialization (darwin)
    final DarwinInitializationSettings initializationSettingsDarwin =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    final InitializationSettings initializationSettings =
        InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsDarwin,
      // macOS: initializationSettingsDarwin, // Add this if you support macOS
    );

    await flutterLocalNotificationsPlugin.initialize(
      settings: initializationSettings,
      onDidReceiveNotificationResponse:
          (NotificationResponse notificationResponse) async {
        // Handle notification tap
      },
    );

    // Request permissions
    await _requestPermissions();
  }

  Future<void> _requestPermissions() async {
    if (Platform.isAndroid) {
      final AndroidFlutterLocalNotificationsPlugin? androidImplementation =
          flutterLocalNotificationsPlugin.resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();

      if (androidImplementation != null) {
        await androidImplementation.requestNotificationsPermission();
      }
    } else if (Platform.isIOS) {
       await flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          );
    }
  }

  final List<Map<String, dynamic>> notifications = [];

  void clearNotifications() {
    notifications.clear();
  }

  void loadDummyNotifications() {
    if (notifications.isNotEmpty) return;
    
    final dummyData = [
      {
        'id': 101,
        'title': 'Order Confirmed',
        'body': 'Your order #ORD-2024-001 has been confirmed and is being processed.',
        'time': DateTime.now().subtract(const Duration(days: 5, hours: 2)),
      },
      {
        'id': 102,
        'title': 'Did You Know?',
        'body': 'Drinking water before meals can help you feel fuller and aid in weight management.',
        'time': DateTime.now().subtract(const Duration(days: 4, hours: 9)),
      },
      {
        'id': 103,
        'title': 'Prescription Refill',
        'body': 'Reminder: Your prescription for Amoxicillin is due for a refill in 3 days.',
        'time': DateTime.now().subtract(const Duration(days: 3, hours: 1)),
      },
      {
        'id': 104,
        'title': 'Order Shipped',
        'body': 'Great news! Your order #ORD-2024-001 has been shipped. Track it now.',
        'time': DateTime.now().subtract(const Duration(days: 2, hours: 5)),
      },
      {
        'id': 105,
        'title': 'Health Tip: Sleep',
        'body': 'Adults needs 7-9 hours of sleep. A good night\'s rest improves memory and mood.',
        'time': DateTime.now().subtract(const Duration(days: 1, hours: 14)),
      },
      {
        'id': 106,
        'title': 'Flash Sale Alert! ⚡',
        'body': 'Get 20% off all Vitamin C supplements this weekend only. Shop now!',
        'time': DateTime.now().subtract(const Duration(hours: 22)),
      },
      {
        'id': 107,
        'title': 'Order Delivered',
        'body': 'Package Delivered! Your order #ORD-2024-001 has arrived at your doorstep.',
        'time': DateTime.now().subtract(const Duration(hours: 5)),
      },
      {
        'id': 108,
        'title': 'Flu Season Reminder',
        'body': 'Flu season is here. Book your vaccination appointment at a nearby clinic through Farumasi.',
        'time': DateTime.now().subtract(const Duration(hours: 2)),
      },
      {
        'id': 109,
        'title': 'Appointment Reminder',
        'body': 'You have a tele-consultation with Dr. Amani starting in 15 minutes.',
        'time': DateTime.now().subtract(const Duration(minutes: 45)),
      },
      {
        'id': 110,
        'title': 'We value your feedback',
        'body': 'How was your recent experience with Farumasi? Rate your order.',
        'time': DateTime.now().subtract(const Duration(minutes: 5)),
      },
    ];

    notifications.addAll(dummyData);
  }

  Future<void> showNotification({
    int id = 0,
    required String title,
    required String body,
    String? payload,
  }) async {
    // Add to local history list
    notifications.add({
      'id': id,
      'title': title,
      'body': body,
      'payload': payload,
      'time': DateTime.now(),
    });

    const AndroidNotificationDetails androidNotificationDetails =
        AndroidNotificationDetails(
      'farumasi_channel_id',
      'Farumasi Notifications',
      channelDescription: 'Main channel for Farumasi app notifications',
      importance: Importance.max,
      priority: Priority.high,
      ticker: 'ticker',
    );

    const NotificationDetails notificationDetails =
        NotificationDetails(android: androidNotificationDetails);

    await flutterLocalNotificationsPlugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: notificationDetails,
      payload: payload,
    );
  }
}
