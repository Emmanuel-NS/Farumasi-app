import 'package:flutter/material.dart';
import 'dart:io'; // Import dart:io
import 'screens/splash_screen.dart'; // Import Splash Screen
import 'theme/app_theme.dart';
import 'services/notification_service.dart'; // Import NotificationService

// --- VISUAL FIX: SSL Bypass for Emulators ---
class  MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback =
          (X509Certificate cert, String host, int port) => true;
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Apply the override before running the app
  HttpOverrides.global = MyHttpOverrides();
  
  // Initialize Notification Service
  try {
    await NotificationService().init();
  } catch (e) {
    debugPrint('Failed to init notifications: $e');
  }

  runApp(const FarumasiApp());
}

class FarumasiApp extends StatelessWidget {
  const FarumasiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Farumasi',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: const SplashScreen(),
    );
  }
}
