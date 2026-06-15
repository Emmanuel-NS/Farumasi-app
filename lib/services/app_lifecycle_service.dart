import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Tracks cold-start vs resume and foreground state so the app stays warm in background.
class AppLifecycleService with WidgetsBindingObserver {
  AppLifecycleService._();
  static final AppLifecycleService instance = AppLifecycleService._();

  static const _launchOverlayKey = 'app_launch_overlay_shown_v1';

  bool _initialized = false;
  bool _coldStart = true;
  bool _inForeground = true;
  bool _launchOverlayPersisted = false;

  final List<VoidCallback> _listeners = [];

  /// True only for the first process launch — not when returning from background.
  bool get isColdStart => _coldStart;

  bool get isInForeground => _inForeground;

  /// Survives process restarts within the same install session.
  bool get launchOverlayAlreadyShown => _launchOverlayPersisted;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    WidgetsBinding.instance.addObserver(this);
    try {
      final prefs = await SharedPreferences.getInstance();
      _launchOverlayPersisted = prefs.getBool(_launchOverlayKey) ?? false;
    } catch (_) {
      _launchOverlayPersisted = false;
    }
  }

  Future<void> markLaunchOverlayShown() async {
    _launchOverlayPersisted = true;
    AppSession.launchOverlayShown = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_launchOverlayKey, true);
    } catch (_) {}
  }

  void dispose() {
    if (!_initialized) return;
    WidgetsBinding.instance.removeObserver(this);
    _initialized = false;
  }

  void addListener(VoidCallback listener) => _listeners.add(listener);

  void removeListener(VoidCallback listener) => _listeners.remove(listener);

  void _notify() {
    for (final listener in List<VoidCallback>.from(_listeners)) {
      listener();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        _inForeground = true;
        _coldStart = false;
        _notify();
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        _inForeground = false;
        _notify();
      case AppLifecycleState.detached:
        break;
    }
  }
}

/// One-time launch overlay flag for this process.
class AppSession {
  AppSession._();

  static bool launchOverlayShown = false;
}
