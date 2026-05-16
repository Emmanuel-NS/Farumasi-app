import '../api_client.dart';

class OrderRepository {
  final _client = FarumasiApiClient.instance;

  Future<List<ApiOrder>> getMyOrders() async {
    final response = await _client.dio.get('/orders');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => ApiOrder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ApiOrder> getOrder(String id) async {
    final response = await _client.dio.get('/orders/$id');
    return ApiOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ApiOrder> createOrder({
    String? prescriptionId,
    String? pharmacyId,
    List<Map<String, dynamic>>? items,
    String? deliveryAddress,
    double? deliveryLatitude,
    double? deliveryLongitude,
  }) async {
    final response = await _client.dio.post('/orders', data: {
      if (prescriptionId != null) 'prescriptionId': prescriptionId,
      if (pharmacyId != null) 'pharmacyId': pharmacyId,
      if (items != null) 'items': items,
      if (deliveryAddress != null) 'deliveryAddress': deliveryAddress,
      if (deliveryLatitude != null) 'deliveryLatitude': deliveryLatitude,
      if (deliveryLongitude != null) 'deliveryLongitude': deliveryLongitude,
    });
    return ApiOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ApiOrder> updateStatus(
    String orderId,
    String status, {
    double? pharmacyPrice,
    double? deliveryFee,
    String? paymentId,
    String? riderId,
  }) async {
    final response = await _client.dio.patch('/orders/$orderId/status', data: {
      'status': status,
      if (pharmacyPrice != null) 'pharmacyPrice': pharmacyPrice,
      if (deliveryFee != null) 'deliveryFee': deliveryFee,
      if (paymentId != null) 'paymentId': paymentId,
      if (riderId != null) 'riderId': riderId,
    });
    return ApiOrder.fromJson(response.data as Map<String, dynamic>);
  }
}

class ApiOrder {
  final String id;
  final String status;
  final double pharmacyPrice;
  final double deliveryFee;
  final double totalPrice;
  final String? paymentId;
  final String? pharmacyName;
  final String? deliveryAddress;
  final DateTime createdAt;
  final List<ApiOrderItem> items;

  const ApiOrder({
    required this.id,
    required this.status,
    required this.pharmacyPrice,
    required this.deliveryFee,
    required this.totalPrice,
    this.paymentId,
    this.pharmacyName,
    this.deliveryAddress,
    required this.createdAt,
    required this.items,
  });

  factory ApiOrder.fromJson(Map<String, dynamic> json) {
    return ApiOrder(
      id: json['id'] as String,
      status: json['status'] as String,
      pharmacyPrice: (json['pharmacyPrice'] as num).toDouble(),
      deliveryFee: (json['deliveryFee'] as num).toDouble(),
      totalPrice: (json['totalPrice'] as num).toDouble(),
      paymentId: json['paymentId'] as String?,
      pharmacyName: (json['pharmacy'] as Map<String, dynamic>?)?['name'] as String?,
      deliveryAddress: json['deliveryAddress'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => ApiOrderItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  bool get isActive => ![
    'DELIVERED',
    'CANCELLED',
  ].contains(status);

  String get statusLabel {
    switch (status) {
      case 'PENDING_REVIEW': return 'Pending Review';
      case 'FINDING_PHARMACY': return 'Finding Pharmacy';
      case 'PHARMACY_ACCEPTED': return 'Pharmacy Accepted';
      case 'PAYMENT_PENDING': return 'Payment Pending';
      case 'READY_FOR_PICKUP': return 'Ready for Pickup';
      case 'RIDER_ASSIGNED': return 'Rider Assigned';
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }
}

class ApiOrderItem {
  final String id;
  final String medicineName;
  final int quantity;
  final double unitPrice;

  const ApiOrderItem({
    required this.id,
    required this.medicineName,
    required this.quantity,
    required this.unitPrice,
  });

  factory ApiOrderItem.fromJson(Map<String, dynamic> json) {
    return ApiOrderItem(
      id: json['id'] as String,
      medicineName: json['medicineName'] as String,
      quantity: json['quantity'] as int,
      unitPrice: (json['unitPrice'] as num).toDouble(),
    );
  }
}
