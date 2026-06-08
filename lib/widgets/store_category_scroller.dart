import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';

import '../models/product_category.dart';
import 'category_icon.dart';

/// Circular category chips — matches patient portal store category row (incl. "All").
class StoreCategoryScroller extends StatelessWidget {
  const StoreCategoryScroller({
    super.key,
    required this.categories,
    required this.selectedCategoryKeys,
    required this.onToggle,
    this.scrollController,
    this.showScrollArrows = false,
    this.canScrollLeft = false,
    this.canScrollRight = false,
    this.onScrollLeft,
    this.onScrollRight,
    this.height = 96,
  });

  final List<ProductCategory> categories;
  final Set<String> selectedCategoryKeys;
  final void Function(ProductCategory category) onToggle;
  final ScrollController? scrollController;
  final bool showScrollArrows;
  final bool canScrollLeft;
  final bool canScrollRight;
  final VoidCallback? onScrollLeft;
  final VoidCallback? onScrollRight;
  final double height;

  bool _isSelected(ProductCategory cat) {
    if (cat.name == 'All') return selectedCategoryKeys.isEmpty;
    return selectedCategoryKeys.contains(cat.name.toLowerCase());
  }

  @override
  Widget build(BuildContext context) {
    final items = [ProductCategory.all, ...categories];

    Widget list = ListView.separated(
      controller: scrollController,
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 2),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(width: 8),
      itemBuilder: (context, index) {
        final cat = items[index];
        final selected = _isSelected(cat);
        return GestureDetector(
          onTap: () => onToggle(cat),
          child: SizedBox(
            width: 76,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.start,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: selected ? const Color(0xFF1E9E68) : const Color(0xFFF1F5F9),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: selected ? const Color(0xFF1E9E68) : const Color(0xFFD8E1EA),
                    ),
                    boxShadow: selected
                        ? const [
                            BoxShadow(
                              color: Color(0x3322A36F),
                              blurRadius: 12,
                              offset: Offset(0, 4),
                            ),
                          ]
                        : null,
                  ),
                  child: Center(
                    child: CategoryIcon(
                      category: cat,
                      size: 26,
                      color: selected ? Colors.white : const Color(0xFF1E9E68),
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  cat.name,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.1,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    color: selected ? const Color(0xFF0F172A) : const Color(0xFF334155),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    list = ScrollConfiguration(
      behavior: ScrollConfiguration.of(context).copyWith(
        dragDevices: {
          PointerDeviceKind.touch,
          PointerDeviceKind.mouse,
          PointerDeviceKind.trackpad,
        },
      ),
      child: list,
    );

    if (!showScrollArrows) {
      return SizedBox(height: height, child: list);
    }

    return SizedBox(
      height: height,
      child: Stack(
        children: [
          list,
          if (canScrollLeft)
            Positioned(
              left: 0,
              top: 4,
              bottom: 28,
              child: _ArrowButton(icon: Icons.chevron_left, onTap: onScrollLeft),
            ),
          if (canScrollRight)
            Positioned(
              right: 0,
              top: 4,
              bottom: 28,
              child: _ArrowButton(icon: Icons.chevron_right, onTap: onScrollRight),
            ),
        ],
      ),
    );
  }
}

class _ArrowButton extends StatelessWidget {
  const _ArrowButton({required this.icon, this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Icon(icon, size: 20, color: const Color(0xFF1E9E68)),
        ),
      ),
    );
  }
}
