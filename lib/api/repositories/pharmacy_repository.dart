import '../api_client.dart';

class PharmacyRepository {
  final _client = FarumasiApiClient.instance;

  Future<List<ApiPharmacy>> findNearby({
    required double lat,
    required double lng,
    double radiusKm = 10,
  }) async {
    final response = await _client.dio.get('/pharmacies/nearby', queryParameters: {
      'lat': lat,
      'lng': lng,
      'radiusKm': radiusKm,
    });

    final list = response.data as List<dynamic>;
    return list
        .map((e) => ApiPharmacy.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ApiPharmacy> findOne(String id) async {
    final response = await _client.dio.get('/pharmacies/$id');
    return ApiPharmacy.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<PharmacyRecommendation>> getRecommendations({
    required List<String> medicineIds,
    required double patientLat,
    required double patientLng,
    String? insuranceProvider,
  }) async {
    final response = await _client.dio.post('/recommendations/pharmacies', data: {
      'medicineIds': medicineIds,
      'patientLat': patientLat,
      'patientLng': patientLng,
      if (insuranceProvider != null && insuranceProvider != 'NONE')
        'insuranceProvider': insuranceProvider,
    });

    final list = response.data as List<dynamic>;
    return list
        .map((e) => PharmacyRecommendation.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

class ApiPharmacy {
  final String id;
  final String name;
  final String address;
  final String city;
  final double latitude;
  final double longitude;
  final String phone;
  final List<String> insuranceAccepted;
  final double? distanceKm;

  const ApiPharmacy({
    required this.id,
    required this.name,
    required this.address,
    required this.city,
    required this.latitude,
    required this.longitude,
    required this.phone,
    required this.insuranceAccepted,
    this.distanceKm,
  });

  factory ApiPharmacy.fromJson(Map<String, dynamic> json) {
    return ApiPharmacy(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String,
      city: json['city'] as String? ?? 'Kigali',
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      phone: json['phone'] as String,
      insuranceAccepted: (json['insuranceAccepted'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
    );
  }
}

class PharmacyRecommendation {
  final String pharmacyId;
  final String pharmacyName;
  final String address;
  final double latitude;
  final double longitude;
  final double distanceKm;
  final double totalScore;
  final double availabilityScore;
  final List<String> availableMedicines;
  final List<String> missingMedicines;
  final double estimatedPrice;

  const PharmacyRecommendation({
    required this.pharmacyId,
    required this.pharmacyName,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.distanceKm,
    required this.totalScore,
    required this.availabilityScore,
    required this.availableMedicines,
    required this.missingMedicines,
    required this.estimatedPrice,
  });

  factory PharmacyRecommendation.fromJson(Map<String, dynamic> json) {
    return PharmacyRecommendation(
      pharmacyId: json['pharmacyId'] as String,
      pharmacyName: json['pharmacyName'] as String,
      address: json['address'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      distanceKm: (json['distanceKm'] as num).toDouble(),
      totalScore: (json['totalScore'] as num).toDouble(),
      availabilityScore: (json['availabilityScore'] as num).toDouble(),
      availableMedicines: (json['availableMedicines'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      missingMedicines: (json['missingMedicines'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      estimatedPrice: (json['estimatedPrice'] as num).toDouble(),
    );
  }

  /// Match percentage as a display string e.g. "80% match"
  String get matchLabel =>
      '${(availabilityScore * 100).round()}% match';

  String get distanceLabel => '${distanceKm}km away';
}
