import 'dart:math' as math;

import '../api/repositories/patient_repository.dart';
import '../core/sell_mode.dart';
import '../models/models.dart';
import 'delivery_pricing.dart';
import 'rx_insurance.dart';

const _kigaliDistricts = {'Gasabo', 'Nyarugenge', 'Kicukiro'};

class CartListingEntry {
  const CartListingEntry({
    required this.listingId,
    required this.price,
    required this.unitPrice,
    required this.status,
    required this.fulfillmentMin,
    this.expiryDate,
  });

  final String listingId;
  final double price;
  final double? unitPrice;
  final String status;
  final int fulfillmentMin;
  final DateTime? expiryDate;
}

typedef CartListingsMap = Map<String, Map<String, CartListingEntry>>;

class MedicineAvailability {
  const MedicineAvailability({
    required this.medicineName,
    required this.available,
    required this.stockStatus,
    required this.unitPrice,
  });

  final String medicineName;
  final bool available;
  final String stockStatus;
  final double unitPrice;
}

/// Mirrors portal `PharmacyOption` / `pharmacy-scoring.ts`.
class ScoredPharmacyOption {
  const ScoredPharmacyOption({
    required this.pharmacy,
    required this.rank,
    required this.codename,
    required this.availability,
    required this.availableCount,
    required this.totalCount,
    required this.priceEstimate,
    required this.priceAfterInsurance,
    required this.insuranceMatch,
    required this.insuranceSaving,
    this.rxHasInsurance = false,
    required this.distanceKm,
    required this.roadDistanceKm,
    required this.score,
    required this.maxScore,
    required this.matchPercent,
    required this.deliveryAvailable,
    required this.priceRank,
    required this.fullStockPriceRank,
    required this.comparesOnFullStockPrice,
    required this.distanceRank,
    required this.totalCandidates,
    this.rxInsuranceActive = false,
  });

  final Pharmacy pharmacy;
  final int rank;
  final String codename;
  final List<MedicineAvailability> availability;
  final int availableCount;
  final int totalCount;
  final double priceEstimate;
  final double priceAfterInsurance;
  final bool insuranceMatch;
  final double insuranceSaving;
  final bool rxHasInsurance;
  final double distanceKm;
  final double roadDistanceKm;
  final double score;
  final double maxScore;
  final int matchPercent;
  final bool deliveryAvailable;
  final int priceRank;
  final int fullStockPriceRank;
  final bool comparesOnFullStockPrice;
  final int distanceRank;
  final int totalCandidates;
  final bool rxInsuranceActive;

