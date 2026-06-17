import 'dart:async';

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

import '../services/background_poll_core.dart';

/// Central Dio HTTP client for FARUMASI API.
///
/// Override base URL via --dart-define=API_BASE_URL=...
class FarumasiApiClient {
  static FarumasiApiClient? _instance;
  static FarumasiApiClient get instance => _instance ??= FarumasiApiClient._();

  late final Dio dio;

  static const String _accessTokenKey = 'farumasi_access_token';
  static const String _refreshTokenKey = 'farumasi_refresh_token';

  static final String baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  ).isNotEmpty
      ? const String.fromEnvironment('API_BASE_URL')
      : _defaultBaseUrl;

  static String get _defaultBaseUrl {
    if (kIsWeb) return 'http://127.0.0.1:8000/api/v1';
    if (defaultTargetPlatform == TargetPlatform.android) {
      // 10.0.2.2 is emulator-only; physical phones cannot reach the dev machine that way.
      // Override with --dart-define=API_BASE_URL=... for local API or emulator (10.0.2.2).
      return 'https://farumasi-app.onrender.com/api/v1';
    }
    return 'http://127.0.0.1:8000/api/v1';
  }

  FarumasiApiClient._() {
    if (!kIsWeb) {
      unawaited(persistApiBaseUrlForBackground(baseUrl));
    }
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    dio.interceptors.add(_AuthInterceptor(dio));

    // Full body logging on web debug freezes the UI when responses are large.
    if (kDebugMode) {
      dio.interceptors.add(LogInterceptor(
        requestHeader: false,
        requestBody: false,
        responseHeader: false,
        responseBody: false,
        error: true,
      ));
    }
  }

  String? _memoryAccessToken;
  static void Function()? onSessionExpired;

  // ─── Token management ─────────────────────────────────────────────────────

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _memoryAccessToken = accessToken;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessTokenKey, accessToken);
    await prefs.setString(_refreshTokenKey, refreshToken);
  }

  Future<String?> getAccessToken() async {
    if (_memoryAccessToken != null) return _memoryAccessToken;
    final prefs = await SharedPreferences.getInstance();
    _memoryAccessToken = prefs.getString(_accessTokenKey);
    return _memoryAccessToken;
  }

  Future<void> clearTokens() async {
    _memoryAccessToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_refreshTokenKey);
  }

  void updateMemoryAccessToken(String? token) {
    _memoryAccessToken = token;
  }
}

/// Interceptor that:
///   1. Attaches Bearer token to every request
///   2. On 401 → attempts token refresh → retries original request
///   3. On refresh failure → clears tokens (triggers logout)
class _AuthInterceptor extends Interceptor {
  final Dio _dio;
  bool _isRefreshing = false;

  static const String _accessTokenKey = 'farumasi_access_token';
  static const String _refreshTokenKey = 'farumasi_refresh_token';

  _AuthInterceptor(this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await FarumasiApiClient.instance.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final prefs = await SharedPreferences.getInstance();
        final refreshToken = prefs.getString(_refreshTokenKey);
        if (refreshToken == null) {
          await prefs.remove(_accessTokenKey);
          await prefs.remove(_refreshTokenKey);
          handler.next(err);
          return;
        }

        final refreshDio = Dio(BaseOptions(baseUrl: FarumasiApiClient.baseUrl));
        final response = await refreshDio.post('/auth/refresh', data: {
          'refresh_token': refreshToken,
        });

        final newAccessToken = response.data['access_token'] as String;
        final newRefreshToken = response.data['refresh_token'] as String;

        await prefs.setString(_accessTokenKey, newAccessToken);
        await prefs.setString(_refreshTokenKey, newRefreshToken);
        FarumasiApiClient.instance.updateMemoryAccessToken(newAccessToken);

        err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
        final retryResponse = await _dio.fetch(err.requestOptions);
        handler.resolve(retryResponse);
      } catch (_) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(_accessTokenKey);
        await prefs.remove(_refreshTokenKey);
        FarumasiApiClient.instance.updateMemoryAccessToken(null);
        FarumasiApiClient.onSessionExpired?.call();
        handler.next(err);
      } finally {
        _isRefreshing = false;
      }
    } else {
      handler.next(err);
    }
  }
}
