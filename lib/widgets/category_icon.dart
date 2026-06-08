import 'package:flutter/material.dart';

import '../models/product_category.dart';

/// Maps backend `icon_name` / category label to Material icons (portal CategoryIcons parity).
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
    return Icon(
      isAll ? Icons.grid_view_rounded : _iconForCategory(category),
      size: size,
      color: color,
    );
  }

  static IconData _iconForCategory(ProductCategory cat) {
    final key = cat.iconName.trim().toLowerCase();
    if (key.isNotEmpty) {
      const byIconName = <String, IconData>{
        'general': Icons.medical_services_outlined,
        'first-aid': Icons.medical_information_outlined,
        'pain-relief': Icons.bolt_outlined,
        'prescription': Icons.description_outlined,
        'syringe': Icons.vaccines_outlined,
        'antibiotics': Icons.biotech_outlined,
        'infectious': Icons.coronavirus_outlined,
        'immune': Icons.shield_outlined,
        'allergy': Icons.spa_outlined,
        'chronic-care': Icons.monitor_heart_outlined,
        'devices': Icons.devices_other_outlined,
        'pharmacy': Icons.local_pharmacy_outlined,
        'vitamins': Icons.wb_sunny_outlined,
        'supplements': Icons.emoji_food_beverage_outlined,
        'fever': Icons.thermostat_outlined,
        'cold-flu': Icons.ac_unit_outlined,
        'wound-care': Icons.healing_outlined,
        'diabetes': Icons.water_drop_outlined,
        'blood-pressure': Icons.favorite_outline,
        'weight-loss': Icons.monitor_weight_outlined,
        'sleep': Icons.bedtime_outlined,
        'cancer-care': Icons.volunteer_activism_outlined,
        'heart-health': Icons.favorite_border,
        'respiratory': Icons.air_outlined,
        'digestive': Icons.restaurant_outlined,
        'kidney': Icons.water_outlined,
        'liver': Icons.opacity_outlined,
        'bone-joint': Icons.accessibility_new_outlined,
        'spine': Icons.vertical_align_center_outlined,
        'neurology': Icons.psychology_outlined,
        'mental-health': Icons.self_improvement_outlined,
        'thyroid': Icons.circle_outlined,
        'reproductive': Icons.pregnant_woman_outlined,
        'eye-care': Icons.remove_red_eye_outlined,
        'ear-care': Icons.hearing_outlined,
        'dental': Icons.mood_outlined,
        'skincare': Icons.face_retouching_natural_outlined,
        'dermatology': Icons.face_outlined,
        'nutrition': Icons.fitness_center_outlined,
        'pediatrics': Icons.child_friendly_outlined,
        'mother-baby': Icons.family_restroom_outlined,
        'mobility': Icons.accessible_outlined,
        'sexual-health': Icons.favorite_outline,
        'womens-health': Icons.female_outlined,
        'mens-health': Icons.male_outlined,
        'cold & flu': Icons.ac_unit_outlined,
      };
      if (byIconName.containsKey(key)) return byIconName[key]!;
    }
    return _iconFromCategoryName(cat.name);
  }

  static IconData _iconFromCategoryName(String name) {
    final n = name.toLowerCase();
    if (n.contains('analgesic') || n.contains('pain')) return Icons.healing_outlined;
    if (n.contains('antibiotic')) return Icons.biotech_outlined;
    if (n.contains('antidiabet') || n.contains('diabet')) return Icons.water_drop_outlined;
    if (n.contains('antihypertens') || n.contains('hypertens')) return Icons.favorite_outline;
    if (n.contains('malaria')) return Icons.coronavirus_outlined;
    if (n.contains('vitamin')) return Icons.wb_sunny_outlined;
    if (n.contains('supplement')) return Icons.emoji_food_beverage_outlined;
    if (n.contains('cold') || n.contains('flu')) return Icons.ac_unit_outlined;
    if (n.contains('allergy')) return Icons.spa_outlined;
    if (n.contains('gastro') || n.contains('digestive')) return Icons.restaurant_outlined;
    if (n.contains('respiratory') || n.contains('lung')) return Icons.air_outlined;
    if (n.contains('chronic')) return Icons.monitor_heart_outlined;
    if (n.contains('personal care') || n.contains('beauty') || n.contains('skin')) {
      return Icons.face_retouching_natural_outlined;
    }
    if (n.contains('first aid')) return Icons.medical_information_outlined;
    if (n.contains('baby') || n.contains('child') || n.contains('pedia')) {
      return Icons.child_friendly_outlined;
    }
    if (n.contains('mother')) return Icons.family_restroom_outlined;
    if (n.contains('device')) return Icons.devices_other_outlined;
    if (n.contains('mobility')) return Icons.accessible_outlined;
    if (n.contains('sexual')) return Icons.favorite_outline;
    if (n.contains('others') || n.contains('general')) return Icons.medical_services_outlined;
    return Icons.category_outlined;
  }
}
