import '../api_client.dart';
import '../../models/models.dart' as local;

/// Fetches medicines from the real API.
/// Falls back to local dummy data when the backend is unavailable (offline mode).
class MedicineRepository {
  final _client = FarumasiApiClient.instance;

  Future<List<ApiMedicine>> search({String? q, String? category}) async {
    final response = await _client.dio.get('/medicines', queryParameters: {
      if (q != null && q.isNotEmpty) 'q': q,
      if (category != null && category != 'All') 'category': category,
    });

    final list = response.data as List<dynamic>;
    return list
        .map((e) => ApiMedicine.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ApiMedicine> findOne(String id) async {
    final response = await _client.dio.get('/medicines/$id');
    return ApiMedicine.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<String>> getCategories() async {
    final response = await _client.dio.get('/medicines/categories');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => (e as Map<String, dynamic>)['category'] as String)
        .toList();
  }
}

class ApiMedicine {
  final String id;
  final String name;
  final String? genericName;
  final String? description;
  final String category;
  final String? subCategory;
  final bool requiresPrescription;
  final String? imageUrl;
  final String? manufacturer;
  final List<String> keywords;

  const ApiMedicine({
    required this.id,
    required this.name,
    this.genericName,
    this.description,
    required this.category,
    this.subCategory,
    required this.requiresPrescription,
    this.imageUrl,
    this.manufacturer,
    this.keywords = const [],
  });

  factory ApiMedicine.fromJson(Map<String, dynamic> json) {
    return ApiMedicine(
      id: json['id'] as String,
      name: json['name'] as String,
      genericName: json['genericName'] as String?,
      description: json['description'] as String?,
      category: json['category'] as String,
      subCategory: json['subCategory'] as String?,
      requiresPrescription: json['requiresPrescription'] as bool? ?? false,
      imageUrl: json['imageUrl'] as String?,
      manufacturer: json['manufacturer'] as String?,
      keywords: (json['keywords'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  /// Convert to the existing local Medicine model for UI compatibility
  local.Medicine toLocalMedicine() {
    return local.Medicine(
      id: id,
      name: name,
      description: description ?? '',
      price: 0, // Price comes from inventory per pharmacy
      imageUrl: imageUrl ?? 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80',
      category: category,
      subCategory: subCategory,
      requiresPrescription: requiresPrescription,
      manufacturer: manufacturer ?? '',
      keywords: keywords,
    );
  }
}
