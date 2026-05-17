import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/repositories/auth_repository.dart';

// ─── Auth state ───────────────────────────────────────────────────────────────

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final AuthUser? user;
  final String? error;
  final bool isLoading;

  const AuthState({
    required this.status,
    this.user,
    this.error,
    this.isLoading = false,
  });

  const AuthState.unknown() : this(status: AuthStatus.unknown);
  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);
  const AuthState.authenticated(AuthUser user)
      : this(status: AuthStatus.authenticated, user: user);
  const AuthState.error(String message)
      : this(status: AuthStatus.unauthenticated, error: message);
  AuthState copyWith({bool? isLoading, AuthUser? user, AuthStatus? status, String? error}) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error ?? this.error,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

// ─── Auth notifier ─────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState.unknown()) {
    _checkPersistedSession();
  }

  final _repo = AuthRepository();

  Future<void> _checkPersistedSession() async {
    // In debug mode skip the network check — go straight to login screen.
    if (kDebugMode) {
      state = const AuthState.unauthenticated();
      return;
    }
    final hasToken = await _repo.isLoggedIn;
    if (hasToken) {
      try {
        final user = await _repo.getMe();
        if (user != null) {
          state = AuthState.authenticated(user);
          return;
        }
      } catch (_) {
        // Backend unreachable — clear stale token and go to login
      }
      await _repo.logout();
    }
    state = const AuthState.unauthenticated();
  }

  Future<void> login({
    required String emailOrPhone,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    // In debug mode: mock-known credentials log in instantly — no network hit.
    if (kDebugMode) {
      final mock = _mockLogin(emailOrPhone, password);
      if (mock != null) {
        state = AuthState.authenticated(mock);
        return;
      }
    }

    try {
      final result = await _repo.login(
        emailOrPhone: emailOrPhone,
        password: password,
      );
      state = AuthState.authenticated(result.user!);
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
    }
  }

  /// Returns a mock user when the backend is down (debug only).
  AuthUser? _mockLogin(String emailOrPhone, String password) {
    const mockUsers = {
      'test@farumasi.rw':
          ('Test User', 'PATIENT', 'mock-user-001'),
      'pharmacist@farumasi.rw':
          ('Demo Pharmacist', 'PHARMACIST', 'mock-pharma-001'),
      'rider@farumasi.rw':
          ('Demo Rider', 'RIDER', 'mock-rider-001'),
    };
    final entry = mockUsers[emailOrPhone.toLowerCase()];
    if (entry == null) return null;
    return AuthUser(
      id: entry.$3,
      name: entry.$1,
      email: emailOrPhone,
      role: entry.$2,
    );
  }

  Future<void> register({
    required String name,
    required String password,
    String? email,
    String? phone,
    String role = 'PATIENT',
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repo.register(
        name: name,
        email: email,
        phone: phone,
        password: password,
        role: role,
      );
      state = AuthState.authenticated(result.user!);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState.unauthenticated();
  }

  String _parseError(Object e) {
    return e.toString().replaceAll('DioException', '').trim();
  }
}

// ─── Providers ────────────────────────────────────────────────────────────────

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
