import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';

import 'background_polling_service.dart';

/// Tracks cold-start vs resume and foreground state so the app stays warm in background.
class AppLifecycleService with WidgetsBindingObserver {
  AppLifecycleService._();
  static final AppLifecycleService instance = AppLifecycleService._();

  static const _launchOverlayKey = 'app_launch_overlay_shown_v1';
  static const longBackgroundThreshold = Duration(minutes: 30);

  bool _initialized = false;
  bool _coldStart = true;
  bool _inForeground = true;
  bool _launchOverlayPersisted = false;
  DateTime? _pausedAt;
  bool _longBackgroundPending = false;
  Duration? _lastBackgroundDuration;

  final List<VoidCallback> _listeners = [];

  /// True only for the first process launch — not when returning from background.
  bool get isColdStart => _coldStart;

  bool get isInForeground => _inForeground;

  /// Survives process restarts within the same install session.
  bool get launchOverlayAlreadyShown => _launchOverlayPersisted;

  /// True after resume when the app was in background longer than [longBackgroundThreshold].
  bool get shouldShowBrandingAfterLongBackground => _longBackgroundPending;

  /// How long the app was in background before the latest resume.
  Duration? get lastBackgroundDuration => _lastBackgroundDuration;

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

  void markLongBackgroundHandled() {
    _longBackgroundPending = false;
    _pausedAt = null;
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
        if (_pausedAt != null) {
          final away = DateTime.now().difference(_pausedAt!);
          _lastBackgroundDuration = away;
          _longBackgroundPending = away > longBackgroundThreshold;
        } else {
          _lastBackgroundDuration = Duration.zero;
        }
        _pausedAt = null;
        _coldStart = false;
        _notify();
        if (!kIsWeb) {
          unawaited(stopBackgroundPolling());
        }
      case AppLifecycleState.inactive:
        break;
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        _inForeground = false;
        _pausedAt = DateTime.now();
        _notify();
        if (!kIsWeb) {
          unawaited(startBackgroundPolling());
        }
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
