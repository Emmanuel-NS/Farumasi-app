import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/repositories/auth_repository.dart';

// ─── Auth state ───────────────────────────────────────────────────────────────

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final AuthUser? user;
  final String? error;

  const AuthState({
    required this.status,
    this.user,
    this.error,
  });

  const AuthState.unknown() : this(status: AuthStatus.unknown);
  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);
  const AuthState.authenticated(AuthUser user)
      : this(status: AuthStatus.authenticated, user: user);
  const AuthState.error(String message)
      : this(status: AuthStatus.unauthenticated, error: message);
}

// ─── Auth notifier ─────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState.unknown()) {
    _checkPersistedSession();
  }

  final _repo = AuthRepository();

  Future<void> _checkPersistedSession() async {
    final hasToken = await _repo.isLoggedIn;
    if (hasToken) {
      final user = await _repo.getMe();
      if (user != null) {
        state = AuthState.authenticated(user);
      } else {
        // Token was invalid or expired
        await _repo.logout();
        state = const AuthState.unauthenticated();
      }
    } else {
      state = const AuthState.unauthenticated();
    }
  }

  Future<void> login({
    required String emailOrPhone,
    required String password,
  }) async {
    try {
      state = const AuthState.unknown();
      final result = await _repo.login(
        emailOrPhone: emailOrPhone,
        password: password,
      );
      state = AuthState.authenticated(result.user!);
    } catch (e) {
      state = AuthState.error(_parseError(e));
    }
  }

  Future<void> register({
    required String name,
    required String password,
    String? email,
    String? phone,
    String role = 'PATIENT',
  }) async {
    try {
      state = const AuthState.unknown();
      final result = await _repo.register(
        name: name,
        email: email,
        phone: phone,
        password: password,
        role: role,
      );
      state = AuthState.authenticated(result.user!);
    } catch (e) {
      state = AuthState.error(_parseError(e));
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
