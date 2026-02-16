import 'package:flutter/material.dart';
import 'dart:io'; // Import dart:io
import 'screens/home_screen.dart';
import 'theme/app_theme.dart';

// --- VISUAL FIX: SSL Bypass for Emulators ---
class  MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback =
          (X509Certificate cert, String host, int port) => true;
  }
}

void main() {
  // Apply the override before running the app
  HttpOverrides.global = MyHttpOverrides();
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
      home: const HomeScreen(),
    );
  }
}
