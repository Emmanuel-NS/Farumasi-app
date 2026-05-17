// lib/models/rider_models.dart
// Rider-specific data models for FARUMASI delivery interface.

// ─── Enums ────────────────────────────────────────────────────────────────────

enum RiderType { perTrip, weekly, monthly }

enum RiderAvailability { online, offline, busy }

/// The four visible steps a rider walks through per delivery.
enum DeliveryStep {
  goToPickup,    // 1 – Navigate to pharmacy / pickup point
  atPickup,      // 2 – Arrived; confirm pickup
  delivering,    // 3 – On the way to patient
  atDestination, // 4 – Arrived; scan QR
}

/// Full status vocabulary kept for audit trail / admin visibility.
enum RiderDeliveryStatus {
  pending,
  accepted,
  goingToPickup,
  arrivedAtPickup,
  pickedUp,
  outForDelivery,
  arrivedAtDestination,
  qrVerificationPending,
  delivered,
  failed,
  cancelled,
  rejected,
}

// ─── Rider profile ────────────────────────────────────────────────────────────

class RiderProfile {
  final String id;
  final String name;
  final String phone;
  final RiderType riderType;
  final String vehicleType;
  final String vehiclePlate;
  final RiderAvailability availability;
  final String assignedArea;
  final bool isVerified;
  final String payoutMethod;

  const RiderProfile({
    required this.id,
    required this.name,
    required this.phone,
    required this.riderType,
    required this.vehicleType,
    required this.vehiclePlate,
    this.availability = RiderAvailability.offline,
    required this.assignedArea,
    this.isVerified = true,
    this.payoutMethod = 'MTN Mobile Money',
  });

  RiderProfile copyWith({
    RiderAvailability? availability,
    RiderType? riderType,
  }) {
    return RiderProfile(
      id: id,
      name: name,
      phone: phone,
      riderType: riderType ?? this.riderType,
      vehicleType: vehicleType,
      vehiclePlate: vehiclePlate,
      availability: availability ?? this.availability,
      assignedArea: assignedArea,
      isVerified: isVerified,
      payoutMethod: payoutMethod,
    );
  }

  String get riderTypeLabel {
    switch (riderType) {
      case RiderType.perTrip:
        return 'Per-Trip Rider';
      case RiderType.weekly:
        return 'Weekly Rider';
      case RiderType.monthly:
        return 'Monthly Rider';
    }
  }
}

// ─── Delivery order ───────────────────────────────────────────────────────────

class RiderDeliveryOrder {
  final String id;
  final String orderCode;
  final String pickupName;
  final String pickupAddress;
  final List<double> pickupCoordinates; // [lat, lng]
  final String destinationAddress;
  final List<double> destinationCoordinates;
  final String customerNameMasked;
  final String customerPhoneMasked;
  final double estimatedDistanceKm;
  final int estimatedTimeMinutes;
  final double deliveryFee;
  final double riderEarning;
  final int packageCount;
  final String? specialNote;
  final String qrCode; // expected QR value for confirmation

  RiderDeliveryStatus status;
  DeliveryStep? activeStep;

  final DateTime createdAt;
  DateTime? acceptedAt;
  DateTime? pickupArrivedAt;
  DateTime? pickedUpAt;
  DateTime? deliveryStartedAt;
  DateTime? destinationArrivedAt;
  DateTime? deliveredAt;

  RiderDeliveryOrder({
    required this.id,
    required this.orderCode,
    required this.pickupName,
    required this.pickupAddress,
    required this.pickupCoordinates,
    required this.destinationAddress,
    required this.destinationCoordinates,
    required this.customerNameMasked,
    required this.customerPhoneMasked,
    required this.estimatedDistanceKm,
    required this.estimatedTimeMinutes,
    required this.deliveryFee,
    required this.riderEarning,
    this.packageCount = 1,
    this.specialNote,
    required this.qrCode,
    this.status = RiderDeliveryStatus.pending,
    this.activeStep,
    required this.createdAt,
    this.acceptedAt,
    this.pickupArrivedAt,
    this.pickedUpAt,
    this.deliveryStartedAt,
    this.destinationArrivedAt,
    this.deliveredAt,
  });

  RiderDeliveryOrder copyWith({
    RiderDeliveryStatus? status,
    DeliveryStep? activeStep,
    DateTime? acceptedAt,
    DateTime? pickupArrivedAt,
    DateTime? pickedUpAt,
    DateTime? deliveryStartedAt,
    DateTime? destinationArrivedAt,
    DateTime? deliveredAt,
  }) {
    return RiderDeliveryOrder(
      id: id,
      orderCode: orderCode,
      pickupName: pickupName,
      pickupAddress: pickupAddress,
      pickupCoordinates: pickupCoordinates,
      destinationAddress: destinationAddress,
      destinationCoordinates: destinationCoordinates,
      customerNameMasked: customerNameMasked,
      customerPhoneMasked: customerPhoneMasked,
      estimatedDistanceKm: estimatedDistanceKm,
      estimatedTimeMinutes: estimatedTimeMinutes,
      deliveryFee: deliveryFee,
      riderEarning: riderEarning,
      packageCount: packageCount,
      specialNote: specialNote,
      qrCode: qrCode,
      status: status ?? this.status,
      activeStep: activeStep ?? this.activeStep,
      createdAt: createdAt,
      acceptedAt: acceptedAt ?? this.acceptedAt,
      pickupArrivedAt: pickupArrivedAt ?? this.pickupArrivedAt,
      pickedUpAt: pickedUpAt ?? this.pickedUpAt,
      deliveryStartedAt: deliveryStartedAt ?? this.deliveryStartedAt,
      destinationArrivedAt: destinationArrivedAt ?? this.destinationArrivedAt,
      deliveredAt: deliveredAt ?? this.deliveredAt,
    );
  }

