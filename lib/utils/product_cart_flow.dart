import 'package:flutter/material.dart';

import '../core/cart_pricing.dart';
import '../core/sell_mode.dart';
import '../models/models.dart';
import '../services/state_service.dart';
import '../widgets/sell_mode_picker_sheet.dart';

bool isProductInCart(String productId) {
  return StateService().cartItems.any((item) => item.medicine.id == productId);
}

void removeProductFromCart(String productId) {
  StateService().removeProductLines(productId);
}

Future<void> handleProductCartTap(
  BuildContext context,
  Medicine medicine, {
  bool removingIfInCart = true,
}) async {
  if (medicine.requiresPrescription) {
    _snack(
      context,
      'Prescription Required. Please consult a pharmacist.',
      Colors.orange,
    );
    return;
  }

  if (removingIfInCart && isProductInCart(medicine.id)) {
    removeProductFromCart(medicine.id);
    _snack(context, '${medicine.name} removed from cart', Colors.black87);
    return;
  }

  if (medicine.allowsPartialSelling) {
    final result = await showSellModePickerSheet(context, medicine);
    if (result == null || !context.mounted) return;
    StateService().addToCart(
      medicine,
      result.quantity,
      sellMode: result.mode,
    );
    _snack(
      context,
      'Added ${result.quantity} ${lineUnitLabel(result.mode, partialUnitName: medicine.partialUnitName, unitsPerPack: medicine.unitsPerPack)} to cart',
      const Color(0xFF1E9E68),
    );
    return;
  }

  StateService().addToCart(medicine, 1, sellMode: SellMode.pack);
  _snack(context, '${medicine.name} added to cart!', const Color(0xFF1E9E68));
}

void _snack(BuildContext context, String message, Color bg) {
  ScaffoldMessenger.of(context).hideCurrentSnackBar();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      duration: const Duration(seconds: 1),
      behavior: SnackBarBehavior.floating,
      backgroundColor: bg,
    ),
  );
}

String cartPriceLabel(Medicine medicine, SellMode mode) {
  final unit = cartLineUnitPrice(medicine, mode);
  if (mode == SellMode.partial && medicine.unitPriceFrom != null) {
    return 'or ${formatRwf(unit)}/${medicine.partialUnitName ?? 'unit'}';
  }
  return formatRwf(unit);
}
