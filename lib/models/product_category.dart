/// Backend category from GET /products/categories/ — matches patient portal.
class ProductCategory {
  final String id;
  final String name;
  final String iconName;
  final bool isDefault;
  final int displayOrder;

  const ProductCategory({
    required this.id,
    required this.name,
    this.iconName = '',
    this.isDefault = false,
    this.displayOrder = 0,
  });

  static const all = ProductCategory(id: 'all', name: 'All', iconName: '');

  factory ProductCategory.fromJson(Map<String, dynamic> json) {
    return ProductCategory(
      id: (json['id'] as String?) ?? '',
      name: (json['name'] as String?) ?? '',
      iconName: (json['icon_name'] as String?) ?? '',
      isDefault: json['is_default'] as bool? ?? false,
      displayOrder: (json['display_order'] as num?)?.toInt() ?? 0,
    );
  }
}
