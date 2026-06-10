import 'dart:math' as math;

/// Rwanda road-to-straight-line multiplier (matches API + patient portal).
const rwRoadFactor = 1.3;

const kigaliLatMin = -2.05;
const kigaliLatMax = -1.85;
const kigaliLonMin = 29.95;
const kigaliLonMax = 30.15;

const maxDeliveryKm = 20.0;

double roadDistanceKm(double straightLineKm) => straightLineKm * rwRoadFactor;

bool isOutsideKigali(double lat, double lon) {
  return !(lat >= kigaliLatMin &&
      lat <= kigaliLatMax &&
      lon >= kigaliLonMin &&
      lon <= kigaliLonMax);
}

/// Distance-based delivery fee in RWF (matches backend tiers).
double calcDeliveryFee(double roadKm) {
  if (roadKm <= 10) return 1500;
  if (roadKm <= 15) return 2000;
  if (roadKm <= 20) return 2500;
  return 2500 + (roadKm - 20).ceil() * 150;
}

bool deliveryBlockedOutsideKigali({
  required double roadKm,
  required double destLat,
  required double destLon,
}) {
  return roadKm > maxDeliveryKm && isOutsideKigali(destLat, destLon);
}

double deliveryFeeForRoadKm(double straightLineKm, {bool isPickup = false}) {
  if (isPickup || straightLineKm <= 0) return 0;
  return calcDeliveryFee(roadDistanceKm(straightLineKm));
}

/// Legacy subtotal-based fee — deprecated; kept for callers without distance.
@Deprecated('Use deliveryFeeForRoadKm with pharmacy distance')
double deliveryFeeForMedicinesSubtotal(double medicinesSubtotal, {bool isPickup = false}) {
  if (isPickup) return 0;
  return medicinesSubtotal >= 10000 ? 0 : 1500;
}
