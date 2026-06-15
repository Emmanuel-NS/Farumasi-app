import 'package:flutter/material.dart';

import 'imigongo_africa_painter.dart';

/// Store sliver hero — hand-drawn imigongo Africa map (no network, data-light).
class StoreHeroBackground extends StatelessWidget {
  const StoreHeroBackground({
    super.key,
    this.baseColor = const Color(0xFF1E9E68),
    this.darkColor = const Color(0xFF167B51),
  });

  final Color baseColor;
  final Color darkColor;

  @override
  Widget build(BuildContext context) {
    return ImigongoAfricaHero(
      baseColor: baseColor,
      darkColor: darkColor,
    );
  }
}
