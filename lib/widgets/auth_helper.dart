import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../screens/auth_screen.dart';

/// Returns true when the user is signed in (already or after auth screen).
Future<bool> promptSignIn(BuildContext context, [WidgetRef? ref]) async {
  AuthStatus status() {
    if (ref != null) {
      return ref.read(authProvider).status;
    }
    return ProviderScope.containerOf(context).read(authProvider).status;
  }

  if (status() == AuthStatus.authenticated) {
    return true;
  }
  final result = await Navigator.of(context).push<bool>(
    MaterialPageRoute<bool>(
      fullscreenDialog: true,
      builder: (_) => const AuthScreen(),
    ),
  );
  if (!context.mounted) return false;
  return result == true || status() == AuthStatus.authenticated;
}
