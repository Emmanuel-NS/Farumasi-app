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
  await AppLifecycleService.instance.init();

  if (!kIsWeb) {
    await NotificationService().init();
  }

  AppSession.launchOverlayShown =
      AppLifecycleService.instance.launchOverlayAlreadyShown;

  runApp(
    const ProviderScope(
      child: FarumasiApp(),
    ),
  );

  // Warm catalogue from disk without blocking first frame.
  unawaited(PatientCatalogService().hydrateFromCache());

  // Defer non-critical startup work so the first frame paints sooner.
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
  bool _showLaunchOverlay =
      !AppSession.launchOverlayShown && AppLifecycleService.instance.isColdStart;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final router = ref.read(routerProvider);
      NotificationNavigation.register(router);
    });
  }

  void _dismissLaunchOverlay() {
    AppLifecycleService.instance.markLaunchOverlayShown();
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
          children: [
            child ?? const SizedBox.shrink(),
            if (_showLaunchOverlay)
              AppLaunchOverlay(onFinished: _dismissLaunchOverlay),
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
