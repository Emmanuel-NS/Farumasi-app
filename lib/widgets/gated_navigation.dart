import 'package:flutter/material.dart';

import 'guest_gate.dart';
import 'pin_gate.dart';

/// Push a screen behind GuestGate and optional PinGate — matches home tab protection.
Future<T?> pushGatedRoute<T>(
  BuildContext context, {
  required String feature,
  required Widget child,
  bool requirePin = false,
  VoidCallback? onBrowseStore,
}) {
  Widget page = GuestGate(
    feature: feature,
    onBrowseStore: onBrowseStore,
    child: requirePin ? PinGate(feature: feature, child: child) : child,
  );
  return Navigator.push<T>(context, MaterialPageRoute(builder: (_) => page));
}
