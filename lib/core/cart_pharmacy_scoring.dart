import 'dart:math' as math;

import 'delivery_pricing.dart';
import '../api/repositories/patient_repository.dart';
import '../core/sell_mode.dart';
import '../models/models.dart';

const _patientInsurance = 'RSSB';

const _kigaliDistricts = {
  'Gasabo',
  'Kicukiro',
  'Nyarugenge',
};

class ScoredPharmacyOption {
  ScoredPharmacyOption({
    required this.pharmacy,
    required this.availableCount,
    required this.totalCount,
    required this.priceEstimate,
    required this.insuranceMatch,
    required this.insuranceSaving,
    required this.distanceKm,
    required this.estimatedDeliveryMin,
    required this.score,
    required this.rank,
    required this.codename,
  });

  final Pharmacy pharmacy;
  final int availableCount;
  final int totalCount;
  final double priceEstimate;
  final bool insuranceMatch;
  final double insuranceSaving;
  final double distanceKm;
  final int estimatedDeliveryMin;
  final double score;
  final int rank;
  final String codename;
}

double haversineKm(double lat1, double lon1, double lat2, double lon2) {
  const r = 6371.0;
  final dLat = (lat2 - lat1) * math.pi / 180;
  final dLon = (lon2 - lon1) * math.pi / 180;
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(lat1 * math.pi / 180) *
          math.cos(lat2 * math.pi / 180) *
          math.sin(dLon / 2) *
          math.sin(dLon / 2);
  return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

int driveMinutes(double distKm) {
  if (distKm <= 0) return 0;
  if (distKm < 15) return (distKm / 25 * 60).round();
  return (15 / 25 * 60 + (distKm - 15) / 70 * 60).round();
}

bool _listingAvailable(BackendListing entry) {
  final status = entry.availabilityStatus.toLowerCase();
  return status == 'available' || status == 'low_stock';
}

double _linePrice(CartItem item, BackendListing entry) {
  if (item.sellMode == SellMode.partial) {
    if (entry.unitPrice == null || entry.unitPrice! <= 0) return 0;
    return entry.unitPrice! * item.quantity;
  }
  return entry.price * item.quantity;
}

/// Mirrors `scorePharmacies` in patient portal cart page.
List<ScoredPharmacyOption> scorePharmacies({
  required List<CartItem> cartLines,
  required List<Pharmacy> pharmacies,
  required Map<String, Map<String, BackendListing>> listingsMap,
  bool isPickup = false,
  String patientDistrict = '',
  List<double>? patientLocation,
}) {
  if (pharmacies.isEmpty || cartLines.isEmpty) return [];

  final raw = <_RawScore>[];
  for (final pharmacy in pharmacies) {
    final byProduct = listingsMap[pharmacy.id] ?? {};
    var availableCount = 0;
    var priceEstimate = 0.0;
    final fulfillmentVals = <int>[];
    final expiryDays = <int>[];
    final now = DateTime.now();

    for (final item in cartLines) {
      final entry = byProduct[item.medicine.id];
      if (entry == null) continue;

      if (item.sellMode == SellMode.partial &&
          (entry.unitPrice == null || entry.unitPrice! <= 0)) {
        continue;
      }

      if (_listingAvailable(entry)) {
        availableCount++;
        priceEstimate += _linePrice(item, entry);
      }

      if (entry.fulfillmentTimeMinutes != null) {
        fulfillmentVals.add(entry.fulfillmentTimeMinutes!);
      }
      if (entry.expiryDate != null) {
        expiryDays.add(entry.expiryDate!.difference(now).inDays);
      }
    }

    if (availableCount == 0) continue;

    final insuranceMatch = pharmacy.supportedInsurances.contains(_patientInsurance);
    final insuranceSaving = insuranceMatch ? (priceEstimate * 0.15).roundToDouble() : 0.0;
    final avgFulfillment = fulfillmentVals.isEmpty
        ? 60
        : (fulfillmentVals.reduce((a, b) => a + b) / fulfillmentVals.length).round();
    final minExpiryDays = expiryDays.isEmpty ? double.infinity : expiryDays.reduce(math.min).toDouble();

    final distanceKm = patientLocation != null && patientLocation.length >= 2
        ? haversineKm(
            patientLocation[0],
            patientLocation[1],
            pharmacy.coordinates[0],
            pharmacy.coordinates[1],
          )
        : 0.0;
    final travelMin = distanceKm > 0 ? driveMinutes(distanceKm) : 0;
    final estimatedMin = isPickup
        ? (distanceKm > 0 ? travelMin : avgFulfillment)
        : (distanceKm > 0 ? avgFulfillment + travelMin : avgFulfillment);

    raw.add(_RawScore(
      pharmacy: pharmacy,
      availableCount: availableCount,
      totalCount: cartLines.length,
      priceEstimate: priceEstimate,
      insuranceMatch: insuranceMatch,
      insuranceSaving: insuranceSaving,
      avgFulfillment: avgFulfillment,
      minExpiryDays: minExpiryDays,
      distanceKm: distanceKm,
      estimatedMin: estimatedMin,
    ));
  }

  if (raw.isEmpty) return [];

  final prices = raw.map((r) => r.priceEstimate).toList();
  final times = raw.map((r) => r.estimatedMin).toList();
  final minPrice = prices.reduce(math.min);
  final maxPrice = prices.reduce(math.max);
  final minTime = times.reduce(math.min);
  final maxTime = times.reduce(math.max);
  final priceRange = maxPrice - minPrice == 0 ? 1.0 : maxPrice - minPrice;
  final timeRange = maxTime - minTime == 0 ? 1.0 : (maxTime - minTime).toDouble();

  final w = isPickup
      ? _Weights(avail: 35, ins: 5, price: 20, delivery: 0, open: 10, expiry: 5, proximity: 25)
      : _Weights(avail: 35, ins: 5, price: 25, delivery: 20, open: 10, expiry: 5, proximity: 0);

  final scored = raw.map((r) {
    final availScore = (r.availableCount / r.totalCount) * w.avail;
    final insScore = r.insuranceMatch ? w.ins.toDouble() : 0.0;
    final priceScore = (1 - (r.priceEstimate - minPrice) / priceRange) * w.price;
    final deliveryScore = (1 - (r.estimatedMin - minTime) / timeRange) * w.delivery;
    final openScore = r.pharmacy.isOpen ? w.open.toDouble() : 0.0;
    final expiryFactor = r.minExpiryDays == double.infinity
        ? 0.5
        : r.minExpiryDays > 180
            ? 1.0
            : r.minExpiryDays > 90
                ? 0.75
                : r.minExpiryDays > 30
                    ? 0.5
                    : 0.1;
    final expiryScore = expiryFactor * w.expiry;

    double proxFactor;
    if (patientLocation != null) {
      proxFactor = r.distanceKm < 3
          ? 1.0
          : r.distanceKm < 10
              ? 0.85
              : r.distanceKm < 30
                  ? 0.5
                  : r.distanceKm < 100
                      ? 0.1
                      : 0.0;
    } else if (patientDistrict.isEmpty) {
      proxFactor = 0;
    } else {
      final pharmDistrict = r.pharmacy.district;
      proxFactor = pharmDistrict == patientDistrict
          ? 1.0
          : (_kigaliDistricts.contains(pharmDistrict) && _kigaliDistricts.contains(patientDistrict))
              ? 0.8
              : 0.0;
    }
    final proximityScore = proxFactor * w.proximity;
    final score = availScore + insScore + priceScore + deliveryScore + openScore + expiryScore + proximityScore;

    return _ScoredRaw(raw: r, score: score);
  }).toList();

  scored.sort((a, b) {
    final aFull = a.raw.availableCount == a.raw.totalCount ? 1 : 0;
    final bFull = b.raw.availableCount == b.raw.totalCount ? 1 : 0;
    if (bFull != aFull) return bFull.compareTo(aFull);
    return b.score.compareTo(a.score);
  });

  const codenames = ['A', 'B', 'C'];
  return [
    for (var i = 0; i < scored.length && i < 3; i++)
      ScoredPharmacyOption(
        pharmacy: scored[i].raw.pharmacy,
        availableCount: scored[i].raw.availableCount,
        totalCount: scored[i].raw.totalCount,
        priceEstimate: scored[i].raw.priceEstimate,
        insuranceMatch: scored[i].raw.insuranceMatch,
        insuranceSaving: scored[i].raw.insuranceSaving,
        distanceKm: scored[i].raw.distanceKm,
        estimatedDeliveryMin: scored[i].raw.estimatedMin,
        score: scored[i].score,
        rank: i + 1,
        codename: codenames[i],
      ),
  ];
}

double deliveryFeeForMedicinesSubtotal(double medicinesSubtotal, {bool isPickup = false, double straightLineKm = 0}) {
  if (straightLineKm > 0) {
    return deliveryFeeForRoadKm(straightLineKm, isPickup: isPickup);
  }
  return deliveryFeeForMedicinesSubtotalLegacy(medicinesSubtotal, isPickup: isPickup);
}

double deliveryFeeForMedicinesSubtotalLegacy(double medicinesSubtotal, {bool isPickup = false}) {
  if (isPickup) return 0;
  return medicinesSubtotal >= 10000 ? 0 : 1500;
}

class _RawScore {
  _RawScore({
    required this.pharmacy,
    required this.availableCount,
    required this.totalCount,
    required this.priceEstimate,
    required this.insuranceMatch,
    required this.insuranceSaving,
    required this.avgFulfillment,
    required this.minExpiryDays,
    required this.distanceKm,
    required this.estimatedMin,
  });

  final Pharmacy pharmacy;
  final int availableCount;
  final int totalCount;
  final double priceEstimate;
  final bool insuranceMatch;
  final double insuranceSaving;
  final int avgFulfillment;
  final double minExpiryDays;
  final double distanceKm;
  final int estimatedMin;
}

class _ScoredRaw {
  _ScoredRaw({required this.raw, required this.score});
  final _RawScore raw;
  final double score;
}

class _Weights {
  const _Weights({
    required this.avail,
    required this.ins,
    required this.price,
    required this.delivery,
    required this.open,
    required this.expiry,
    required this.proximity,
  });

  final int avail;
  final int ins;
  final int price;
  final int delivery;
  final int open;
  final int expiry;
  final int proximity;
}
