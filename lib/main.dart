import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/router.dart';
import 'theme/app_theme.dart';
import 'services/notification_service.dart';

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

  runApp(
    const ProviderScope(
      child: FarumasiApp(),
    ),
  );

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
    try {
      await NotificationService().init();
    } catch (e) {
      debugPrint('Failed to init notifications: $e');
    }
  });
}

class FarumasiApp extends ConsumerWidget {
  const FarumasiApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Farumasi',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      routerConfig: router,
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
