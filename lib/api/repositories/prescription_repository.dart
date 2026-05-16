import '../api_client.dart';

class PrescriptionRepository {
  final _client = FarumasiApiClient.instance;

  /// Submit a prescription (image already uploaded to Supabase Storage)
  Future<ApiPrescription> submit({
    String? imageUrl,
    Map<String, dynamic>? digitalData,
    List<Map<String, dynamic>>? items,
    String? notes,
  }) async {
    final response = await _client.dio.post('/prescriptions', data: {
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (digitalData != null) 'digitalData': digitalData,
      if (items != null) 'items': items,
      if (notes != null) 'notes': notes,
    });
    return ApiPrescription.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<ApiPrescription>> getMyPrescriptions() async {
    final response = await _client.dio.get('/prescriptions/my');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => ApiPrescription.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<ApiPrescription>> getPendingQueue() async {
    final response = await _client.dio.get('/prescriptions/pending');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => ApiPrescription.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ApiPrescription> getOne(String id) async {
    final response = await _client.dio.get('/prescriptions/$id');
    return ApiPrescription.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ApiPrescription> review(
    String id, {
    required String status,
    String? notes,
  }) async {
    final response = await _client.dio.patch('/prescriptions/$id/review', data: {
      'status': status,
      if (notes != null) 'notes': notes,
    });
    return ApiPrescription.fromJson(response.data as Map<String, dynamic>);
  }
}

class ApiPrescription {
  final String id;
  final String status;
  final String? imageUrl;
  final String? notes;
  final DateTime createdAt;
  final List<ApiPrescriptionItem> items;

  const ApiPrescription({
    required this.id,
    required this.status,
    this.imageUrl,
    this.notes,
    required this.createdAt,
    required this.items,
  });

  factory ApiPrescription.fromJson(Map<String, dynamic> json) {
    return ApiPrescription(
      id: json['id'] as String,
      status: json['status'] as String,
      imageUrl: json['imageUrl'] as String?,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => ApiPrescriptionItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ApiPrescriptionItem {
  final String id;
  final String medicineName;
  final String? dosageInstructions;
  final String? quantity;

  const ApiPrescriptionItem({
    required this.id,
    required this.medicineName,
    this.dosageInstructions,
    this.quantity,
  });

  factory ApiPrescriptionItem.fromJson(Map<String, dynamic> json) {
    return ApiPrescriptionItem(
      id: json['id'] as String,
      medicineName: json['medicineName'] as String,
      dosageInstructions: json['dosageInstructions'] as String?,
      quantity: json['quantity']?.toString(),
    );
  }
}
