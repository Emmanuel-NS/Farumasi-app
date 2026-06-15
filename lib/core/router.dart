import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/auth_screen.dart';
import '../screens/home_screen.dart';
import '../screens/health_article_detail_screen.dart';
import '../screens/rider/rider_dashboard_screen.dart';
import '../services/deep_link_service.dart';
import '../services/state_service.dart';

abstract class AppRoutes {
  static const splash = '/';
  static const auth = '/auth';
  static const home = '/home';
  static const riderDashboard = '/rider';
  static const healthArticle = '/health/:articleId';
  static const consult = '/consult';
  static const store = '/store';
}

class _RouterNotifier extends ChangeNotifier {
  final Ref _ref;

  _RouterNotifier(this._ref) {
    _ref.listen<AuthState>(authProvider, (__, _) => notifyListeners());
  }

  bool _isPublicDeepLink(String location) {
    return location.startsWith('/health/') ||
        location == AppRoutes.consult ||
        location.startsWith('/consult/') ||
        location == AppRoutes.store ||
        location.startsWith('/store/');
  }

  String? redirect(BuildContext context, GoRouterState state) {
    final authState = _ref.read(authProvider);
    final status = authState.status;
    final location = state.matchedLocation;

    if (_isPublicDeepLink(location)) {
      return null;
    }

    if (status == AuthStatus.unknown) {
      // Show home immediately; auth resolves in the background.
      if (location == AppRoutes.splash) return AppRoutes.home;
      return null;
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
  final router = GoRouter(
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
      GoRoute(
        path: AppRoutes.healthArticle,
        builder: (_, state) => HealthArticleDetailScreen(
          articleId: state.pathParameters['articleId']!,
        ),
      ),
      GoRoute(
        path: AppRoutes.consult,
        builder: (_, __) {
          StateService().requestHomeTab(2);
          return const HomeScreen();
        },
      ),
      GoRoute(
        path: AppRoutes.store,
        builder: (_, __) {
          StateService().requestHomeTab(0);
          return const HomeScreen();
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.uri}')),
    ),
  );

  DeepLinkService.init(router);
  return router;
});

String _homeForRole(String? role) {
  switch (role) {
    case 'RIDER':
      return AppRoutes.riderDashboard;
    default:
      return AppRoutes.home;
  }
}
