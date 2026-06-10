import '../api_client.dart';
import '../../models/rider_models.dart';

/// Live FARUMASI rider delivery API (`/riders/me/*`).
class RiderRepository {
  final _client = FarumasiApiClient.instance;

  Future<RiderProfile> fetchProfile() async {
    final response = await _client.dio.get('/riders/me');
    return _mapProfile(response.data as Map<String, dynamic>);
  }

  Future<void> setAvailability(RiderAvailability availability) async {
    final status = switch (availability) {
      RiderAvailability.online => 'online',
      RiderAvailability.busy => 'busy',
      RiderAvailability.offline => 'offline',
    };
    await _client.dio.patch('/riders/me/availability', data: {
      'availability_status': status,
    });
  }

  Future<List<RiderDeliveryOrder>> listDeliveries() async {
    final response = await _client.dio.get('/riders/me/deliveries');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => _mapDelivery(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<RiderDeliveryOrder>> listActiveDeliveries() async {
    final response = await _client.dio.get('/riders/me/deliveries/active');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => _mapDelivery(e as Map<String, dynamic>))
        .toList();
  }

  Future<RiderEarnings> fetchEarnings() async {
    final response = await _client.dio.get('/riders/me/earnings');
    return _mapEarnings(response.data as Map<String, dynamic>);
  }

  Future<void> acceptDelivery(String deliveryId) async {
    await _client.dio.patch('/riders/me/deliveries/$deliveryId/accept');
  }

  Future<void> rejectDelivery(String deliveryId, String reason) async {
    await _client.dio.patch('/riders/me/deliveries/$deliveryId/reject', data: {
      'reason': 'other',
      'custom_reason': reason,
    });
  }

  Future<void> updateDeliveryStatus(String deliveryId, String status) async {
    await _client.dio.patch('/riders/me/deliveries/$deliveryId/status', data: {
      'status': status,
    });
  }

  Future<void> confirmQr(String deliveryId, String qrToken) async {
    await _client.dio.post('/riders/me/deliveries/$deliveryId/confirm-qr', data: {
      'qr_token': qrToken.trim(),
    });
  }

  Future<List<RiderNotificationItem>> fetchNotifications() async {
    final response = await _client.dio.get('/notifications/', queryParameters: {
      'limit': 30,
      'offset': 0,
    });
    final data = response.data;
    final List<dynamic> items = data is Map ? (data['items'] as List<dynamic>? ?? []) : (data as List<dynamic>);
    return items.map((e) => _mapNotification(e as Map<String, dynamic>)).toList();
  }

  Future<void> markNotificationRead(String notificationId) async {
    await _client.dio.patch('/notifications/$notificationId/read');
  }

  Future<void> markAllNotificationsRead() async {
    await _client.dio.post('/notifications/mark-all-read');
  }

  Future<void> requestPayout({
    required double amount,
    required String mobileNumber,
    required String paymentMethod,
  }) async {
    await _client.dio.post('/riders/me/payout-request', data: {
      'amount': amount,
      'mobile_number': mobileNumber,
      'payment_method': paymentMethod,
    });
  }

  /// Next API status when rider taps "Continue" on active delivery.
  static String? nextStatusAfterAdvance(String currentStatus) {
    switch (currentStatus) {
      case 'accepted':
        return 'going_to_pickup';
      case 'going_to_pickup':
        return 'arrived_at_pickup';
      case 'arrived_at_pickup':
        return 'picked_up';
      case 'picked_up':
        return 'out_for_delivery';
      case 'out_for_delivery':
        return 'arrived_at_destination';
      case 'arrived_at_destination':
        return 'qr_pending';
      default:
        return null;
    }
  }

  RiderProfile _mapProfile(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    final availability = json['availability_status'] as String? ?? 'offline';
    return RiderProfile(
      id: json['id'] as String,
      name: user?['full_name'] as String? ?? 'Rider',
      phone: user?['phone'] as String? ?? '',
      riderType: _mapRiderType(json['rider_type'] as String?),
      vehicleType: json['vehicle_type'] as String? ?? 'Motorcycle',
      vehiclePlate: json['vehicle_plate'] as String? ?? '',
      availability: _mapAvailability(availability),
      assignedArea: json['assigned_area'] as String? ?? 'Kigali',
      isVerified: (json['verification_status'] as String? ?? '') == 'verified',
      payoutMethod: json['payout_method'] as String? ?? 'MTN Mobile Money',
    );
  }

  RiderDeliveryOrder _mapDelivery(Map<String, dynamic> json) {
    final status = json['status'] as String? ?? 'pending_assignment';
    final pickupLat = _toDouble(json['pickup_latitude']);
    final pickupLng = _toDouble(json['pickup_longitude']);
    final destLat = _toDouble(json['destination_latitude']);
    final destLng = _toDouble(json['destination_longitude']);

    // Try to extract pharmacy name and patient info from nested order if backend includes it
    final order = json['order'] as Map<String, dynamic>?;
    final pharmacy = order?['pharmacy'] as Map<String, dynamic>?;
    final patient = order?['patient'] as Map<String, dynamic>?;
    final patientUser = patient?['user'] as Map<String, dynamic>?;

    final orderIdRaw = json['order_id'] as String? ?? '';
    final shortCode = orderIdRaw.length >= 8
        ? '#${orderIdRaw.substring(orderIdRaw.length - 8).toUpperCase()}'
        : '#${orderIdRaw.toUpperCase()}';

    String maskName(String? full) {
      if (full == null || full.isEmpty) return 'Patient';
      final parts = full.trim().split(RegExp(r'\s+'));
      if (parts.length == 1) return '${parts[0][0]}***';
      return '${parts[0]} ${parts[1][0]}.';
    }

    return RiderDeliveryOrder(
      id: json['id'] as String,
      orderCode: order?['order_code'] as String? ?? shortCode,
      pickupName: pharmacy?['name'] as String? ?? 'Pharmacy',
      pickupAddress: json['pickup_address'] as String? ?? pharmacy?['address'] as String? ?? 'Pharmacy pickup',
      pickupCoordinates: [pickupLat ?? -1.9441, pickupLng ?? 30.0619],
      destinationAddress: json['destination_address'] as String? ?? 'Patient address',
      destinationCoordinates: [destLat ?? -1.9441, destLng ?? 30.0619],
      customerNameMasked: maskName(patientUser?['full_name'] as String?),
      customerPhoneMasked: patientUser != null ? '—' : '—',
      estimatedDistanceKm: _toDouble(json['estimated_distance_km']) ?? 4.0,
      estimatedTimeMinutes: json['estimated_time_minutes'] as int? ?? 20,
      deliveryFee: _toDouble(json['delivery_fee']) ?? 0,
      riderEarning: _toDouble(json['rider_earning']) ?? 0,
      qrCode: json['qr_token'] as String? ?? json['qr_code'] as String? ?? '',
      status: _mapDeliveryStatus(status),
      activeStep: _mapActiveStep(status),
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      acceptedAt: DateTime.tryParse(json['accepted_at'] as String? ?? ''),
      pickupArrivedAt: DateTime.tryParse(json['pickup_arrived_at'] as String? ?? ''),
      pickedUpAt: DateTime.tryParse(json['picked_up_at'] as String? ?? ''),
      deliveryStartedAt: DateTime.tryParse(json['delivery_started_at'] as String? ?? ''),
      destinationArrivedAt: DateTime.tryParse(json['destination_arrived_at'] as String? ?? ''),
      deliveredAt: DateTime.tryParse(json['delivered_at'] as String? ?? ''),
    );
  }

  RiderNotificationItem _mapNotification(Map<String, dynamic> json) {
    return RiderNotificationItem(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Notification',
      message: json['message'] as String? ?? json['body'] as String? ?? '',
      type: json['category'] as String? ?? 'system',
      isRead: json['read_status'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }

  RiderEarnings _mapEarnings(Map<String, dynamic> json) {
    return RiderEarnings(
      todayEarnings: _toDouble(json['estimated_earnings_today']) ?? 0,
      weeklyEarnings: _toDouble(json['estimated_earnings_week']) ?? 0,
      monthlyEarnings: _toDouble(json['estimated_earnings_month']) ?? 0,
      todayTrips: json['completed_deliveries_today'] as int? ?? 0,
      weeklyTrips: json['completed_deliveries_week'] as int? ?? 0,
      pendingPayout: _toDouble(json['pending_payout']) ?? 0,
      paymentPeriodLabel: 'Current period',
      paymentStatus: 'Pending',
      recentEntries: const [],
    );
  }

  double? _toDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  RiderType _mapRiderType(String? raw) {
    switch (raw) {
      case 'weekly':
        return RiderType.weekly;
      case 'monthly':
        return RiderType.monthly;
      default:
        return RiderType.perTrip;
    }
  }

  RiderAvailability _mapAvailability(String raw) {
    switch (raw) {
      case 'online':
        return RiderAvailability.online;
      case 'busy':
        return RiderAvailability.busy;
      default:
        return RiderAvailability.offline;
    }
  }

  RiderDeliveryStatus _mapDeliveryStatus(String raw) {
    switch (raw) {
      case 'assigned':
        return RiderDeliveryStatus.pending;
      case 'accepted':
        return RiderDeliveryStatus.accepted;
      case 'going_to_pickup':
        return RiderDeliveryStatus.goingToPickup;
      case 'arrived_at_pickup':
        return RiderDeliveryStatus.arrivedAtPickup;
      case 'picked_up':
        return RiderDeliveryStatus.pickedUp;
      case 'out_for_delivery':
        return RiderDeliveryStatus.outForDelivery;
      case 'arrived_at_destination':
        return RiderDeliveryStatus.arrivedAtDestination;
      case 'qr_pending':
        return RiderDeliveryStatus.qrVerificationPending;
      case 'delivered':
        return RiderDeliveryStatus.delivered;
      case 'rejected':
        return RiderDeliveryStatus.rejected;
      case 'cancelled':
        return RiderDeliveryStatus.cancelled;
      case 'failed':
        return RiderDeliveryStatus.failed;
      default:
        return RiderDeliveryStatus.pending;
    }
  }

  DeliveryStep? _mapActiveStep(String raw) {
    switch (raw) {
      case 'accepted':
      case 'going_to_pickup':
        return DeliveryStep.goToPickup;
      case 'arrived_at_pickup':
      case 'picked_up':
        return DeliveryStep.atPickup;
      case 'out_for_delivery':
        return DeliveryStep.delivering;
      case 'arrived_at_destination':
      case 'qr_pending':
        return DeliveryStep.atDestination;
      default:
        return null;
    }
  }
}
