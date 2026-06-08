import 'package:dio/dio.dart';

import 'package:flutter/foundation.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/repositories/auth_repository.dart';

import '../services/state_service.dart';

import '../services/pin_service.dart';



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



  AuthState copyWith({

    bool? isLoading,

    AuthUser? user,

    AuthStatus? status,

    String? error,

  }) {

    return AuthState(

      status: status ?? this.status,

      user: user ?? this.user,

      error: error ?? this.error,

      isLoading: isLoading ?? this.isLoading,

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
      PinService.instance.hydrate().then((_) {
        PinService.instance.setActiveUser(user.id);
      });

    } else {

      StateService().logout();
      PinService.instance.setActiveUser(null);

    }

  }



  Future<void> _checkPersistedSession() async {

    final hasToken = await _repo.isLoggedIn;

    if (hasToken) {

      try {

        final user = await _repo.getMe();

        if (user != null) {

          _syncLegacySession(user);

          state = AuthState.authenticated(user);

          return;

        }

      } catch (_) {

        await _repo.logout();

      }

    }

    _syncLegacySession(null);

    state = const AuthState.unauthenticated();

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

      _syncLegacySession(result.user);

      state = AuthState.authenticated(result.user!);

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

        return data['detail'].toString();

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


