import 'package:flutter/material.dart';

/// Wraps a scroll view so pull-from-top refresh always works (even when content is short).
class AppRefreshScroll extends StatelessWidget {
  const AppRefreshScroll({
    super.key,
    required this.onRefresh,
    required this.child,
    this.color = const Color(0xFF1E9E68),
  });

  final Future<void> Function() onRefresh;
  final Widget child;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: color,
      onRefresh: onRefresh,
      child: child,
    );
  }

  static ScrollPhysics scrollPhysics(ScrollPhysics? base) {
    return AlwaysScrollableScrollPhysics(parent: base);
  }
}
