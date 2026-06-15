import 'package:flutter/widgets.dart';

/// Tracks cold-start vs resume and foreground state so the app stays warm in background.
class AppLifecycleService with WidgetsBindingObserver {
  AppLifecycleService._();
  static final AppLifecycleService instance = AppLifecycleService._();

  bool _initialized = false;
  bool _coldStart = true;
  bool _inForeground = true;

  final List<VoidCallback> _listeners = [];

  /// True only for the first process launch — not when returning from background.
  bool get isColdStart => _coldStart;

  bool get isInForeground => _inForeground;

  void init() {
    if (_initialized) return;
    _initialized = true;
    WidgetsBinding.instance.addObserver(this);
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
