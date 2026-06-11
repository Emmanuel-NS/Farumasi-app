import 'models.dart';

/// Serialize domain models for offline cache (no dummy data).
class CacheSerializers {
  static Map<String, dynamic> pharmacyToJson(Pharmacy p) => {
        'id': p.id,
        'name': p.name,
        'locationName': p.locationName,
        'coordinates': p.coordinates,
        'supportedInsurances': p.supportedInsurances,
        'isOpen': p.isOpen,
        'imageUrl': p.imageUrl,
        'province': p.province,
        'district': p.district,
        'sector': p.sector,
        'cell': p.cell,
        'sellerKind': p.sellerKind,
      };

  static Pharmacy pharmacyFromJson(Map<String, dynamic> m) => Pharmacy(
        id: m['id'] as String,
        name: (m['name'] as String?) ?? 'Pharmacy',
        locationName: (m['locationName'] as String?) ?? '',
        coordinates: (m['coordinates'] as List?)
                ?.map((e) => (e as num).toDouble())
                .toList() ??
            const [-1.9441, 30.0619],
        supportedInsurances: (m['supportedInsurances'] as List?)
                ?.map((e) => e.toString())
                .toList() ??
            const [],
        isOpen: m['isOpen'] as bool? ?? true,
        imageUrl: (m['imageUrl'] as String?) ?? '',
        province: (m['province'] as String?) ?? 'Kigali',
        district: (m['district'] as String?) ?? 'Kigali',
        sector: (m['sector'] as String?) ?? '',
        cell: (m['cell'] as String?) ?? '',
        sellerKind: (m['sellerKind'] as String?) ?? 'pharmacy',
      );

  static Map<String, dynamic> sponsoredToJson(SponsoredArticle a) => {
        'id': a.id,
        'title': a.title,
        'summary': a.summary,
        'imageUrl': a.imageUrl,
      };

  static SponsoredArticle sponsoredFromJson(Map<String, dynamic> m) =>
      SponsoredArticle(
        id: m['id'] as String,
        title: (m['title'] as String?) ?? 'Sponsored',
        summary: (m['summary'] as String?) ?? '',
        imageUrl: (m['imageUrl'] as String?) ?? '',
      );
}
