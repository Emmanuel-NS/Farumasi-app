import '../models/models.dart';
import 'sell_mode.dart';

/// Mirrors `farumasi_patient_portal/src/lib/cart-pricing.ts`

typedef ListingPriceMap = Map<String, Map<String, ({double price, double? unitPrice})>>;

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

double cartLineUnitPriceFromListing(
  Medicine medicine,
  SellMode sellMode,
  ({double price, double? unitPrice})? listing,
) {
  if (listing == null) {
    return cartLineUnitPrice(medicine, sellMode);
  }
  return cartLineUnitPrice(
    medicine,
    sellMode,
    listingPackPrice: listing.price,
    listingUnitPrice: listing.unitPrice,
  );
}

({double min, double max})? lineUnitPriceRange(
  Medicine medicine,
  SellMode sellMode,
  ListingPriceMap listingsMap,
) {
  if (sellMode == SellMode.partial) {
    final unitPrices = <double>[];
    for (final byProduct in listingsMap.values) {
      final entry = byProduct[medicine.id];
      if (entry?.unitPrice != null && entry!.unitPrice! > 0) {
        unitPrices.add(entry.unitPrice!);
      }
    }
    if (unitPrices.isNotEmpty) {
      return (min: unitPrices.reduce((a, b) => a < b ? a : b), max: unitPrices.reduce((a, b) => a > b ? a : b));
    }
    if (medicine.unitPriceFrom != null && medicine.unitPriceFrom! > 0) {
      return (min: medicine.unitPriceFrom!, max: medicine.unitPriceFrom!);
    }
    return null;
  }

  final packPrices = <double>[];
  for (final byProduct in listingsMap.values) {
    final entry = byProduct[medicine.id];
    if (entry != null && entry.price > 0) packPrices.add(entry.price);
  }
  if (packPrices.isNotEmpty) {
    return (min: packPrices.reduce((a, b) => a < b ? a : b), max: packPrices.reduce((a, b) => a > b ? a : b));
  }
  final min = medicine.price;
  final max = medicine.maxPrice ?? medicine.price;
  if (min <= 0 && max <= 0) return null;
  return (min: min, max: max < min ? min : max);
}

({double min, double max})? lineTotalPriceRange(
  Medicine medicine,
  SellMode sellMode,
  int qty,
  ListingPriceMap listingsMap,
) {
  final unit = lineUnitPriceRange(medicine, sellMode, listingsMap);
  if (unit == null) return null;
  return (min: unit.min * qty, max: unit.max * qty);
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
