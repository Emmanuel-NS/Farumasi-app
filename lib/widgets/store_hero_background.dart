import 'package:flutter/material.dart';

import 'imigongo_doodle_background.dart';

/// Store sliver hero — scattered imigongo doodles in platform green (no network).
class StoreHeroBackground extends StatelessWidget {
  const StoreHeroBackground({
    super.key,
    this.baseColor = ImigongoDoodleBackground.heroGreen,
    this.darkColor = ImigongoDoodleBackground.heroGreenDark,
  });

  final Color baseColor;
  final Color darkColor;

  @override
  Widget build(BuildContext context) {
    return ImigongoDoodleBackground(
      variant: ImigongoDoodleVariant.hero,
      gradientColors: [baseColor, darkColor, ImigongoDoodleBackground.heroGreenDeep],
    );
  }
}
