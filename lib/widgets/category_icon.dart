import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../models/product_category.dart';

/// Renders the same SVG category icons as the patient portal (`CategoryIcons.tsx`).
class CategoryIcon extends StatelessWidget {
  const CategoryIcon({
    super.key,
    required this.category,
    this.size = 26,
    this.color,
  });

  final ProductCategory category;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final isAll = category.name == 'All';
    final iconColor = color ?? const Color(0xFF475569);
    final asset = isAll
        ? 'assets/icons/categories/all.svg'
        : _assetForIconName(category.iconName);

    return SvgPicture.asset(
      asset,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
      placeholderBuilder: (_) => Icon(
        Icons.category_outlined,
        size: size,
        color: iconColor,
      ),
    );
  }

  static String _assetForIconName(String iconName) {
    final key = iconName.trim().toLowerCase();
    if (key.isEmpty) return 'assets/icons/categories/general.svg';
    return 'assets/icons/categories/$key.svg';
  }
}
