import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

/// Central Dio HTTP client for FARUMASI API
///
/// Token storage: shared_preferences (works on web, mobile, desktop)
/// Base URL: defaults to localhost:8000 for web/desktop,
///           override via --dart-define=API_BASE_URL=...
class FarumasiApiClient {
  static FarumasiApiClient? _instance;
  static FarumasiApiClient get instance => _instance ??= FarumasiApiClient._();

  late final Dio dio;

  static const String _accessTokenKey = 'farumasi_access_token';
  static const String _refreshTokenKey = 'farumasi_refresh_token';

  // On web/desktop default to localhost; Android emulator users pass --dart-define
  static final String baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  ).isNotEmpty
      ? const String.fromEnvironment('API_BASE_URL')
      : kIsWeb
          ? 'http://localhost:8000/api/v1'
          : 'http://10.0.2.2:8000/api/v1'; // Android emulator

  FarumasiApiClient._() {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    dio.interceptors.add(_AuthInterceptor(dio));

    if (kDebugMode) {
      dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
      ));
    }
  }

  // ─── Token management ─────────────────────────────────────────────────────

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessTokenKey, accessToken);
    await prefs.setString(_refreshTokenKey, refreshToken);
  }

  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accessTokenKey);
  }

  Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_refreshTokenKey);
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
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_accessTokenKey);
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

        err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
        final retryResponse = await _dio.fetch(err.requestOptions);
        handler.resolve(retryResponse);
      } catch (_) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(_accessTokenKey);
        await prefs.remove(_refreshTokenKey);
        handler.next(err);
      } finally {
        _isRefreshing = false;
      }
    } else {
      handler.next(err);
    }
  }
}
