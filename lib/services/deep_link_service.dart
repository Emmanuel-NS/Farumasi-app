import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import '../core/router.dart';
import '../services/state_service.dart';

/// Handles universal / app links so shared URLs open in the native app when installed.
class DeepLinkService {
  DeepLinkService._();

  static final AppLinks _appLinks = AppLinks();
  static bool _initialized = false;

  static Future<void> init(GoRouter router) async {
    if (_initialized || kIsWeb) return;
    _initialized = true;

    try {
      final initial = await _appLinks.getInitialLink();
      if (initial != null) {
        _handleUri(router, initial);
      }
    } catch (e) {
      debugPrint('Deep link initial URI error: $e');
    }

    _appLinks.uriLinkStream.listen(
      (uri) => _handleUri(router, uri),
      onError: (Object e) => debugPrint('Deep link stream error: $e'),
    );
  }

  static void _handleUri(GoRouter router, Uri uri) {
    final path = uri.path.isNotEmpty ? uri.path : '/';
    debugPrint('Deep link: $path');

    if (path.startsWith('/health/')) {
      router.go(path);
      return;
    }
    if (path == '/consult' || path.startsWith('/consult/')) {
      StateService().requestHomeTab(2);
      router.go(AppRoutes.home);
      return;
    }
    if (path == '/store' || path.startsWith('/store/')) {
      StateService().requestHomeTab(0);
      router.go(AppRoutes.home);
    }
  }
}
