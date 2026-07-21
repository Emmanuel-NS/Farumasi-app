import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/state_service.dart';
import '../utils/product_cart_flow.dart';
import '../widgets/lite_network_image.dart';
import '../widgets/portal/portal_ui.dart';

class MedicineItem extends StatelessWidget {
  final Medicine medicine;
  final VoidCallback onTap; // Adds to Cart
  final VoidCallback onAboutTap; // Navigates to Details

  const MedicineItem({
    super.key,
    required this.medicine,
    required this.onTap,
    required this.onAboutTap,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: StateService(),
      builder: (context, child) {
        final isInCart = isProductInCart(medicine.id);

        return Card(
          elevation: 2,
          margin: const EdgeInsets.all(8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 11,
                child: InkWell(
                  onTap: () {
                    if (medicine.requiresPrescription) {
                      ScaffoldMessenger.of(context).hideCurrentSnackBar();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Prescription required for this item.'),
                          duration: Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: Colors.amber,
                        ),
                      );
                      return;
                    }
                    onTap();
                  }, // Image tap -> Toggle Cart
                  borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(12),
                          ),
                        ),
                        child: Hero(
                          tag: medicine.id,
                          child: ClipRRect(
                            borderRadius: BorderRadius.vertical(
                              top: Radius.circular(12),
                            ),
                            child: medicine.imageUrl.isNotEmpty
                                ? LiteNetworkImage(
                                    url: medicine.imageUrl,
                                    fit: BoxFit.cover,
                                    width: double.infinity,
                                    height: double.infinity,
                                    memCacheWidth: 520,
                                  )
                                : Container(
                                    color: const Color(0xFFEDFDF6),
                                    child: const Icon(
                                      Icons.medication_outlined,
                                      size: 36,
                                      color: Color(0xFF1E9E68),
                                    ),
                                  ),
                          ),
                        ),
                      ),
                      // Overlay Tick when in Cart
                      if (isInCart)
                        Positioned.fill(
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(
                                0.4,
                              ), // Transparent background overlay
                              borderRadius: BorderRadius.vertical(
                                top: Radius.circular(12),
                              ),
                            ),
                            child: Center(
                              child: Container(
                                padding: EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1E9E68),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 2,
                                  ),
                                ),
                                child: Icon(
                                  Icons.check,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              Expanded(
                flex: 10,
                child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: () {
                        if (medicine.requiresPrescription) {
                          ScaffoldMessenger.of(context).hideCurrentSnackBar();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Prescription required for this item.',
                              ),
                              duration: Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: Colors.amber,
                            ),
                          );
                          return;
                        }
                        onTap();
                      },
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              medicine.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 3),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                medicine.maxPrice != null && medicine.maxPrice! > medicine.price
                                    ? '${medicine.price.toStringAsFixed(0)} - ${medicine.maxPrice!.toStringAsFixed(0)} RWF'
                                    : '${medicine.price.toStringAsFixed(0)} RWF',
                                style: const TextStyle(
                                  color: Color(0xFF1E9E68),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            if (medicine.allowsPartialSelling &&
                                medicine.unitPriceFrom != null)
                              Text(
                                'or ${medicine.unitPriceFrom!.toStringAsFixed(0)} RWF/${medicine.partialUnitName ?? 'unit'}',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey.shade600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Expanded(
                      child: InkWell(
                        onTap: () => _showQuickView(context),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              medicine.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey[600],
                                height: 1.15,
                              ),
                            ),
                            const Text(
                              'Read more...',
                              style: TextStyle(
                                fontSize: 10,
                                color: PortalColors.green,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        InkWell(
                          onTap: onAboutTap,
                          borderRadius: BorderRadius.circular(8),
                          child: const Padding(
                            padding: EdgeInsets.fromLTRB(0, 4, 12, 4),
                            child: Text(
                              'About >',
                              style: TextStyle(
                                color: Color(0xFF1E9E68),
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
                        ),
                        Material(
                          color: medicine.requiresPrescription
                              ? Colors.grey
                              : const Color(0xFF1E9E68),
                          borderRadius: BorderRadius.circular(4),
                          child: InkWell(
                            onTap: () => handleProductCartTap(context, medicine),
                            borderRadius: BorderRadius.circular(4),
                            child: const Padding(
                              padding: EdgeInsets.symmetric(
                                horizontal: 8.0,
                                vertical: 4.0,
                              ),
                              child: Icon(
                                Icons.add_shopping_cart,
                                size: 16,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showQuickView(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.72,
        minChildSize: 0.45,
        maxChildSize: 0.92,
        builder: (_, scroll) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: ListView(
            controller: scroll,
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: PortalColors.slate200,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              Text(medicine.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: PortalColors.slate900)),
              const SizedBox(height: 8),
              Text(
                medicine.maxPrice != null && medicine.maxPrice! > medicine.price
                    ? '${medicine.price.toStringAsFixed(0)} – ${medicine.maxPrice!.toStringAsFixed(0)} RWF'
                    : '${medicine.price.toStringAsFixed(0)} RWF',
                style: const TextStyle(fontWeight: FontWeight.w800, color: PortalColors.green),
              ),
              const SizedBox(height: 16),
              const Text('Patient Overview', style: TextStyle(fontWeight: FontWeight.w700, color: PortalColors.slate900)),
              const SizedBox(height: 6),
              Text(medicine.overviewDescription ?? medicine.description, style: const TextStyle(color: PortalColors.slate600, height: 1.5)),
              if (medicine.dosageSummary != null || medicine.dosage.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: PortalColors.greenLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    medicine.dosageSummary ?? medicine.dosage,
                    style: const TextStyle(fontSize: 13, color: PortalColors.slate700, height: 1.4),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        onAboutTap();
                      },
                      child: const Text('Full Details →'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        handleProductCartTap(context, medicine);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PortalColors.green,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Add to Cart'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Reusable Helper for Dosage Rows
  Widget _buildDoseRow(IconData icon, String period, String dose) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisSize: MainAxisSize.min, // Wrap
        children: [
          Icon(icon, size: 16, color: Colors.blueGrey),
          SizedBox(width: 8),
          Text("$period: ", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey)),
          Expanded(child: Text(dose, style: TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
