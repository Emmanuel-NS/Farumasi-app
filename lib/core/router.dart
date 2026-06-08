import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/auth_screen.dart';
import '../screens/home_screen.dart';
import '../screens/rider/rider_dashboard_screen.dart';

abstract class AppRoutes {
  static const splash = '/';
  static const auth = '/auth';
  static const home = '/home';
  static const riderDashboard = '/rider';
}

class _RouterNotifier extends ChangeNotifier {
  final Ref _ref;

  _RouterNotifier(this._ref) {
    _ref.listen<AuthState>(authProvider, (__, _) => notifyListeners());
  }

  String? redirect(BuildContext context, GoRouterState state) {
    final authState = _ref.read(authProvider);
    final status = authState.status;
    final location = state.matchedLocation;

    if (status == AuthStatus.unknown) {
      return location == AppRoutes.splash ? null : AppRoutes.splash;
    }

    if (status == AuthStatus.authenticated) {
      final role = authState.user?.role;
      if (role == 'RIDER' && location == AppRoutes.home) {
        return AppRoutes.riderDashboard;
      }
      if (location == AppRoutes.splash || location == AppRoutes.auth) {
        return _homeForRole(role);
      }
      return null;
    }

    if (location == AppRoutes.splash) return AppRoutes.home;
    if (location == AppRoutes.riderDashboard) {
      return AppRoutes.home;
    }

    return null;
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _RouterNotifier(ref);
  return GoRouter(
    initialLocation: AppRoutes.home,
    refreshListenable: notifier,
    redirect: notifier.redirect,
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (_, __) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.auth,
        builder: (_, __) => const AuthScreen(),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (_, __) => const HomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.riderDashboard,
        builder: (_, __) => const RiderDashboardScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.uri}')),
    ),
  );
});

String _homeForRole(String? role) {
  switch (role) {
    case 'RIDER':
      return AppRoutes.riderDashboard;
    default:
      return AppRoutes.home;
  }
}