  double get priceAfterIns => priceAfterInsurance;
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

double roadDistanceKm(double straightLineKm) => straightLineKm * 1.3;

CartListingEntry listingToCartEntry(BackendListing listing) {
  return CartListingEntry(
    listingId: listing.id,
    price: listing.price,
    unitPrice: listing.unitPrice,
    status: listing.availabilityStatus,
    fulfillmentMin: listing.fulfillmentTimeMinutes ?? 60,
    expiryDate: listing.expiryDate,
  );
}

/// Mirrors `scorePharmacies` in patient portal.
List<ScoredPharmacyOption> scorePharmacies({
  required List<CartItem> cartLines,
  required List<Pharmacy> pharmacies,
  required CartListingsMap listingsMap,
  String patientDistrict = '',
  List<double>? patientLocation,
  String? rxInsuranceProvider,
  num? rxInsuranceDiscountPct,
}) {
  if (pharmacies.isEmpty || cartLines.isEmpty) return [];

  final raw = <_RawPharmacyScore>[];
  for (final pharmacy in pharmacies) {
    final byProduct = listingsMap[pharmacy.id] ?? {};
    final availability = <MedicineAvailability>[];
    for (final item in cartLines) {
      final entry = byProduct[item.medicine.id];
      if (entry == null) {
        availability.add(MedicineAvailability(
          medicineName: item.medicine.name,
          available: false,
          stockStatus: 'unavailable',
          unitPrice: 0,
        ));
        continue;
      }
      if (item.sellMode == SellMode.partial &&
          (entry.unitPrice == null || entry.unitPrice! <= 0)) {
        availability.add(MedicineAvailability(
          medicineName: item.medicine.name,
          available: false,
          stockStatus: 'no_partial_price',
          unitPrice: 0,
        ));
        continue;
      }
      final linePrice = item.sellMode == SellMode.partial
          ? entry.unitPrice! * item.quantity
          : entry.price * item.quantity;
      final status = entry.status.toLowerCase();
      availability.add(MedicineAvailability(
        medicineName: item.medicine.name,
        available: status == 'available' || status == 'low_stock',
        stockStatus: entry.status,
        unitPrice: linePrice,
      ));
    }

    final availableCount = availability.where((a) => a.available).length;
    final priceEstimate =
        availability.fold<double>(0, (s, a) => s + a.unitPrice);
    final now = DateTime.now();
    final expiryDays = byProduct.values
        .where((e) => e.expiryDate != null)
        .map((e) => e.expiryDate!.difference(now).inDays)
        .toList();
    final minExpiryDays =
        expiryDays.isEmpty ? double.infinity : expiryDays.reduce(math.min).toDouble();

    final distanceKm = patientLocation != null && patientLocation.length >= 2
        ? haversineKm(
            patientLocation[0],
            patientLocation[1],
            pharmacy.coordinates[0],
            pharmacy.coordinates[1],
          )
        : 0.0;
    final roadKm = distanceKm > 0 ? roadDistanceKm(distanceKm) : 0.0;

    if (availableCount == 0) continue;
    raw.add(_RawPharmacyScore(
      pharmacy: pharmacy,
      availability: availability,
      availableCount: availableCount,
      totalCount: cartLines.length,
      priceEstimate: priceEstimate,
      minExpiryDays: minExpiryDays,
      distanceKm: distanceKm,
      roadKm: roadKm,
    ));
  }

  if (raw.isEmpty) return [];

  final totalCandidates = raw.length;
  final fullStock = raw.where((r) => r.availableCount == r.totalCount).toList();

  final priceRankById = <String, int>{};
  final sortedByPrice = [...raw]..sort((a, b) => a.priceEstimate.compareTo(b.priceEstimate));
  for (var i = 0; i < sortedByPrice.length; i++) {
    priceRankById[sortedByPrice[i].pharmacy.id] = i + 1;
  }

  final fullStockPriceRankById = <String, int>{};
  final sortedFullStock = [...fullStock]
    ..sort((a, b) => a.priceEstimate.compareTo(b.priceEstimate));
  for (var i = 0; i < sortedFullStock.length; i++) {
    fullStockPriceRankById[sortedFullStock[i].pharmacy.id] = i + 1;
  }

  final distanceRankById = <String, int>{};
  final withDist = raw.where((r) => r.distanceKm > 0).toList()
    ..sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
  for (var i = 0; i < withDist.length; i++) {
    distanceRankById[withDist[i].pharmacy.id] = i + 1;
  }

  final fullPrices = fullStock.map((r) => r.priceEstimate).toList();
  final minFullPrice = fullPrices.isEmpty ? 0.0 : fullPrices.reduce(math.min);
  final maxFullPrice = fullPrices.isEmpty ? 0.0 : fullPrices.reduce(math.max);
  final fullPriceRange = maxFullPrice - minFullPrice == 0 ? 1.0 : maxFullPrice - minFullPrice;

  final distWithKm = raw.where((r) => r.distanceKm > 0).toList();
  final minDist = distWithKm.isEmpty ? 0.0 : distWithKm.map((r) => r.distanceKm).reduce(math.min);
  final maxDist = distWithKm.isEmpty ? 0.0 : distWithKm.map((r) => r.distanceKm).reduce(math.max);
  final distRange = maxDist - minDist == 0 ? 1.0 : maxDist - minDist;

  final rxHasInsurance =
      rxInsuranceProvider != null && (rxInsuranceDiscountPct ?? 0) > 0;
  final discountPct = rxInsuranceDiscountPct ?? 0;
  const wAvail = 35.0;
  const wOpen = 15.0;
  final wInsurance = rxHasInsurance ? 20.0 : 0.0;
  const wProximity = 15.0;
  const wPrice = 15.0;
  final maxScore = wAvail + wOpen + wInsurance + wProximity + wPrice;

  final scored = raw.map((r) {
    final isFull = r.availableCount == r.totalCount;
    final availRatio = r.availableCount / r.totalCount;
    final availScore = availRatio * wAvail * (isFull ? 1 : 0.75);
    final openScore = r.pharmacy.isOpen ? wOpen : 0.0;
    final insuranceMatch = rxHasInsurance &&
        pharmacyAcceptsRxInsurance(
          r.pharmacy.supportedInsurances,
          rxInsuranceProvider,
        );
    final insScore = insuranceMatch ? wInsurance : 0.0;
    final insuranceSaving = insuranceMatch
        ? calcInsuranceSaving(r.priceEstimate, discountPct).toDouble()
        : 0.0;
    final priceAfterIns = insuranceMatch
        ? priceAfterInsurance(r.priceEstimate, discountPct)
        : r.priceEstimate;

    var proximityScore = 0.0;
    if (patientLocation != null && r.distanceKm > 0) {
      proximityScore =
          (1 - (r.distanceKm - minDist) / distRange) * wProximity;
    } else if (patientDistrict.isNotEmpty) {
      final pharmDistrict = r.pharmacy.district;
      final proxFactor = pharmDistrict == patientDistrict
          ? 1.0
          : (_kigaliDistricts.contains(pharmDistrict) &&
                  _kigaliDistricts.contains(patientDistrict))
              ? 0.85
              : 0.3;
      proximityScore = proxFactor * wProximity;
    }

    var priceScore = 0.0;
    if (isFull && fullStock.isNotEmpty == false) {
      priceScore = fullStock.length == 1
          ? wPrice
          : (1 - (r.priceEstimate - minFullPrice) / fullPriceRange) * wPrice;
    }

    final score = availScore + openScore + insScore + proximityScore + priceScore;
    final matchPercent = (score / maxScore * 100).round();

    return ScoredPharmacyOption(
      pharmacy: r.pharmacy,
      rank: 1,
      codename: 'A',
      availability: r.availability,
      availableCount: r.availableCount,
      totalCount: r.totalCount,
      priceEstimate: r.priceEstimate,
      priceAfterInsurance: priceAfterIns,
      insuranceMatch: insuranceMatch,
      insuranceSaving: insuranceSaving,
      rxHasInsurance: rxHasInsurance,
      distanceKm: r.distanceKm,
      roadDistanceKm: r.roadKm,
      score: score,
      maxScore: maxScore,
      matchPercent: matchPercent,
      deliveryAvailable: r.pharmacy.isOpen,
      priceRank: priceRankById[r.pharmacy.id] ?? totalCandidates,
      fullStockPriceRank: fullStockPriceRankById[r.pharmacy.id] ?? 0,
      comparesOnFullStockPrice: isFull,
      distanceRank: distanceRankById[r.pharmacy.id] ?? 0,
      totalCandidates: totalCandidates,
      rxInsuranceActive: insuranceMatch,
    );
  }).toList();

  scored.sort((a, b) {
    final aFull = a.availableCount == a.totalCount ? 1 : 0;
    final bFull = b.availableCount == b.totalCount ? 1 : 0;
    if (bFull != aFull) return bFull.compareTo(aFull);
    if (a.pharmacy.isOpen != b.pharmacy.isOpen) {
      return (b.pharmacy.isOpen ? 1 : 0).compareTo(a.pharmacy.isOpen ? 1 : 0);
    }
    return b.score.compareTo(a.score);
  });

  const codenames = ['A', 'B', 'C'];
  return [
    for (var i = 0; i < scored.length && i < 3; i++)
      ScoredPharmacyOption(
        pharmacy: scored[i].pharmacy,
        rank: i + 1,
        codename: codenames[i],
        availability: scored[i].availability,
        availableCount: scored[i].availableCount,
        totalCount: scored[i].totalCount,
        priceEstimate: scored[i].priceEstimate,
        priceAfterInsurance: scored[i].priceAfterInsurance,
        insuranceMatch: scored[i].insuranceMatch,
        insuranceSaving: scored[i].insuranceSaving,
        rxHasInsurance: scored[i].rxHasInsurance,
        distanceKm: scored[i].distanceKm,
        roadDistanceKm: scored[i].roadDistanceKm,
        score: scored[i].score,
        maxScore: scored[i].maxScore,
        matchPercent: scored[i].matchPercent,
        deliveryAvailable: scored[i].deliveryAvailable,
        priceRank: scored[i].priceRank,
        fullStockPriceRank: scored[i].fullStockPriceRank,
        comparesOnFullStockPrice: scored[i].comparesOnFullStockPrice,
        distanceRank: scored[i].distanceRank,
        totalCandidates: scored[i].totalCandidates,
        rxInsuranceActive: scored[i].rxInsuranceActive,
      ),
  ];
}

class _RawPharmacyScore {
  _RawPharmacyScore({
    required this.pharmacy,
    required this.availability,
    required this.availableCount,
    required this.totalCount,
    required this.priceEstimate,
    required this.minExpiryDays,
    required this.distanceKm,
    required this.roadKm,
  });

  final Pharmacy pharmacy;
  final List<MedicineAvailability> availability;
  final int availableCount;
  final int totalCount;
  final double priceEstimate;
  final double minExpiryDays;
  final double distanceKm;
  final double roadKm;
}

double deliveryFeeForMedicinesSubtotal(
  double medicinesSubtotal, {
  bool isPickup = false,
  double straightLineKm = 0,
}) {
  if (straightLineKm > 0) {
    return deliveryFeeForRoadKm(straightLineKm, isPickup: isPickup);
  }
  if (isPickup) return 0;
  return medicinesSubtotal >= 10000 ? 0 : 1500;
}
