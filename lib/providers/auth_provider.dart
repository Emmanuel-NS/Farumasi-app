import 'dart:async';

import 'package:dio/dio.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/repositories/auth_repository.dart';

import '../services/state_service.dart';

import '../services/pin_service.dart';

import '../services/background_polling_service.dart';
import '../services/fcm_service.dart';
import '../services/notification_service.dart';



enum AuthStatus { unknown, authenticated, unauthenticated }



class AuthState {
  final AuthStatus status;
  final AuthUser? user;
  final String? error;
  final bool isLoading;
  final String? pendingVerificationEmail;

  const AuthState({
    required this.status,
    this.user,
    this.error,
    this.isLoading = false,
    this.pendingVerificationEmail,
  });

  const AuthState.unknown() : this(status: AuthStatus.unknown);
  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);
  const AuthState.authenticated(AuthUser user)
      : this(status: AuthStatus.authenticated, user: user);
  const AuthState.error(String message)
      : this(status: AuthStatus.unauthenticated, error: message);

  AuthState copyWith({
    bool? isLoading,
    AuthUser? user,
    AuthStatus? status,
    String? error,
    String? pendingVerificationEmail,
    bool clearPendingVerification = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error,
      isLoading: isLoading ?? this.isLoading,
      pendingVerificationEmail: clearPendingVerification
          ? null
          : (pendingVerificationEmail ?? this.pendingVerificationEmail),
    );
  }
}



class AuthNotifier extends StateNotifier<AuthState> {

  AuthNotifier() : super(const AuthState.unknown()) {

    _checkPersistedSession();

  }



  final _repo = AuthRepository();



  void _syncLegacySession(AuthUser? user) {

    if (user != null) {

      StateService().login(user.email ?? user.phone ?? 'user', name: user.name);
      unawaited(registerBackgroundNotificationPolling());
      unawaited(FcmService.instance.syncTokenIfLoggedIn());
      NotificationService().configurePolling(
        isAuthenticated: () => state.status == AuthStatus.authenticated,
        userId: () => state.user?.id,
      );
      unawaited(PinService.instance.hydrate().then((_) async {
        PinService.instance.setActiveUser(user.id);
        await PinService.instance.syncFromServer();
      }));

    } else {

      StateService().logout();
      PinService.instance.setActiveUser(null);
      NotificationService().stopPolling();
      unawaited(cancelBackgroundNotificationPolling());
      unawaited(FcmService.instance.clearTokenOnLogout());

    }

  }



  Future<void> _checkPersistedSession() async {
    final hasToken = await _repo.isLoggedIn;
    if (!hasToken) {
      _syncLegacySession(null);
      state = const AuthState.unauthenticated();
      unawaited(cancelBackgroundNotificationPolling());
      return;
    }

    final cached = await _repo.loadCachedUser();
    if (cached != null) {
      _syncLegacySession(cached);
      state = AuthState.authenticated(cached);
    }

    unawaited(_syncSessionInBackground(cached));
  }

  Future<void> _syncSessionInBackground(AuthUser? cached) async {
    try {
      await _repo.refreshSession();
      final user = await _repo.getMe().timeout(
        const Duration(seconds: 6),
        onTimeout: () => null,
      );

      if (user != null) {
        _syncLegacySession(user);
        state = AuthState.authenticated(user);
        return;
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await _repo.logout();
        _syncLegacySession(null);
        state = const AuthState.unauthenticated();
        await cancelBackgroundNotificationPolling();
        return;
      }
      if (cached != null) return;
    } catch (_) {
      if (cached != null) return;
    }

    if (cached == null) {
      _syncLegacySession(null);
      state = const AuthState.unauthenticated();
      await cancelBackgroundNotificationPolling();
    }
  }



