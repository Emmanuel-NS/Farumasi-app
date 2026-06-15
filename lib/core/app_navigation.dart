import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/router.dart';
import '../services/state_service.dart';

/// Safe back navigation when opened from a shared link (no prior stack).
class AppNavigation {
  AppNavigation._();

  /// Health article → Health tab → Home shell.
  static void backToHealth(BuildContext context) {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
      return;
    }
    StateService().requestHomeTab(1);
    context.go(AppRoutes.home);
  }

  /// Consult chat → Consult tab → Home shell.
  static void backToConsult(BuildContext context) {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
      return;
    }
    StateService().requestHomeTab(2);
    context.go(AppRoutes.home);
  }

  /// Generic: pop or land on store home tab.
  static void backToHome(BuildContext context, {int tab = 0}) {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
      return;
    }
    StateService().requestHomeTab(tab);
    context.go(AppRoutes.home);
  }

  static Future<bool> onWillPopToHealth(BuildContext context) async {
    backToHealth(context);
    return false;
  }

  static Future<bool> onWillPopToConsult(BuildContext context) async {
    backToConsult(context);
    return false;
  }
}
