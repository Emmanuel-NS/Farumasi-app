import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../api_client.dart';

const _cachedUserKey = 'farumasi_cached_user';

class RegistrationPending {
  final String email;
  final String message;
  final int expiresMinutes;

  const RegistrationPending({
    required this.email,
    required this.message,
    required this.expiresMinutes,
  });
}

class AuthRepository {
  final _client = FarumasiApiClient.instance;

  Future<AuthResult> login({
    required String emailOrPhone,
    required String password,
  }) async {
    final response = await _client.dio.post('/auth/login', data: {
      'identifier': emailOrPhone.trim(),
      'password': password,
    });

    final data = response.data as Map<String, dynamic>;
    await _client.saveTokens(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
    );

    final user = await getMe();
    if (user != null) await cacheUser(user);
    return AuthResult(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
      user: user,
    );
  }

  Future<RegistrationPending> register({
    required String name,
    required String password,
    String? email,
    String? phone,
    String role = 'patient',
  }) async {
    final response = await _client.dio.post('/auth/register', data: {
      'full_name': name,
      'email': email,
      'phone': phone,
      'password': password,
      'role': role.toLowerCase(),
    });

    final data = response.data as Map<String, dynamic>;
    return RegistrationPending(
      email: data['email'] as String? ?? email ?? '',
      message: data['message'] as String? ?? 'Verification code sent.',
      expiresMinutes: data['expires_minutes'] as int? ?? 10,
    );
  }

  Future<AuthResult> verifyRegistration({
    required String email,
    required String code,
  }) async {
    final response = await _client.dio.post('/auth/verify-registration', data: {
      'email': email.trim(),
      'code': code.trim(),
    });

    final data = response.data as Map<String, dynamic>;
    await _client.saveTokens(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
    );

    final user = await getMe();
    if (user != null) await cacheUser(user);
    return AuthResult(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
      user: user,
    );
  }

  Future<void> resendRegistrationOtp(String email) async {
    await _client.dio.post('/auth/resend-registration-otp', data: {
      'email': email.trim(),
    });
  }

  Future<AuthResult> signInWithGoogle({
    required String email,
    required String fullName,
    String? googleId,
  }) async {
    final response = await _client.dio.post('/auth/oauth/google', data: {
      'email': email,
      'full_name': fullName,
      if (googleId != null) 'google_id': googleId,
    });

    final data = response.data as Map<String, dynamic>;
    await _client.saveTokens(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
    );

    final user = await getMe();
    if (user != null) await cacheUser(user);
    return AuthResult(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
      user: user,
    );
  }

  Future<void> logout() async {
    await _client.clearTokens();
    await clearCachedUser();
  }

  Future<bool> get isLoggedIn async {
    final token = await _client.getAccessToken();
    return token != null;
  }

  Future<void> cacheUser(AuthUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _cachedUserKey,
      jsonEncode({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'role': user.role,
      }),
    );
  }

  Future<AuthUser?> loadCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cachedUserKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      return AuthUser(
        id: data['id'] as String,
        name: data['name'] as String? ?? 'User',
        email: data['email'] as String?,
        phone: data['phone'] as String?,
        role: (data['role'] as String? ?? 'patient').toUpperCase(),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> clearCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cachedUserKey);
  }

  Future<AuthUser?> getMe() async {
    try {
      final response = await _client.dio.get('/users/me');
      final data = response.data as Map<String, dynamic>;
      final user = AuthUser(
        id: data['id'] as String,
        name: data['full_name'] as String? ?? 'User',
        email: data['email'] as String?,
        phone: data['phone'] as String?,
        role: (data['role'] as String? ?? 'patient').toUpperCase(),
      );
      await cacheUser(user);
      return user;
    } catch (_) {
      return null;
    }
  }

  Future<AuthUser> updateMe({
    String? fullName,
    String? email,
    String? phone,
    String? preferredLanguage,
  }) async {
    final response = await _client.dio.put('/users/me', data: {
      if (fullName != null) 'full_name': fullName,
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
      if (preferredLanguage != null) 'preferred_language': preferredLanguage,
    });
    final data = response.data as Map<String, dynamic>;
    return AuthUser(
      id: data['id'] as String,
      name: data['full_name'] as String? ?? 'User',
      email: data['email'] as String?,
      phone: data['phone'] as String?,
      role: (data['role'] as String? ?? 'patient').toUpperCase(),
    );
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _client.dio.post('/auth/change-password', data: {
      'current_password': currentPassword,
      'new_password': newPassword,
    });
  }

  Future<void> logoutEverywhere() async {
    await _client.dio.post('/auth/logout-everywhere');
    await _client.clearTokens();
  }

  Future<void> requestDataExport() async {
    await _client.dio.post('/users/me/export-data');
  }

  Future<void> deleteAccount({required String password}) async {
    await _client.dio.delete('/users/me', data: {'password': password});
    await _client.clearTokens();
  }
}

class AuthResult {
  final String accessToken;
  final String refreshToken;
  final AuthUser? user;

  const AuthResult({
    required this.accessToken,
    required this.refreshToken,
    this.user,
  });
}

class AuthUser {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String role;

  const AuthUser({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    required this.role,
  });
}
