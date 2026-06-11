import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Persists API JSON locally so the app can work offline with real data only.
class OfflineCacheService {
  OfflineCacheService._();
  static final OfflineCacheService instance = OfflineCacheService._();

  static const _prefix = 'farumasi_cache_';

  Future<void> saveJsonList(String key, List<Map<String, dynamic>> items) async {
    if (items.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_prefix$key', jsonEncode(items));
    await prefs.setString(
      '$_prefix${key}_at',
      DateTime.now().toIso8601String(),
    );
  }

  Future<List<Map<String, dynamic>>?> loadJsonList(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_prefix$key');
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return null;
      return decoded
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (_) {
      return null;
    }
  }

  Future<DateTime?> cachedAt(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_prefix${key}_at');
    if (raw == null) return null;
    return DateTime.tryParse(raw);
  }
}
