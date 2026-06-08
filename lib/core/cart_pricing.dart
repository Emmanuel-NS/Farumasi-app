import '../models/models.dart';
import 'sell_mode.dart';

/// Matches `farumasi_patient_portal/src/lib/cart-pricing.ts`
double cartLineUnitPrice(
  Medicine medicine,
  SellMode sellMode, {
  double? listingPackPrice,
  double? listingUnitPrice,
}) {
  if (sellMode == SellMode.partial) {
    if (listingUnitPrice != null && listingUnitPrice > 0) {
      return listingUnitPrice;
    }
    return medicine.unitPriceFrom ?? 0;
  }
  if (listingPackPrice != null && listingPackPrice > 0) {
    return listingPackPrice;
  }
  return medicine.price;
}

double cartLineTotal(
  Medicine medicine,
  SellMode sellMode,
  int quantity, {
  double? listingPackPrice,
  double? listingUnitPrice,
}) {
  return cartLineUnitPrice(
        medicine,
        sellMode,
        listingPackPrice: listingPackPrice,
        listingUnitPrice: listingUnitPrice,
      ) *
      quantity;
}
