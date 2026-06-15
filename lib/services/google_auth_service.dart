import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../api/api_client.dart';

/// Native Google Sign-In → FARUMASI `/auth/oauth/google`.
class GoogleAuthService {
  GoogleAuthService._();

  static GoogleSignIn? _instance;
  static String _webClientId = const String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
    defaultValue: '',
  );
  static bool _configLoaded = false;

  static Future<void> ensureConfigured() async {
    if (_configLoaded) return;
    _configLoaded = true;
    if (_webClientId.isNotEmpty) return;
    try {
      final response = await FarumasiApiClient.instance.dio.get('/config/public');
      final data = response.data;
      if (data is Map) {
        final oauth = data['oauth'];
        if (oauth is Map) {
          final id = oauth['google_web_client_id'];
          if (id is String && id.isNotEmpty) {
            _webClientId = id;
          }
        }
      }
    } catch (e) {
      debugPrint('Google OAuth config fetch failed: $e');
    }
  }

  static GoogleSignIn get _googleSignIn {
    _instance ??= GoogleSignIn(
      scopes: const ['email', 'profile'],
      serverClientId: _webClientId.isNotEmpty ? _webClientId : null,
    );
    return _instance!;
  }

  static Future<GoogleSignInAccount?> signIn() async {
    await ensureConfigured();
    return _googleSignIn.signIn();
  }

  static Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
  }
}
