import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Supported app languages (matches patient portal).
enum AppLanguage { en, rw, fr, sw }

class LanguageService extends ChangeNotifier {
  LanguageService._();
  static final LanguageService instance = LanguageService._();

  static const _key = 'farumasi_app_lang';

  AppLanguage _lang = AppLanguage.en;
  AppLanguage get lang => _lang;

  String get code {
    switch (_lang) {
      case AppLanguage.en:
        return 'en';
      case AppLanguage.rw:
        return 'rw';
      case AppLanguage.fr:
        return 'fr';
      case AppLanguage.sw:
        return 'sw';
    }
  }

  Future<void> hydrate() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_key);
    if (stored != null) {
      _lang = AppLanguage.values.firstWhere(
        (l) => l.name == stored,
        orElse: () => AppLanguage.en,
      );
      notifyListeners();
    }
  }

  Future<void> setLanguage(AppLanguage lang) async {
    _lang = lang;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, lang.name);
  }

  String t(String en, {String? rw, String? fr, String? sw}) {
    switch (_lang) {
      case AppLanguage.rw:
        return rw ?? en;
      case AppLanguage.fr:
        return fr ?? en;
      case AppLanguage.sw:
        return sw ?? en;
      case AppLanguage.en:
        return en;
    }
  }
}
