import 'package:flutter/material.dart';

class AppTheme {
  static final ThemeData theme = ThemeData(
    primaryColor: const Color(0xFF1E9E68),
    scaffoldBackgroundColor: Colors.white,
    colorScheme: ColorScheme.fromSwatch().copyWith(
      primary: const Color(0xFF1E9E68),
      secondary: Colors.lightGreen,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: const Color(0xFF1E9E68),
      foregroundColor: Colors.white,
      elevation: 0,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF1E9E68), // background (button) color
        foregroundColor: Colors.white, // foreground (text) color
      ),
    ),
    textTheme: const TextTheme(
      headlineMedium: TextStyle(
        color: const Color(0xFF1E9E68),
        fontWeight: FontWeight.bold,
      ),
      titleLarge: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8.0),
        borderSide: BorderSide(color: const Color(0xFF1E9E68)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8.0),
        borderSide: BorderSide(color: const Color(0xFF1E9E68), width: 2.0),
      ),
      labelStyle: TextStyle(color: const Color(0xFF1E9E68)),
    ),
  );
}