  Duration get elapsedSinceAccepted {
    if (acceptedAt == null) return Duration.zero;
    final end = deliveredAt ?? DateTime.now();
    return end.difference(acceptedAt!);
  }

  String get elapsedLabel {
    final d = elapsedSinceAccepted;
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    final s = d.inSeconds.remainder(60);
    if (h > 0) return '${h}h ${m}m';
    if (m > 0) return '${m}m ${s}s';
    return '${s}s';
  }

  String get statusLabel {
    switch (status) {
      case RiderDeliveryStatus.pending:
        return 'Pending';
      case RiderDeliveryStatus.accepted:
        return 'Accepted';
      case RiderDeliveryStatus.goingToPickup:
        return 'Going to Pickup';
      case RiderDeliveryStatus.arrivedAtPickup:
        return 'At Pharmacy';
      case RiderDeliveryStatus.pickedUp:
        return 'Picked Up';
      case RiderDeliveryStatus.outForDelivery:
        return 'Out for Delivery';
      case RiderDeliveryStatus.arrivedAtDestination:
        return 'At Destination';
      case RiderDeliveryStatus.qrVerificationPending:
        return 'Verifying QR';
      case RiderDeliveryStatus.delivered:
        return 'Delivered';
      case RiderDeliveryStatus.failed:
        return 'Failed';
      case RiderDeliveryStatus.cancelled:
        return 'Cancelled';
      case RiderDeliveryStatus.rejected:
        return 'Rejected';
    }
  }
}

// ─── Rejection record ─────────────────────────────────────────────────────────

class RejectionRecord {
  final String orderId;
  final String riderId;
  final String reason;
  final String? customReason;
  final DateTime createdAt;

  const RejectionRecord({
    required this.orderId,
    required this.riderId,
    required this.reason,
    this.customReason,
    required this.createdAt,
  });
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

class EarningEntry {
  final String orderId;
  final String orderCode;
  final String destinationArea;
  final double amount;
  final DateTime date;
  final bool isPaid;

  const EarningEntry({
    required this.orderId,
    required this.orderCode,
    required this.destinationArea,
    required this.amount,
    required this.date,
    required this.isPaid,
  });
}

class RiderEarnings {
  final double todayEarnings;
  final double weeklyEarnings;
  final double monthlyEarnings;
  final int todayTrips;
  final int weeklyTrips;
  final double pendingPayout;
  final String paymentPeriodLabel; // e.g. "May 1 – May 31"
  final String paymentStatus; // "Pending" | "Paid" | "Processing"
  final List<EarningEntry> recentEntries;

  // ── Salary fields (weekly / monthly riders only) ──────────────────────────
  /// Fixed base salary for the period. 0.0 for per-trip riders.
  final double fixedSalary;
  /// Minimum deliveries required per period for full salary. 0 = no target.
  final int tripTarget;
  /// Deliveries completed so far in the current pay period.
  final int periodTripsCompleted;
  /// Bonus earned per delivery above `tripTarget`. 0.0 = no bonus structure.
  final double bonusPerExtraTrip;
  /// Expected payment date for the current period.
  final DateTime? nextPayDate;

  const RiderEarnings({
    required this.todayEarnings,
    required this.weeklyEarnings,
    required this.monthlyEarnings,
    required this.todayTrips,
    required this.weeklyTrips,
    required this.pendingPayout,
    required this.paymentPeriodLabel,
    required this.paymentStatus,
    required this.recentEntries,
    this.fixedSalary = 0.0,
    this.tripTarget = 0,
    this.periodTripsCompleted = 0,
    this.bonusPerExtraTrip = 0.0,
    this.nextPayDate,
  });

  double get bonusEarned {
    if (tripTarget <= 0 || bonusPerExtraTrip <= 0) return 0.0;
    final extra = periodTripsCompleted - tripTarget;
    return extra > 0 ? extra * bonusPerExtraTrip : 0.0;
  }

  double get totalSalaryEarned => fixedSalary + bonusEarned;
}

// ─── Notification ─────────────────────────────────────────────────────────────

class RiderNotificationItem {
  final String id;
  final String title;
  final String message;
  final String type; // 'delivery' | 'payment' | 'system' | 'alert'
  bool isRead;
  final DateTime createdAt;

  RiderNotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    this.isRead = false,
    required this.createdAt,
  });
}

// ─── QR Confirmation result ───────────────────────────────────────────────────

class QRConfirmationResult {
  final bool success;
  final String message;
  final String? scannedCode;

  const QRConfirmationResult({
    required this.success,
    required this.message,
    this.scannedCode,
  });
}