  Future<void> login({
    required String emailOrPhone,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final result = await _repo.login(
        emailOrPhone: emailOrPhone,
        password: password,
      ).timeout(
        const Duration(seconds: 45),
        onTimeout: () => throw Exception('Login timed out. Check your connection and try again.'),
      );

      if (result.user != null) {
        _syncLegacySession(result.user);
        state = AuthState.authenticated(result.user!);
        return;
      }

      state = state.copyWith(isLoading: false, error: 'Sign-in failed');
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
    }
  }



  Future<RegistrationPending?> register({
    required String name,
    required String password,
    String? email,
    String? phone,
    String role = 'PATIENT',
  }) async {
    state = state.copyWith(isLoading: true, error: null, clearPendingVerification: true);

    try {
      final pending = await _repo.register(
        name: name,
        email: email,
        phone: phone,
        password: password,
        role: role,
      );

      state = state.copyWith(
        isLoading: false,
        pendingVerificationEmail: pending.email,
      );
      return pending;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
      return null;
    }
  }

  Future<bool> verifyRegistration(String code) async {
    final email = state.pendingVerificationEmail;
    if (email == null) return false;

    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repo.verifyRegistration(email: email, code: code);
      if (result.user != null) {
        _syncLegacySession(result.user);
        state = AuthState.authenticated(result.user!);
        return true;
      }
      state = state.copyWith(isLoading: false, error: 'Verification failed');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
      return false;
    }
  }

  Future<void> resendRegistrationOtp() async {
    final email = state.pendingVerificationEmail;
    if (email == null) return;
    await _repo.resendRegistrationOtp(email);
  }

  Future<String?> forgotPassword(String email) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final message = await _repo.forgotPassword(email);
      state = state.copyWith(isLoading: false);
      return message;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
      return null;
    }
  }

  Future<String?> resetPassword({
    required String email,
    required String code,
    required String newPassword,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final message = await _repo.resetPassword(
        email: email,
        code: code,
        newPassword: newPassword,
      );
      state = state.copyWith(isLoading: false);
      return message;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
      return null;
    }
  }

  Future<void> signInWithGoogle({
    required String email,
    required String fullName,
    String? googleId,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repo.signInWithGoogle(
        email: email,
        fullName: fullName,
        googleId: googleId,
      );
      if (result.user != null) {
        _syncLegacySession(result.user);
        state = AuthState.authenticated(result.user!);
        final fresh = await _repo.getMe();
        if (fresh != null) {
          _syncLegacySession(fresh);
          state = AuthState.authenticated(fresh);
        }
        return;
      }
      state = state.copyWith(isLoading: false, error: 'Google sign-in failed');
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
    }
  }



  Future<void> logout() async {

    await _repo.logout();

    _syncLegacySession(null);

    state = const AuthState.unauthenticated();

  }



  String _parseError(Object e) {

    if (e is DioException) {

      final data = e.response?.data;

      if (data is Map && data['detail'] != null) {
        final detail = data['detail'];
        if (detail is String && detail.trim().isNotEmpty) return detail;
        if (detail is List) {
          final parts = detail
              .map((d) => d is Map ? (d['msg']?.toString() ?? '') : d.toString())
              .where((s) => s.isNotEmpty);
          final msg = parts.join('. ');
          if (msg.isNotEmpty) return msg;
        }
      }

      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        return 'Request timed out. Check your connection and try again.';
      }
      if (e.type == DioExceptionType.connectionError) {
        return 'Cannot reach the server. Check your connection and try again.';
      }

    }

    return e.toString().replaceAll('DioException', '').trim();

  }

}



final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(

  (ref) => AuthNotifier(),

);



final isAuthenticatedProvider = Provider<bool>(

  (ref) => ref.watch(authProvider).status == AuthStatus.authenticated,

);



final currentUserProvider = Provider<AuthUser?>(

  (ref) => ref.watch(authProvider).user,

);



final currentUserRoleProvider = Provider<String?>(

  (ref) => ref.watch(authProvider).user?.role,

);


