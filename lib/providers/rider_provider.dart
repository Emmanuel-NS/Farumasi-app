// lib/providers/rider_provider.dart
// Riverpod state management for the FARUMASI Rider interface.
// Uses mock data; structured for easy backend swap-in.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/rider_models.dart';

// ─── State ────────────────────────────────────────────────────────────────────

class RiderState {
  final bool isOnline;
  final RiderProfile profile;
  final RiderDeliveryOrder? activeDelivery;
  final List<RiderDeliveryOrder> pendingRequests;
  final List<RiderDeliveryOrder> history;
  final RiderEarnings earnings;
  final List<RiderNotificationItem> notifications;
  final bool isLoading;

  const RiderState({
    required this.isOnline,
    required this.profile,
    this.activeDelivery,
    required this.pendingRequests,
    required this.history,
    required this.earnings,
    required this.notifications,
    this.isLoading = false,
  });

  int get unreadNotificationCount =>
      notifications.where((n) => !n.isRead).length;

  RiderState copyWith({
    bool? isOnline,
    RiderProfile? profile,
    Object? activeDelivery = _sentinel,
    List<RiderDeliveryOrder>? pendingRequests,
    List<RiderDeliveryOrder>? history,
    RiderEarnings? earnings,
    List<RiderNotificationItem>? notifications,
    bool? isLoading,
  }) {
    return RiderState(
      isOnline: isOnline ?? this.isOnline,
      profile: profile ?? this.profile,
      activeDelivery: activeDelivery == _sentinel
          ? this.activeDelivery
          : activeDelivery as RiderDeliveryOrder?,
      pendingRequests: pendingRequests ?? this.pendingRequests,
      history: history ?? this.history,
      earnings: earnings ?? this.earnings,
      notifications: notifications ?? this.notifications,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

const _sentinel = Object();

// ─── Mock seed data ───────────────────────────────────────────────────────────

final _mockProfile = const RiderProfile(
  id: 'RDR-001',
  name: 'Jean Paul',
  phone: '+250 788 123 456',
  riderType: RiderType.monthly,
  vehicleType: 'Motorcycle',
  vehiclePlate: 'RAC 123 A',
  availability: RiderAvailability.offline,
  assignedArea: 'Kigali City – All Districts',
  isVerified: true,
  payoutMethod: 'MTN Mobile Money',
);

List<RiderDeliveryOrder> _buildMockRequests() => [
      RiderDeliveryOrder(
        id: 'ORD-0041',
        orderCode: '#RX-1041',
        pickupName: 'Pharmacia Plus',
        pickupAddress: 'KN 5 Ave, Nyarugenge, Kigali',
        pickupCoordinates: [-1.9441, 30.0619],
        destinationAddress: 'Kimironko Sector, Gasabo',
        destinationCoordinates: [-1.9313, 30.0877],
        customerNameMasked: 'Jean P.',
        customerPhoneMasked: '+250 78X XXX 123',
        estimatedDistanceKm: 4.2,
        estimatedTimeMinutes: 18,
        deliveryFee: 2000.0,
        riderEarning: 1500.0,
        packageCount: 2,
        specialNote: 'Keep refrigerated',
        qrCode: 'FARUMASI-QR-RX-1041',
        createdAt: DateTime.now().subtract(const Duration(minutes: 3)),
      ),
      RiderDeliveryOrder(
        id: 'ORD-0042',
        orderCode: '#RX-1042',
        pickupName: 'Kigali Central Pharmacy',
        pickupAddress: 'KG 7 Ave, Kiyovu, Kigali',
        pickupCoordinates: [-1.9530, 30.0629],
        destinationAddress: 'Remera, Gasabo District',
        destinationCoordinates: [-1.9584, 30.1024],
        customerNameMasked: 'Amina K.',
        customerPhoneMasked: '+250 73X XXX 456',
        estimatedDistanceKm: 6.8,
        estimatedTimeMinutes: 25,
        deliveryFee: 2500.0,
        riderEarning: 2000.0,
        packageCount: 1,
        qrCode: 'FARUMASI-QR-RX-1042',
        createdAt: DateTime.now().subtract(const Duration(minutes: 7)),
      ),
      RiderDeliveryOrder(
        id: 'ORD-0043',
        orderCode: '#RX-1043',
        pickupName: 'Health Depot Remera',
        pickupAddress: 'KK 19 Ave, Remera, Kigali',
        pickupCoordinates: [-1.9600, 30.1050],
        destinationAddress: 'Kacyiru, Gasabo District',
        destinationCoordinates: [-1.9350, 30.0670],
        customerNameMasked: 'Pierre N.',
        customerPhoneMasked: '+250 72X XXX 789',
        estimatedDistanceKm: 3.1,
        estimatedTimeMinutes: 12,
        deliveryFee: 1500.0,
        riderEarning: 1200.0,
        packageCount: 3,
        qrCode: 'FARUMASI-QR-RX-1043',
        createdAt: DateTime.now().subtract(const Duration(minutes: 12)),
      ),
    ];

List<RiderDeliveryOrder> _buildMockHistory() {
  final now = DateTime.now();
  return [
    RiderDeliveryOrder(
      id: 'ORD-0038',
      orderCode: '#RX-1038',
      pickupName: 'Pharmacia Plus',
      pickupAddress: 'KN 5 Ave, Nyarugenge',
      pickupCoordinates: [-1.9441, 30.0619],
      destinationAddress: 'Gikondo, Kicukiro',
      destinationCoordinates: [-1.9757, 30.0706],
      customerNameMasked: 'Marie C.',
      customerPhoneMasked: '+250 78X XXX 321',
      estimatedDistanceKm: 5.5,
      estimatedTimeMinutes: 20,
      deliveryFee: 2000.0,
      riderEarning: 1500.0,
      qrCode: 'FARUMASI-QR-RX-1038',
      status: RiderDeliveryStatus.delivered,
      createdAt: now.subtract(const Duration(hours: 3)),
      acceptedAt: now.subtract(const Duration(hours: 3)),
      deliveredAt: now.subtract(const Duration(hours: 2, minutes: 25)),
    ),
    RiderDeliveryOrder(
      id: 'ORD-0037',
      orderCode: '#RX-1037',
      pickupName: 'Kigali Central Pharmacy',
      pickupAddress: 'KG 7 Ave, Kiyovu',
      pickupCoordinates: [-1.9530, 30.0629],
      destinationAddress: 'Nyamirambo, Nyarugenge',
      destinationCoordinates: [-1.9700, 30.0490],
      customerNameMasked: 'Robert M.',
      customerPhoneMasked: '+250 73X XXX 654',
      estimatedDistanceKm: 3.8,
      estimatedTimeMinutes: 15,
      deliveryFee: 1500.0,
      riderEarning: 1200.0,
      qrCode: 'FARUMASI-QR-RX-1037',
      status: RiderDeliveryStatus.delivered,
      createdAt: now.subtract(const Duration(hours: 5)),
      acceptedAt: now.subtract(const Duration(hours: 5)),
      deliveredAt: now.subtract(const Duration(hours: 4, minutes: 30)),
    ),
    RiderDeliveryOrder(
      id: 'ORD-0035',
      orderCode: '#RX-1035',
      pickupName: 'Health Depot Remera',
      pickupAddress: 'KK 19 Ave, Remera',
      pickupCoordinates: [-1.9600, 30.1050],
      destinationAddress: 'Kibagabaga, Gasabo',
      destinationCoordinates: [-1.9200, 30.0900],
      customerNameMasked: 'Grace U.',
      customerPhoneMasked: '+250 72X XXX 000',
      estimatedDistanceKm: 2.9,
      estimatedTimeMinutes: 11,
      deliveryFee: 1500.0,
      riderEarning: 1200.0,
      qrCode: 'FARUMASI-QR-RX-1035',
      status: RiderDeliveryStatus.rejected,
      createdAt: now.subtract(const Duration(hours: 7)),
    ),
    RiderDeliveryOrder(
      id: 'ORD-0033',
      orderCode: '#RX-1033',
      pickupName: 'MediStore Kicukiro',
      pickupAddress: 'KK 9 Ave, Kicukiro',
      pickupCoordinates: [-1.9800, 30.0800],
      destinationAddress: 'Kanombe, Kicukiro',
      destinationCoordinates: [-1.9680, 30.1200],
      customerNameMasked: 'David K.',
      customerPhoneMasked: '+250 78X XXX 101',
      estimatedDistanceKm: 7.2,
      estimatedTimeMinutes: 28,
      deliveryFee: 3000.0,
      riderEarning: 2400.0,
      qrCode: 'FARUMASI-QR-RX-1033',
      status: RiderDeliveryStatus.delivered,
      createdAt: now.subtract(const Duration(days: 1, hours: 2)),
      acceptedAt: now.subtract(const Duration(days: 1, hours: 2)),
      deliveredAt: now.subtract(const Duration(days: 1, hours: 1, minutes: 20)),
    ),
  ];
}

RiderEarnings _buildMockEarnings(List<RiderDeliveryOrder> history) {
  final now = DateTime.now();
  final todayDelivered = history.where(
    (o) =>
        o.status == RiderDeliveryStatus.delivered &&
        o.deliveredAt != null &&
        o.deliveredAt!.day == now.day,
  );
  final weekDelivered = history.where(
    (o) =>
        o.status == RiderDeliveryStatus.delivered &&
        o.deliveredAt != null &&
        now.difference(o.deliveredAt!).inDays < 7,
  );

  final todayEarnings =
      todayDelivered.fold(0.0, (sum, o) => sum + o.riderEarning);
  final weeklyEarnings =
      weekDelivered.fold(0.0, (sum, o) => sum + o.riderEarning);

  final recentEntries = history
      .where((o) => o.status == RiderDeliveryStatus.delivered)
      .map(
        (o) => EarningEntry(
          orderId: o.id,
          orderCode: o.orderCode,
          destinationArea: o.destinationAddress.split(',').first,
          amount: o.riderEarning,
          date: o.deliveredAt ?? o.createdAt,
          isPaid: true,
        ),
      )
      .toList();

  return RiderEarnings(
    todayEarnings: todayEarnings,
    weeklyEarnings: weeklyEarnings,
    monthlyEarnings: 54_200.0,
    todayTrips: todayDelivered.length,
    weeklyTrips: weekDelivered.length,
    pendingPayout: 14_700.0,
    paymentPeriodLabel: 'May 1 – May 31, 2026',
    paymentStatus: 'Pending',
    recentEntries: recentEntries,
    // Salary fields (used when riderType != perTrip)
    fixedSalary: 80_000.0,
    tripTarget: 60,
    periodTripsCompleted: 43,
    bonusPerExtraTrip: 800.0,
    nextPayDate: DateTime(2026, 5, 31),
  );
}

List<RiderNotificationItem> _buildMockNotifications() => [
      RiderNotificationItem(
        id: 'N-001',
        title: 'New Delivery Request',
        message: 'Order #RX-1041 from Pharmacia Plus is waiting for pickup.',
        type: 'delivery',
        isRead: false,
        createdAt: DateTime.now().subtract(const Duration(minutes: 3)),
      ),
      RiderNotificationItem(
        id: 'N-002',
        title: 'New Delivery Request',
        message: 'Order #RX-1042 from Kigali Central Pharmacy is available.',
        type: 'delivery',
        isRead: false,
        createdAt: DateTime.now().subtract(const Duration(minutes: 7)),
      ),
      RiderNotificationItem(
        id: 'N-003',
        title: 'Payment Processed',
        message: '14,700 RWF has been sent to your MTN Mobile Money.',
        type: 'payment',
        isRead: true,
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      RiderNotificationItem(
        id: 'N-004',
        title: 'Performance Update',
        message: 'You completed 12 trips this week. Keep it up!',
        type: 'system',
        isRead: true,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
      RiderNotificationItem(
        id: 'N-005',
        title: 'Admin Message',
        message:
            'Reminder: Always confirm QR before marking delivery complete.',
        type: 'alert',
        isRead: true,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
    ];

// ─── Notifier ─────────────────────────────────────────────────────────────────

class RiderNotifier extends StateNotifier<RiderState> {
  RiderNotifier()
      : super(() {
          final hist = _buildMockHistory();
          return RiderState(
            isOnline: false,
            profile: _mockProfile,
            activeDelivery: null,
            pendingRequests: _buildMockRequests(),
            history: hist,
            earnings: _buildMockEarnings(hist),
            notifications: _buildMockNotifications(),
          );
        }());

  // ── Online / Offline ────────────────────────────────────────────────────────

  void setOnline(bool value) {
    state = state.copyWith(
      isOnline: value,
      profile: state.profile.copyWith(
        availability:
            value ? RiderAvailability.online : RiderAvailability.offline,
      ),
    );
  }

  // ── Demo: cycle rider type for testing ────────────────────────────

  void switchRiderTypeDemo(RiderType type) {
    state = state.copyWith(
      profile: state.profile.copyWith(riderType: type),
    );
  }

  // ── Accept a delivery ───────────────────────────────────────────────────────

  void acceptDelivery(RiderDeliveryOrder order) {
    final accepted = order.copyWith(
      status: RiderDeliveryStatus.accepted,
      activeStep: DeliveryStep.goToPickup,
      acceptedAt: DateTime.now(),
    );
    final remaining =
        state.pendingRequests.where((o) => o.id != order.id).toList();

    state = state.copyWith(
      activeDelivery: accepted,
      pendingRequests: remaining,
      profile: state.profile.copyWith(availability: RiderAvailability.busy),
    );
  }

  // ── Reject a delivery ───────────────────────────────────────────────────────

  void rejectDelivery(String orderId, String reason, {String? customReason}) {
    final updated = state.pendingRequests.map((o) {
      if (o.id == orderId) {
        return o.copyWith(status: RiderDeliveryStatus.rejected);
      }
      return o;
    }).toList();

    final rejected =
        updated.firstWhere((o) => o.id == orderId, orElse: () => updated.first);
    final remaining = updated.where((o) => o.id != orderId).toList();

    state = state.copyWith(
      pendingRequests: remaining,
      history: [rejected, ...state.history],
    );
  }

  // ── Advance delivery step ───────────────────────────────────────────────────

  void advanceStep() {
    final active = state.activeDelivery;
    if (active == null) return;

    final now = DateTime.now();
    RiderDeliveryOrder updated;

    switch (active.activeStep) {
      case DeliveryStep.goToPickup:
        // Arrived at pharmacy
        updated = active.copyWith(
          status: RiderDeliveryStatus.arrivedAtPickup,
          activeStep: DeliveryStep.atPickup,
          pickupArrivedAt: now,
        );
      case DeliveryStep.atPickup:
        // Picked up and starting delivery
        updated = active.copyWith(
          status: RiderDeliveryStatus.outForDelivery,
          activeStep: DeliveryStep.delivering,
          pickedUpAt: now,
          deliveryStartedAt: now,
        );
      case DeliveryStep.delivering:
        // Arrived at destination
        updated = active.copyWith(
          status: RiderDeliveryStatus.arrivedAtDestination,
          activeStep: DeliveryStep.atDestination,
          destinationArrivedAt: now,
        );
      case DeliveryStep.atDestination:
      case null:
        // Handled by QR confirmation
        return;
    }

    state = state.copyWith(activeDelivery: updated);
  }

  // ── QR confirmation ─────────────────────────────────────────────────────────

  QRConfirmationResult confirmQR(String scannedCode) {
    final active = state.activeDelivery;
    if (active == null) {
      return const QRConfirmationResult(
        success: false,
        message: 'No active delivery found.',
      );
    }

    if (scannedCode.trim() != active.qrCode.trim()) {
      return QRConfirmationResult(
        success: false,
        message: 'Wrong QR code. Please scan the patient\'s order QR.',
        scannedCode: scannedCode,
      );
    }

    final delivered = active.copyWith(
      status: RiderDeliveryStatus.delivered,
      deliveredAt: DateTime.now(),
    );

    final updatedHistory = [delivered, ...state.history];
    final updatedEarnings = _rebuildEarnings(updatedHistory);

    state = state.copyWith(
      activeDelivery: null,
      history: updatedHistory,
      earnings: updatedEarnings,
      profile: state.profile.copyWith(availability: RiderAvailability.online),
    );

    return const QRConfirmationResult(
      success: true,
      message: 'Delivery confirmed! Great job.',
    );
  }

  RiderEarnings _rebuildEarnings(List<RiderDeliveryOrder> history) {
    return _buildMockEarnings(history);
  }

  // ── Notifications ───────────────────────────────────────────────────────────

  void markNotificationRead(String id) {
    final updated = state.notifications.map((n) {
      if (n.id == id) {
        n.isRead = true;
        return n;
      }
      return n;
    }).toList();
    state = state.copyWith(notifications: updated);
  }

  void markAllNotificationsRead() {
    final updated = state.notifications.map((n) {
      n.isRead = true;
      return n;
    }).toList();
    state = state.copyWith(notifications: updated);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final riderProvider =
    StateNotifierProvider<RiderNotifier, RiderState>((ref) => RiderNotifier());
