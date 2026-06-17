import 'package:flutter/material.dart';
import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/router.dart';
import 'theme/app_theme.dart';
import 'services/app_lifecycle_service.dart';
import 'services/notification_service.dart';
import 'services/background_polling_service.dart';
import 'services/fcm_service.dart';
import 'services/google_auth_service.dart';
import 'services/notification_navigation.dart';
import 'services/patient_catalog_service.dart';
import 'widgets/app_launch_overlay.dart';

// Supabase keys injected via --dart-define at build time
// dart-define=SUPABASE_URL=https://xxx.supabase.co
// dart-define=SUPABASE_ANON_KEY=your_anon_key
const _supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: '',
);
const _supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue: '',
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  unawaited(AppLifecycleService.instance.init());

  if (!kIsWeb) {
    unawaited(initBackgroundNotificationWorker());
    unawaited(FcmService.instance.init());
  }

  runApp(
    const ProviderScope(
      child: FarumasiApp(),
    ),
  );

  if (!kIsWeb) {
    unawaited(NotificationService().init());
  }

  unawaited(PatientCatalogService().hydrateFromCache());
  unawaited(GoogleAuthService.ensureConfigured());

  Future<void>(() async {
    if (_supabaseUrl.isNotEmpty && _supabaseAnonKey.isNotEmpty) {
      try {
        await Supabase.initialize(
          url: _supabaseUrl,
          anonKey: _supabaseAnonKey,
        );
      } catch (e) {
        debugPrint('Failed to init Supabase: $e');
      }
    }
  });
}

class FarumasiApp extends ConsumerStatefulWidget {
  const FarumasiApp({super.key});

  @override
  ConsumerState<FarumasiApp> createState() => _FarumasiAppState();
}

class _FarumasiAppState extends ConsumerState<FarumasiApp> {
  late bool _showLaunchOverlay = AppLifecycleService.instance.isColdStart;

  @override
  void initState() {
    super.initState();
    AppLifecycleService.instance.addListener(_onLifecycleChange);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final router = ref.read(routerProvider);
      NotificationNavigation.register(router);
      // Hide splash as soon as the first home frame is ready (caps wait at ~420ms).
      if (_showLaunchOverlay) {
        Future<void>.delayed(const Duration(milliseconds: 280), () {
          if (mounted && _showLaunchOverlay) _dismissLaunchOverlay();
        });
      }
    });
  }

  @override
  void dispose() {
    AppLifecycleService.instance.removeListener(_onLifecycleChange);
    super.dispose();
  }

  void _onLifecycleChange() {
    if (!mounted) return;
    if (AppLifecycleService.instance.shouldShowBrandingAfterLongBackground) {
      setState(() => _showLaunchOverlay = true);
    }
  }

  void _dismissLaunchOverlay() {
    AppLifecycleService.instance.markLongBackgroundHandled();
    unawaited(AppLifecycleService.instance.markLaunchOverlayShown());
    if (mounted) setState(() => _showLaunchOverlay = false);
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Farumasi',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      routerConfig: router,
      builder: (context, child) {
        return Stack(
          fit: StackFit.expand,
          children: [
            child ?? const SizedBox.shrink(),
            if (_showLaunchOverlay)
              Positioned.fill(
                child: AppLaunchOverlay(onFinished: _dismissLaunchOverlay),
              ),
          ],
        );
      },
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        FlutterQuillLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en', 'US'),
      ],
    );
  }
}
