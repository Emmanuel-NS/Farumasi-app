import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/auth_screen.dart';
import '../screens/home_screen.dart';
import '../screens/pharmacist/pharmacist_dashboard_screen.dart';
import '../screens/rider/rider_dashboard_screen.dart';

// ─── Route names ──────────────────────────────────────────────────────────────

abstract class AppRoutes {
  static const splash = '/';
  static const auth = '/auth';
  static const home = '/home';
  static const pharmacistDashboard = '/pharmacist';
  static const riderDashboard = '/rider';
}

// ─── Router provider ──────────────────────────────────────────────────────────

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: _AuthStateListenable(ref),
    redirect: (context, state) {
      final status = authState.status;
      final location = state.matchedLocation;

      // Still initializing — show splash
      if (status == AuthStatus.unknown) {
        return location == AppRoutes.splash ? null : AppRoutes.splash;
      }

      // Not authenticated — send to auth screen
      if (status == AuthStatus.unauthenticated) {
        return location == AppRoutes.auth ? null : AppRoutes.auth;
      }

      // Authenticated — redirect from splash/auth to role-appropriate home
      if (location == AppRoutes.splash || location == AppRoutes.auth) {
        return _homeForRole(authState.user?.role);
      }

      return null; // No redirect needed
    },
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
        path: AppRoutes.pharmacistDashboard,
        builder: (_, __) => const PharmacistDashboardScreen(),
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
    case 'PHARMACIST':
    case 'PHARMACY_ADMIN':
      return AppRoutes.pharmacistDashboard;
    case 'RIDER':
      return AppRoutes.riderDashboard;
    default:
      return AppRoutes.home;
  }
}

/// Bridges Riverpod auth state changes → GoRouter redirect refreshes
class _AuthStateListenable extends ChangeNotifier {
  _AuthStateListenable(Ref ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
}
