import 'dart:convert';

import 'package:dio/dio.dart';
import '../api_client.dart';
import '../../models/models.dart';
import '../../models/product_category.dart';

/// Patient-facing API — mirrors farumasi_patient_portal services.
class PatientRepository {
  PatientRepository._();
  static final PatientRepository instance = PatientRepository._();

  final _client = FarumasiApiClient.instance;

  static String get apiOrigin =>
      FarumasiApiClient.baseUrl.replaceAll(RegExp(r'/api/v\d+/?$'), '');

  static String resolveMediaUrl(String? url) {
    if (url == null || url.trim().isEmpty) return '';
    final trimmed = url.trim();
    if (RegExp(r'^(https?:|data:|blob:)', caseSensitive: false).hasMatch(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) return '$apiOrigin$trimmed';
    return '$apiOrigin/$trimmed';
  }

  static String _optionalMediaUrl(String? url) {
    if (url == null || url.trim().isEmpty) return '';
    return resolveMediaUrl(url);
  }

  static String _productImageUrl(Map<String, dynamic> json) {
    for (final key in ['image_url', 'thumbnail_url', 'cover_image_url']) {
      final raw = json[key] as String?;
      if (raw != null && raw.trim().isNotEmpty) {
        return resolveMediaUrl(raw);
      }
    }
    return '';
  }

  Future<Medicine> fetchProductById(String id) async {
    final response = await _client.dio.get('/products/$id');
    return _adaptProduct(response.data as Map<String, dynamic>);
  }

  Future<List<Medicine>> fetchProducts({
    String? search,
    String? category,
    int limit = 100,
  }) async {
    final queryParams = <String, dynamic>{
      'only_with_listings': true,
      'limit': limit,
      'offset': 0,
    };
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (category != null && category.isNotEmpty && category != 'All') {
      queryParams['category'] = category;
    }

    final response = await _client.dio.get(
      '/products/',
      queryParameters: queryParams,
    );
    final data = response.data;
    final List<dynamic> items;
    if (data is Map && data['items'] is List) {
      items = data['items'] as List;
    } else if (data is List) {
      items = data;
    } else {
      return [];
    }
    return items
        .map((e) => _adaptProduct(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<ProductCategory>> fetchCategoryDefinitions() async {
    final response = await _client.dio.get('/products/categories/');
    final data = response.data;
    if (data is! List) return [];
    return data
        .whereType<Map>()
        .map((e) => ProductCategory.fromJson(Map<String, dynamic>.from(e)))
        .where((c) => c.name.isNotEmpty)
        .toList();
  }

  /// @deprecated Use [fetchCategoryDefinitions]
  Future<List<String>> fetchCategories() async {
    final defs = await fetchCategoryDefinitions();
    return defs.map((c) => c.name).toList();
  }

  Future<List<BackendListing>> fetchListings({
    required String productId,
    int limit = 20,
  }) async {
    final response = await _client.dio.get(
      '/listings/',
      queryParameters: {
        'product_id': productId,
        'limit': limit,
        'offset': 0,
      },
    );
    final data = response.data;
    final List<dynamic> items;
    if (data is Map && data['items'] is List) {
      items = data['items'] as List;
    } else if (data is List) {
      items = data;
    } else {
      return [];
    }
    return items
        .map((e) => BackendListing.fromJson(e as Map<String, dynamic>))
        .where((l) {
          final status = (l.availabilityStatus).toLowerCase();
          return status == 'available' || status == 'low_stock';
        })
        .toList();
  }

  Future<PaginatedPatientOrders> fetchMyOrders({
    int offset = 0,
    int limit = 20,
  }) async {
    final response = await _client.dio.get(
      '/patients/me/orders',
      queryParameters: {'offset': offset, 'limit': limit},
    );
    final map = response.data as Map<String, dynamic>;
    final items = (map['items'] as List? ?? [])
        .map((e) => PatientOrder.fromJson(e as Map<String, dynamic>))
        .toList();
    return PaginatedPatientOrders(
      items: items,
      total: (map['total'] as num?)?.toInt() ?? items.length,
    );
  }

  Future<PatientOrder> fetchOrder(String id) async {
    final response = await _client.dio.get('/orders/$id');
    return PatientOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PatientOrder> createOrder(Map<String, dynamic> payload) async {
    final response = await _client.dio.post(
      '/patients/me/orders',
      data: payload,
    );
    return PatientOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PatientOrder> cancelOrder(String id) async {
    final response = await _client.dio.patch(
      '/orders/$id/status',
      data: {'order_status': 'cancelled'},
    );
    return PatientOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaymentInitiateResult> initiateMomo(String orderId, String phone) async {
    final response = await _client.dio.post(
      '/patients/me/orders/$orderId/payments/momo/initiate',
      data: {'phone': phone},
    );
    return PaymentInitiateResult.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  Future<PaymentStatusResult> paymentStatus(String orderId) async {
    final response = await _client.dio.get(
      '/patients/me/orders/$orderId/payments/status',
    );
    return PaymentStatusResult.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  Future<PaymentStatusResult> waitUntilPaid(String orderId) async {
    for (var i = 0; i < 48; i++) {
      final status = await paymentStatus(orderId);
      if (status.paymentStatus == 'paid') return status;
      if (status.paymentStatus == 'failed') {
        throw Exception(status.message ?? 'Payment failed');
      }
      await Future.delayed(const Duration(milliseconds: 2500));
    }
    throw Exception('Payment timed out. Check your phone or try again.');
  }

  /// Pick a pharmacy that can fulfil all cart lines via active listings.
  Future<OrderBuildResult> buildOrderPayload({
    required List<CartItem> cartItems,
    required String deliveryMethod,
    required String deliveryAddress,
    double? deliveryLatitude,
    double? deliveryLongitude,
    required String patientAccessCode,
    bool deferDeliveryFee = false,
    String? pharmacyId,
    String? partnerCompanyId,
  }) async {
    final lineListings = <String, BackendListing>{};
    var sellerPharmacyId = pharmacyId;
    var sellerPartnerId = partnerCompanyId;

    for (final item in cartItems) {
      final listings = await fetchListings(productId: item.medicine.id);
      if (listings.isEmpty) {
        throw Exception('No listing found for ${item.medicine.name}');
      }

      BackendListing chosen;
      if (sellerPharmacyId != null) {
        chosen = listings.firstWhere(
          (l) => l.pharmacyId == sellerPharmacyId,
          orElse: () => throw Exception(
            '${item.medicine.name} is not available at the selected pharmacy',
          ),
        );
      } else if (sellerPartnerId != null) {
        chosen = listings.firstWhere(
          (l) => l.partnerCompanyId == sellerPartnerId,
          orElse: () => throw Exception(
            '${item.medicine.name} is not available at the selected seller',
          ),
        );
      } else {
        chosen = listings.first;
        sellerPharmacyId = chosen.pharmacyId;
        sellerPartnerId = chosen.partnerCompanyId;
      }

      lineListings[item.medicine.id] = chosen;
      sellerPharmacyId ??= chosen.pharmacyId;
      sellerPartnerId ??= chosen.partnerCompanyId;
    }

    final items = cartItems.map((item) {
      final listing = lineListings[item.medicine.id]!;
      return {
        'product_listing_id': listing.id,
        'quantity': item.quantity,
        'sell_mode': item.sellMode.name,
      };
    }).toList();

    final payload = <String, dynamic>{
      'delivery_method': deliveryMethod,
      'delivery_address': deliveryAddress,
      'patient_access_code': patientAccessCode,
      'defer_delivery_fee': deferDeliveryFee,
      'items': items,
    };
    if (sellerPharmacyId != null) payload['pharmacy_id'] = sellerPharmacyId;
    if (sellerPartnerId != null) {
      payload['partner_company_id'] = sellerPartnerId;
    }
    if (deliveryLatitude != null) {
      payload['delivery_latitude'] = deliveryLatitude;
    }
    if (deliveryLongitude != null) {
      payload['delivery_longitude'] = deliveryLongitude;
    }
    return OrderBuildResult(payload: payload);
  }

  Future<List<PatientPrescription>> fetchMyPrescriptions() async {
    final response = await _client.dio.get('/patients/me/prescriptions');
    final data = response.data;
    final List<dynamic> items;
    if (data is Map && data['items'] is List) {
      items = data['items'] as List;
    } else if (data is List) {
      items = data;
    } else {
      return [];
    }
    return items
        .map((e) => PatientPrescription.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PatientPrescription> uploadPrescriptionFile(String filePath) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });
    final upload = await _client.dio.post('/uploads/prescription', data: form);
    final url = (upload.data as Map<String, dynamic>)['url'] as String?;
    final response = await _client.dio.post(
      '/patients/me/prescriptions/upload',
      data: {'uploaded_file_url': url},
    );
    return PatientPrescription.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> cancelPrescription(String id) async {
    await _client.dio.patch('/prescriptions/$id', data: {'status': 'cancelled'});
  }

  Future<List<PatientArticle>> fetchArticles({
    String? category,
    List<String>? categories,
    String? articleType,
    String? sortBy,
    bool savedOnly = false,
    int limit = 100,
  }) async {
    if (savedOnly) {
      return fetchSavedArticles(limit: limit);
    }
    final queryParams = <String, dynamic>{'limit': limit, 'offset': 0};
    if (category != null && category.isNotEmpty) {
      queryParams['category'] = category;
    }
    if (categories != null && categories.isNotEmpty) {
      queryParams['categories'] = categories;
    }
    if (articleType != null && articleType.isNotEmpty && articleType != 'all') {
      queryParams['article_type'] = articleType;
    }
    if (sortBy != null && sortBy.isNotEmpty) {
      queryParams['sort_by'] = sortBy;
    }
    final response = await _client.dio.get('/articles/', queryParameters: queryParams);
    final data = response.data;
    final List<dynamic> items;
    if (data is Map && data['items'] is List) {
      items = data['items'] as List;
    } else if (data is List) {
      items = data;
    } else {
      return [];
    }
    return items
        .map((e) => PatientArticle.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PatientArticle?> fetchArticleById(String id) async {
    try {
      final response = await _client.dio.get('/articles/$id');
      return PatientArticle.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<PatientArticle?> fetchArticleBySlug(String slug) async {
    try {
      final response = await _client.dio.get('/articles/slug/${Uri.encodeComponent(slug)}');
      return PatientArticle.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<PatientArticle?> fetchArticleByIdOrSlug(String idOrSlug) async {
    final bySlug = await fetchArticleBySlug(idOrSlug);
    if (bySlug != null) return bySlug;
    return fetchArticleById(idOrSlug);
  }

  Future<PatientArticle> likeArticle(String id) async {
    final response = await _client.dio.post('/articles/$id/like');
    return PatientArticle.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PatientArticle> unlikeArticle(String id) async {
    final response = await _client.dio.delete('/articles/$id/like');
    return PatientArticle.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PatientArticle> saveArticle(String id) async {
    final response = await _client.dio.post('/articles/$id/save');
    return PatientArticle.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PatientArticle> unsaveArticle(String id) async {
    final response = await _client.dio.delete('/articles/$id/save');
    return PatientArticle.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PatientArticle> shareArticle(String id) async {
    final response = await _client.dio.post('/articles/$id/share');
    return PatientArticle.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PatientArticle> trackArticleView(String id) async {
    final response = await _client.dio.post('/articles/$id/view');
    return PatientArticle.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<PatientArticleComment>> fetchArticleComments(String id) async {
    try {
      final response = await _client.dio.get('/articles/$id/comments');
      final data = response.data;
      if (data is! List) return [];
      return data
          .map((e) => PatientArticleComment.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<PatientArticleComment> addArticleComment(
    String id,
    String content, {
    String? parentId,
  }) async {
    final response = await _client.dio.post(
      '/articles/$id/comments',
      data: {
        'content': content,
        if (parentId != null) 'parent_id': parentId,
      },
    );
    return PatientArticleComment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<PatientArticle>> fetchSavedArticles({int limit = 50}) async {
    try {
      final response = await _client.dio.get(
        '/articles/me/saved',
        queryParameters: {'limit': limit, 'offset': 0},
      );
      final data = response.data;
      final List<dynamic> items;
      if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      } else if (data is List) {
        items = data;
      } else {
        return [];
      }
      return items
          .map((e) => PatientArticle.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<BackendListing>> fetchListingsForSeller(
    String sellerId, {
    String kind = 'pharmacy',
    int limit = 100,
  }) async {
    final params = kind == 'partner'
        ? {'partner_company_id': sellerId, 'limit': limit, 'offset': 0}
        : {'pharmacy_id': sellerId, 'limit': limit, 'offset': 0};
    final response = await _client.dio.get('/listings/', queryParameters: params);
    final data = response.data;
    final List<dynamic> items;
    if (data is Map && data['items'] is List) {
      items = data['items'] as List;
    } else if (data is List) {
      items = data;
    } else {
      return [];
    }
    return items
        .map((e) => BackendListing.fromJson(e as Map<String, dynamic>))
        .where((l) {
          final status = l.availabilityStatus.toLowerCase();
          return status == 'available' || status == 'low_stock';
        })
        .toList();
  }

  Future<List<PatientNotification>> fetchNotifications({
    bool unreadOnly = false,
    int limit = 50,
  }) async {
    final response = await _client.dio.get(
      '/notifications/',
      queryParameters: {
        'unread_only': unreadOnly ? true : null,
        'limit': limit,
        'offset': 0,
      },
    );
    final data = response.data;
    final List<dynamic> items;
    if (data is Map && data['items'] is List) {
      items = data['items'] as List;
    } else if (data is List) {
      items = data;
    } else {
      return [];
    }
    return items
        .map((e) => PatientNotification.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<int> fetchUnreadNotificationCount() async {
    try {
      final response = await _client.dio.get('/notifications/unread-count');
      final data = response.data as Map<String, dynamic>;
      return (data['unread'] as num?)?.toInt() ?? 0;
    } catch (_) {
      return 0;
    }
  }

  Future<void> markNotificationRead(String id) async {
    await _client.dio.patch('/notifications/$id/read');
  }

  Future<void> markAllNotificationsRead() async {
    await _client.dio.patch('/notifications/read-all');
  }

  Future<PatientDelivery?> fetchDeliveryForOrder(String orderId) async {
    try {
      final response = await _client.dio.get('/orders/$orderId/delivery');
      final data = response.data;
      if (data == null) return null;
      return PatientDelivery.fromJson(data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<PatientDeliveryQr?> fetchDeliveryQr(String orderId) async {
    try {
      final response = await _client.dio.get('/patients/me/orders/$orderId/delivery-qr');
      return PatientDeliveryQr.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<List<PharmacyRecommendation>> fetchPrescriptionRecommendations(
    String prescriptionId,
  ) async {
    try {
      final response = await _client.dio.get(
        '/patients/me/prescriptions/$prescriptionId/recommendations',
      );
      final data = response.data;
      List<dynamic> raw;
      if (data is List) {
        raw = data;
      } else if (data is Map && data['top_recommendations'] is List) {
        raw = data['top_recommendations'] as List;
      } else {
        return [];
      }
      return raw
          .map((e) => PharmacyRecommendation.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<String> confirmOrderViaRecommendation({
    required String prescriptionId,
    required String recommendationId,
    String deliveryMethod = 'delivery',
    String? deliveryAddress,
    String? notes,
  }) async {
    final response = await _client.dio.post('/orders/', data: {
      'prescription_id': prescriptionId,
      'selected_recommendation_id': recommendationId,
      'delivery_method': deliveryMethod,
      if (deliveryAddress != null) 'delivery_address': deliveryAddress,
      if (notes != null) 'notes': notes,
    });
    return (response.data as Map<String, dynamic>)['id'] as String;
  }

  Future<void> markConsultMessagesRead(String consultationId) async {
    try {
      await _client.dio.patch('/consultations/$consultationId/messages/read');
    } catch (_) {}
  }

  Future<NotificationPreferences> fetchNotificationPreferences() async {
    final response = await _client.dio.get('/users/me/notification-preferences');
    return NotificationPreferences.fromJson(response.data as Map<String, dynamic>);
  }

  Future<NotificationPreferences> updateNotificationPreferences(
    NotificationPreferences prefs,
  ) async {
    final response = await _client.dio.put(
      '/users/me/notification-preferences',
      data: prefs.toJson(),
    );
    return NotificationPreferences.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<SponsoredArticle>> fetchSponsoredArticles({int limit = 10}) async {
    try {
      final response = await _client.dio.get(
        '/articles/feed/sponsored',
        queryParameters: {'limit': limit},
      );
      final data = response.data;
      final List<dynamic> raw = data is List ? data : (data is Map ? data['items'] as List? ?? [] : []);
      return raw.map(_adaptSponsored).toList();
    } catch (_) {
      final response = await _client.dio.get(
        '/articles/',
        queryParameters: {'sponsored_only': true, 'limit': limit},
      );
      final data = response.data;
      final List<dynamic> items;
      if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      } else if (data is List) {
        items = data;
      } else {
        return [];
      }
      return items.map(_adaptSponsored).toList();
    }
  }

  SponsoredArticle _adaptSponsored(dynamic e) {
    final m = e as Map<String, dynamic>;
    return SponsoredArticle(
      id: m['id'] as String,
      title: (m['title'] as String?) ?? 'Sponsored',
      summary: (m['summary'] as String?) ?? (m['excerpt'] as String?) ?? '',
      imageUrl: resolveMediaUrl(
        m['cover_image_url'] as String? ?? m['image_url'] as String?,
      ),
    );
  }

  Future<List<PatientPharmacist>> fetchPharmacists({int limit = 50}) async {
    final response = await _client.dio.get(
      '/pharmacists/',
      queryParameters: {'limit': limit, 'offset': 0},
    );
    final data = response.data;
    final List<dynamic> items;
    if (data is Map && data['items'] is List) {
      items = data['items'] as List;
    } else if (data is List) {
      items = data;
    } else {
      return [];
    }
    return items
        .map((e) => PatientPharmacist.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PatientConsultation> fetchConsultation(
    String id, {
    String? myUserId,
  }) async {
    final response = await _client.dio.get('/consultations/$id');
    return PatientConsultation.fromJson(
      response.data as Map<String, dynamic>,
      myUserId: myUserId,
    );
  }

  Future<List<PatientConsultation>> fetchConsultations({
    String? myUserId,
  }) async {
    final response = await _client.dio.get('/consultations/', queryParameters: {'limit': 50});
    final data = response.data;
    final List<dynamic> items;
    if (data is Map && data['items'] is List) {
      items = data['items'] as List;
    } else if (data is List) {
      items = data;
    } else {
      return [];
    }
    return items
        .map((e) => PatientConsultation.fromJson(
              e as Map<String, dynamic>,
              myUserId: myUserId,
            ))
        .toList();
  }

  Future<PatientConsultation> createConsultation({
    required String pharmacistId,
    bool isAnonymous = false,
  }) async {
    final response = await _client.dio.post('/consultations/', data: {
      'pharmacist_id': pharmacistId,
      'is_anonymous': isAnonymous,
    });
    return PatientConsultation.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> sendConsultMessage(
    String consultId,
    String content, {
    String? attachmentUrl,
    String? attachmentName,
    String? attachmentType,
    int? attachmentSize,
  }) async {
    await _client.dio.post('/consultations/$consultId/messages', data: {
      'content': content,
      if (attachmentUrl != null) 'attachment_url': attachmentUrl,
      if (attachmentName != null) 'attachment_name': attachmentName,
      if (attachmentType != null) 'attachment_type': attachmentType,
      if (attachmentSize != null) 'attachment_size': attachmentSize,
    });
  }

  Future<String> uploadConsultImage(String filePath) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });
    return _uploadConsultFile(form, '/uploads/image');
  }

  Future<String> uploadConsultImageBytes(List<int> bytes, String filename) async {
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(bytes, filename: filename),
    });
    return _uploadConsultFile(form, '/uploads/image');
  }

  Future<String> uploadConsultDocument(String filePath) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });
    return _uploadConsultFile(form, '/uploads/document');
  }

  Future<String> uploadConsultDocumentBytes(List<int> bytes, String filename) async {
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(bytes, filename: filename),
    });
    return _uploadConsultFile(form, '/uploads/document');
  }

  Future<String> _uploadConsultFile(FormData form, String endpoint) async {
    const maxBytes = 8 * 1024 * 1024;
    final file = form.files.firstWhere((e) => e.key == 'file');
    final size = file.value.length;
    if (size > maxBytes) {
      throw Exception('File too large (max 8 MB)');
    }
    final upload = await _client.dio.post(
      endpoint,
      data: form,
      options: Options(contentType: 'multipart/form-data'),
    );
    final url = (upload.data as Map<String, dynamic>)['url'] as String?;
    if (url == null || url.isEmpty) throw Exception('Upload returned no URL');
    return resolveMediaUrl(url);
  }

  Future<List<Pharmacy>> fetchPharmacies({
    int limit = 100,
    int offset = 0,
    bool openOnly = true,
  }) async {
    final response = await _client.dio.get(
      '/pharmacies/',
      queryParameters: {
        'limit': limit.clamp(1, 100),
        'offset': offset,
        'open_only': openOnly,
      },
    );
    final data = response.data;
    final List<dynamic> items;
    if (data is Map && data['items'] is List) {
      items = data['items'] as List;
    } else if (data is List) {
      items = data;
    } else {
      return [];
    }
    return items.map((e) => _pharmacyFromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<StorePartner>> fetchPublicPartners({int limit = 100}) async {
    try {
      final response = await _client.dio.get(
        '/partners/public/',
        queryParameters: {'limit': limit, 'offset': 0},
      );
      final data = response.data;
      final List<dynamic> items;
      if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      } else if (data is List) {
        items = data;
      } else {
        return [];
      }
      return items.map((e) {
        final m = e as Map<String, dynamic>;
        return StorePartner(
          id: m['id'] as String,
          name: (m['name'] as String?) ?? 'Partner',
          companyType: m['company_type'] as String?,
          district: m['district'] as String?,
          logoUrl: _optionalMediaUrl(m['logo_url'] as String?),
          description: (m['description'] as String?) ?? (m['address'] as String?),
          isOpen: m['is_open'] as bool? ?? true,
          latitude: (m['latitude'] as num?)?.toDouble(),
          longitude: (m['longitude'] as num?)?.toDouble(),
        );
      }).toList();
    } catch (_) {
      return [];
    }
  }

  Future<({Set<String> pharmacyIds, Set<String> partnerIds})> fetchActiveSellerIds() async {
    final pharmacyIds = <String>{};
    final partnerIds = <String>{};
    var offset = 0;
    const pageSize = 100;
    for (var page = 0; page < 3; page++) {
      final response = await _client.dio.get(
        '/listings/',
        queryParameters: {'limit': pageSize, 'offset': offset},
      );
      final data = response.data as Map<String, dynamic>? ?? {};
      final items = data['items'] as List? ?? [];
      for (final raw in items) {
        if (raw is! Map) continue;
        final m = Map<String, dynamic>.from(raw);
        final status = (m['status'] as String?) ?? '';
        final avail = (m['availability_status'] as String?) ?? '';
        if (status != 'active') continue;
        if (avail != 'available' && avail != 'low_stock') continue;
        final pharmId = m['pharmacy_id'] as String?;
        final partnerId = m['partner_company_id'] as String?;
        if (pharmId != null) pharmacyIds.add(pharmId);
        if (partnerId != null) partnerIds.add(partnerId);
      }
      final total = (data['total'] as num?)?.toInt() ?? items.length;
      if (items.length < pageSize || offset + pageSize >= total) break;
      offset += pageSize;
    }
    return (pharmacyIds: pharmacyIds, partnerIds: partnerIds);
  }

  /// Pharmacies + partner companies with active stock — mirrors portal store carousel.
  Future<StoreSellersResult> fetchStoreSellers() async {
    var hadError = false;
    List<Pharmacy> pharmacies = [];
    List<StorePartner> partners = [];
    ({Set<String> pharmacyIds, Set<String> partnerIds}) ids = (
      pharmacyIds: <String>{},
      partnerIds: <String>{},
    );

    try {
      final results = await Future.wait([
        fetchPharmacies(limit: 100, offset: 0, openOnly: true),
        fetchPublicPartners(limit: 100),
        fetchActiveSellerIds(),
      ]);
      pharmacies = results[0] as List<Pharmacy>;
      partners = results[1] as List<StorePartner>;
      ids = results[2] as ({Set<String> pharmacyIds, Set<String> partnerIds});
    } catch (_) {
      hadError = true;
    }

    if (pharmacies.isEmpty && partners.isEmpty && ids.pharmacyIds.isEmpty) {
      return StoreSellersResult(sellers: const [], hadError: hadError);
    }

    final partnerLogoByName = <String, String>{};
    for (final p in partners) {
      if (p.logoUrl.isNotEmpty) {
        partnerLogoByName[p.name.trim().toLowerCase()] = p.logoUrl;
      }
    }

    final withPharm = pharmacies
        .where((p) => p.isOpen && ids.pharmacyIds.contains(p.id))
        .map((p) {
          final partnerLogo = partnerLogoByName[p.name.trim().toLowerCase()];
          final logo = p.imageUrl.isNotEmpty
              ? p.imageUrl
              : (partnerLogo ?? p.imageUrl);
          return Pharmacy(
            id: p.id,
            name: p.name,
            locationName: p.locationName,
            coordinates: p.coordinates,
            supportedInsurances: p.supportedInsurances,
            isOpen: p.isOpen,
            imageUrl: logo,
            province: p.province,
            district: p.district,
            sector: p.sector,
            cell: p.cell,
            sellerKind: 'pharmacy',
          );
        })
        .toList();

    final pharmNames = withPharm.map((p) => p.name.trim().toLowerCase()).toSet();
    final withPartner = partners
        .where((p) => p.isOpen && ids.partnerIds.contains(p.id))
        .where((p) => (p.companyType ?? '').toLowerCase() != 'pharmacy')
        .where((p) => !pharmNames.contains(p.name.trim().toLowerCase()))
        .map(
          (p) => Pharmacy(
            id: p.id,
            name: p.name,
            locationName: p.description ?? p.district ?? 'Rwanda',
            coordinates: [
              p.latitude ?? -1.9441,
              p.longitude ?? 30.0619,
            ],
            supportedInsurances: const [],
            isOpen: p.isOpen,
            imageUrl: p.logoUrl,
            district: p.district ?? 'Rwanda',
            sellerKind: 'partner',
          ),
        )
        .toList();

    return StoreSellersResult(
      sellers: [...withPharm, ...withPartner],
      hadError: hadError && withPharm.isEmpty && withPartner.isEmpty,
    );
  }

  Pharmacy _pharmacyFromJson(Map<String, dynamic> m) {
    final lat = (m['latitude'] as num?)?.toDouble() ?? -1.95;
    final lng = (m['longitude'] as num?)?.toDouble() ?? 30.06;
    final logo = _optionalMediaUrl(m['logo_url'] as String?);
    final image = _optionalMediaUrl(m['image_url'] as String?);
    return Pharmacy(
      id: m['id'] as String,
      name: (m['name'] as String?) ?? 'Pharmacy',
      locationName: (m['address'] as String?) ?? (m['district'] as String?) ?? 'Kigali',
      coordinates: [lat, lng],
      supportedInsurances: const [],
      isOpen: m['is_open'] as bool? ?? true,
      imageUrl: image.isNotEmpty ? image : logo,
      district: (m['district'] as String?) ?? 'Kigali',
      sellerKind: 'pharmacy',
    );
  }

  Map<String, String> _parseProductDesc(String? raw) {
    if (raw == null || raw.trim().isEmpty) return {};
    try {
      final parsed = jsonDecode(raw);
      if (parsed is Map) {
        return parsed.map((k, v) => MapEntry(k.toString(), v?.toString() ?? ''));
      }
    } catch (_) {}
    return {'short': raw};
  }

  Medicine _adaptProduct(Map<String, dynamic> json) {
    final priceFrom = (json['price_from'] as num?)?.toDouble();
    final priceTo = (json['price_to'] as num?)?.toDouble();
    final displayPrice = priceFrom ?? 0;
    final name = (json['name'] as String?) ?? 'Product';
    final strength = json['strength'] as String?;
    final dosageForm = json['dosage_form'] as String?;
    final genericName = json['generic_name'] as String?;
    final desc = _parseProductDesc(json['description'] as String?);
    final shortDesc = (desc['short'] ?? '').trim().isNotEmpty
        ? desc['short']!.trim()
        : '$name${strength != null ? ' $strength' : ''} — ${dosageForm ?? 'medicine'}.';

    return Medicine(
      id: json['id'] as String,
      name: name,
      description: shortDesc,
      price: displayPrice.roundToDouble(),
      maxPrice: (priceTo ?? displayPrice).roundToDouble(),
      imageUrl: _productImageUrl(json),
      category: (json['category'] as String?) ?? 'General',
      subCategory: dosageForm,
      requiresPrescription: json['prescription_required'] as bool? ?? false,
      manufacturer: (json['manufacturer'] as String?) ?? (json['brand'] as String?) ?? '',
      packagingClass: json['packaging_class'] as String?,
      allowsPartialSelling: json['allows_partial_selling'] as bool? ?? false,
      minPartialQuantity: (json['min_partial_quantity'] as num?)?.toInt(),
      unitsPerPack: (json['units_per_pack'] as num?)?.toInt(),
      partialUnitName: json['partial_unit_name'] as String?,
      unitPriceFrom: (json['unit_price_from'] as num?)?.toDouble(),
      overviewDescription: (desc['overview'] ?? '').trim().isEmpty ? null : desc['overview']!.trim(),
      dosageSummary: (desc['dosage_summary'] ?? '').trim().isEmpty ? null : desc['dosage_summary']!.trim(),
      dosageDetails: (desc['dosage_details'] ?? '').trim().isEmpty ? null : desc['dosage_details']!.trim(),
      safetyInfo: (desc['safety'] ?? '').trim().isEmpty ? null : desc['safety']!.trim(),
      composition: genericName != null
          ? 'Active ingredient: $genericName${strength != null ? ' $strength' : ''}'
          : null,
      storage: 'Store below 25°C in a dry place away from sunlight.',
      warnings: 'Keep out of reach of children. Read the label carefully.',
      dosage: strength != null
          ? '$strength — follow prescriber instructions.'
          : 'Follow prescriber instructions.',
      sideEffects: (desc['safety'] ?? '').trim().isEmpty
          ? 'Consult your pharmacist or doctor for side-effect information.'
          : desc['safety']!.trim(),
    );
  }
}

class BackendListing {
  final String id;
  final String? pharmacyId;
  final String? partnerCompanyId;
  final String? productId;
  final double price;
  final double? unitPrice;
  final String availabilityStatus;
  final String? sellerName;
  final String? sellerImageUrl;
  final int? fulfillmentTimeMinutes;
  final DateTime? expiryDate;

  BackendListing({
    required this.id,
    this.pharmacyId,
    this.partnerCompanyId,
    this.productId,
    this.price = 0,
    this.unitPrice,
    this.availabilityStatus = 'available',
    this.sellerName,
    this.sellerImageUrl,
    this.fulfillmentTimeMinutes,
    this.expiryDate,
  });

  factory BackendListing.fromJson(Map<String, dynamic> json) {
    final pharmacy = json['pharmacy'] as Map<String, dynamic>?;
    final partner = json['partner_company'] as Map<String, dynamic>?;
    final sellerName = pharmacy?['name'] as String? ?? partner?['name'] as String?;
    final rawImage = pharmacy?['image_url'] as String? ??
        partner?['logo_url'] as String? ??
        partner?['image_url'] as String?;
    final expiryRaw = json['expiry_date'] as String?;
    return BackendListing(
      id: json['id'] as String,
      pharmacyId: json['pharmacy_id'] as String?,
      partnerCompanyId: json['partner_company_id'] as String?,
      productId: json['product_id'] as String?,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      unitPrice: (json['unit_price'] as num?)?.toDouble(),
      availabilityStatus: (json['availability_status'] as String?) ?? 'available',
      sellerName: sellerName,
      sellerImageUrl: rawImage != null && rawImage.isNotEmpty
          ? PatientRepository.resolveMediaUrl(rawImage)
          : null,
      fulfillmentTimeMinutes: (json['fulfillment_time_minutes'] as num?)?.toInt(),
      expiryDate: expiryRaw != null && expiryRaw.isNotEmpty
          ? DateTime.tryParse(expiryRaw)
          : null,
    );
  }

  String get availabilityLabel {
    switch (availabilityStatus.toLowerCase()) {
      case 'available':
        return 'In Stock';
      case 'low_stock':
        return 'Low Stock';
      default:
        return 'Out of Stock';
    }
  }
}

class PaginatedPatientOrders {
  final List<PatientOrder> items;
  final int total;

  PaginatedPatientOrders({required this.items, required this.total});
}

class PatientOrder {
  final String id;
  final String? orderCode;
  final String status;
  final String paymentStatus;
  final double totalAmount;
  final double subtotal;
  final double deliveryFee;
  final String? pharmacyName;
  final String? deliveryMethod;
  final String? deliveryAddress;
  final String? patientAccessCode;
  final String? notes;
  final DateTime createdAt;
  final List<PatientOrderItem> items;

  PatientOrder({
    required this.id,
    this.orderCode,
    required this.status,
    required this.paymentStatus,
    required this.totalAmount,
    this.subtotal = 0,
    this.deliveryFee = 0,
    this.pharmacyName,
    this.deliveryMethod,
    this.deliveryAddress,
    this.patientAccessCode,
    this.notes,
    required this.createdAt,
    required this.items,
  });

  static String mapStatus(String? raw) {
    switch ((raw ?? 'pending').toLowerCase()) {
      case 'pending':
        return 'pending_review';
      case 'accepted':
      case 'preparing':
        return 'pharmacy_accepted';
      case 'rejected':
      case 'failed':
        return 'cancelled';
      case 'ready_for_pickup':
        return 'ready_for_pickup';
      case 'out_for_delivery':
        return 'out_for_delivery';
      case 'delivered':
      case 'completed':
        return 'delivered';
      case 'cancelled':
        return 'cancelled';
      default:
        return raw ?? 'pending_review';
    }
  }

  factory PatientOrder.fromJson(Map<String, dynamic> json) {
    final pharmacy = json['pharmacy'] as Map<String, dynamic>?;
    final partner = json['partner_company'] as Map<String, dynamic>?;
    final rawStatus = json['order_status'] as String? ?? json['status'] as String?;
    return PatientOrder(
      id: json['id'] as String,
      orderCode: json['order_code'] as String?,
      status: mapStatus(rawStatus),
      paymentStatus: (json['payment_status'] as String?) ?? 'pending',
      totalAmount: ((json['total_amount'] ?? json['total_price']) as num?)
              ?.toDouble() ??
          0,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      deliveryFee: (json['delivery_fee'] as num?)?.toDouble() ?? 0,
      pharmacyName: pharmacy?['name'] as String? ?? partner?['name'] as String?,
      deliveryMethod: json['delivery_method'] as String?,
      deliveryAddress: json['delivery_address'] as String?,
      patientAccessCode: json['patient_access_code'] as String?,
      notes: json['notes'] as String?,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
      items: (json['items'] as List? ?? [])
          .map((e) => PatientOrderItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  bool get isActive {
    const terminal = {'delivered', 'completed', 'cancelled', 'rejected', 'failed'};
    return !terminal.contains(status.toLowerCase());
  }

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'pending_review':
        return 'Pending Review';
      case 'accepted':
      case 'preparing':
      case 'pharmacy_accepted':
        return 'Pharmacy Accepted';
      case 'ready_for_pickup':
        return 'Ready for Pickup';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
      case 'completed':
        return 'Delivered';
      case 'cancelled':
      case 'rejected':
      case 'failed':
        return 'Cancelled';
      default:
        return status;
    }
  }
}

class PatientOrderItem {
  final String id;
  final String? productId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final String? imageUrl;
  final String sellMode;

  PatientOrderItem({
    required this.id,
    this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    this.totalPrice = 0,
    this.imageUrl,
    this.sellMode = 'pack',
  });

  factory PatientOrderItem.fromJson(Map<String, dynamic> json) {
    return PatientOrderItem(
      id: json['id'] as String,
      productId: json['product_id'] as String?,
      productName: (json['product_name'] as String?) ?? 'Item',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0,
      totalPrice: (json['total_price'] as num?)?.toDouble() ?? 0,
      imageUrl: json['product_image_url'] as String?,
      sellMode: (json['sell_mode'] as String?) ?? 'pack',
    );
  }
}

class PaymentInitiateResult {
  final String orderId;
  final String paymentStatus;
  final double amount;
  final String message;

  PaymentInitiateResult({
    required this.orderId,
    required this.paymentStatus,
    required this.amount,
    required this.message,
  });

  factory PaymentInitiateResult.fromJson(Map<String, dynamic> json) {
    return PaymentInitiateResult(
      orderId: (json['order_id'] as String?) ?? '',
      paymentStatus: (json['payment_status'] as String?) ?? 'pending',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      message: (json['message'] as String?) ?? '',
    );
  }
}

class PaymentStatusResult {
  final String paymentStatus;
  final String? message;

  PaymentStatusResult({required this.paymentStatus, this.message});

  factory PaymentStatusResult.fromJson(Map<String, dynamic> json) {
    return PaymentStatusResult(
      paymentStatus: (json['payment_status'] as String?) ?? 'pending',
      message: json['message'] as String?,
    );
  }
}

class OrderBuildResult {
  final Map<String, dynamic> payload;
  OrderBuildResult({required this.payload});
}

class PatientPrescription {
  final String id;
  final String status;
  final String? uploadedFileUrl;
  final String? notes;
  final DateTime createdAt;
  final List<String> itemNames;

  PatientPrescription({
    required this.id,
    required this.status,
    this.uploadedFileUrl,
    this.notes,
    required this.createdAt,
    this.itemNames = const [],
  });

  factory PatientPrescription.fromJson(Map<String, dynamic> json) {
    final items = (json['items'] as List? ?? [])
        .map((e) => (e as Map<String, dynamic>)['medicine_name'] as String? ?? '')
        .where((s) => s.isNotEmpty)
        .toList();
    return PatientPrescription(
      id: json['id'] as String,
      status: (json['status'] as String?) ?? 'active',
      uploadedFileUrl: json['uploaded_file_url'] as String?,
      notes: json['notes'] as String?,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
      itemNames: items.cast<String>().toList(),
    );
  }

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'sent_to_patient':
      case 'patient_viewing':
        return 'Cart Ready';
      case 'order_placed':
        return 'Order Placed';
      case 'fulfilled':
        return 'Fulfilled';
      case 'cancelled':
        return 'Cancelled';
      case 'draft':
        return 'Draft';
      default:
        return 'Under Review';
    }
  }

  bool get isActive => !['cancelled', 'fulfilled', 'expired'].contains(status.toLowerCase());
}

class PatientArticle {
  final String id;
  final String slug;
  final String title;
  final String summary;
  final String content;
  final String? imageUrl;
  final String? videoUrl;
  final String category;
  final List<String> categories;
  final String articleType;
  final int readTimeMin;
  final DateTime? publishedAt;
  final int viewCount;
  final int likeCount;
  final int shareCount;
  final int commentCount;
  final bool isLiked;
  final bool isSaved;

  PatientArticle({
    required this.id,
    this.slug = '',
    required this.title,
    required this.summary,
    this.content = '',
    this.imageUrl,
    this.videoUrl,
    required this.category,
    this.categories = const [],
    this.articleType = 'article',
    this.readTimeMin = 3,
    this.publishedAt,
    this.viewCount = 0,
    this.likeCount = 0,
    this.shareCount = 0,
    this.commentCount = 0,
    this.isLiked = false,
    this.isSaved = false,
  });

  factory PatientArticle.fromJson(Map<String, dynamic> json) {
    final content = (json['content'] as String?) ?? '';
    final summary = (json['summary'] as String?) ??
        (json['excerpt'] as String?) ??
        '';
    final categoryRaw = (json['category'] as String?)?.trim();
    final category = (categoryRaw != null && categoryRaw.isNotEmpty)
        ? categoryRaw
        : 'General Health';
    final categoriesRaw = json['categories'];
    final categories = categoriesRaw is List
        ? categoriesRaw.map((e) => e.toString()).toList()
        : (categoryRaw != null && categoryRaw.isNotEmpty ? [category] : <String>[]);
    final wordCount = content.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
    final computedRead = wordCount > 0 ? (wordCount / 200).ceil().clamp(1, 999) : 3;

    return PatientArticle(
      id: json['id'] as String,
      slug: (json['slug'] as String?) ?? '',
      title: (json['title'] as String?) ?? 'Article',
      summary: summary,
      content: content,
      imageUrl: PatientRepository._optionalMediaUrl(
        json['cover_image_url'] as String? ?? json['image_url'] as String?,
      ),
      videoUrl: (json['video_url'] as String?)?.trim().isNotEmpty == true
          ? json['video_url'] as String
          : null,
      category: category,
      categories: categories,
      articleType: (json['article_type'] as String?) ?? 'article',
      readTimeMin: (json['read_time_min'] as num?)?.toInt() ?? computedRead,
      publishedAt: json['published_at'] != null
          ? DateTime.tryParse(json['published_at'] as String)
          : null,
      viewCount: (json['view_count'] as num?)?.toInt() ?? 0,
      likeCount: (json['like_count'] as num?)?.toInt() ?? 0,
      shareCount: (json['share_count'] as num?)?.toInt() ?? 0,
      commentCount: (json['comment_count'] as num?)?.toInt() ?? 0,
      isLiked: json['is_liked'] as bool? ?? false,
      isSaved: json['is_saved'] as bool? ?? false,
    );
  }
}

class PatientArticleComment {
  final String id;
  final String articleId;
  final String userId;
  final String? parentId;
  final String content;
  final DateTime createdAt;
  final String? userName;

  PatientArticleComment({
    required this.id,
    required this.articleId,
    required this.userId,
    this.parentId,
    required this.content,
    required this.createdAt,
    this.userName,
  });

  factory PatientArticleComment.fromJson(Map<String, dynamic> json) {
    return PatientArticleComment(
      id: json['id'] as String,
      articleId: json['article_id'] as String,
      userId: json['user_id'] as String,
      parentId: json['parent_id'] as String?,
      content: (json['content'] as String?) ?? '',
      createdAt: DateTime.tryParse((json['created_at'] as String?) ?? '') ?? DateTime.now(),
      userName: json['user_name'] as String?,
    );
  }
}

class PatientConsultMessage {
  final String id;
  final String content;
  final bool isFromPatient;
  final bool isRead;
  final DateTime createdAt;
  final String? attachmentUrl;
  final String? attachmentName;
  final String? attachmentType;

  PatientConsultMessage({
    required this.id,
    required this.content,
    required this.isFromPatient,
    this.isRead = true,
    required this.createdAt,
    this.attachmentUrl,
    this.attachmentName,
    this.attachmentType,
  });

  factory PatientConsultMessage.fromJson(
    Map<String, dynamic> json, {
    String? myUserId,
  }) {
    final senderId = json['sender_id'] as String?;
    return PatientConsultMessage(
      id: json['id'] as String,
      content: (json['content'] as String?) ?? '',
      isFromPatient: myUserId != null
          ? senderId == myUserId
          : json['sender_role'] == 'patient',
      isRead: json['is_read'] as bool? ?? true,
      createdAt: DateTime.tryParse(
            json['sent_at'] as String? ??
                json['created_at'] as String? ??
                '',
          ) ??
          DateTime.now(),
      attachmentUrl: json['attachment_url'] as String?,
      attachmentName: json['attachment_name'] as String?,
      attachmentType: json['attachment_type'] as String?,
    );
  }
}

class PatientConsultation {
  final String id;
  final String? subject;
  final String status;
  final String? pharmacistId;
  final bool isAnonymous;
  final List<PatientConsultMessage> messages;

  PatientConsultation({
    required this.id,
    this.subject,
    required this.status,
    this.pharmacistId,
    this.isAnonymous = false,
    this.messages = const [],
  });

  factory PatientConsultation.fromJson(
    Map<String, dynamic> json, {
    String? myUserId,
  }) {
    return PatientConsultation(
      id: json['id'] as String,
      subject: json['subject'] as String?,
      status: (json['status'] as String?) ?? 'open',
      pharmacistId: json['pharmacist_id'] as String?,
      isAnonymous: json['is_anonymous'] as bool? ?? false,
      messages: (json['messages'] as List? ?? [])
          .map((e) => PatientConsultMessage.fromJson(
                e as Map<String, dynamic>,
                myUserId: myUserId,
              ))
          .toList(),
    );
  }
}

class PatientPharmacist {
  final String id;
  final String name;
  final String specialty;
  final String imageUrl;
  final String status;

  PatientPharmacist({
    required this.id,
    required this.name,
    required this.specialty,
    required this.imageUrl,
    required this.status,
  });

  factory PatientPharmacist.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    final availability = (json['availability_status'] as String?) ?? 'offline';
    final lastLogin = user?['last_login_at'] as String?;
    var status = availability.toLowerCase();
    if (status != 'available' && status != 'busy') {
      status = 'offline';
    } else if (lastLogin != null) {
      final last = DateTime.tryParse(lastLogin);
      if (last == null ||
          DateTime.now().difference(last).inMinutes > 5) {
        status = 'offline';
      }
    } else {
      status = 'offline';
    }
    return PatientPharmacist(
      id: (user?['id'] as String?) ?? json['user_id'] as String? ?? json['id'] as String,
      name: (user?['full_name'] as String?) ?? 'Pharmacist',
      specialty: (json['specialization'] as String?) ?? 'General Pharmacy',
      imageUrl: PatientRepository.resolveMediaUrl(user?['profile_image_url'] as String?),
      status: status,
    );
  }
}

class StorePartner {
  final String id;
  final String name;
  final String? companyType;
  final String? district;
  final String logoUrl;
  final String? description;
  final bool isOpen;
  final double? latitude;
  final double? longitude;

  const StorePartner({
    required this.id,
    required this.name,
    this.companyType,
    this.district,
    this.logoUrl = '',
    this.description,
    this.isOpen = true,
    this.latitude,
    this.longitude,
  });
}

class StoreSellersResult {
  final List<Pharmacy> sellers;
  final bool hadError;

  const StoreSellersResult({
    required this.sellers,
    this.hadError = false,
  });
}

class PatientNotification {
  final String id;
  final String title;
  final String message;
  final String category;
  final bool isRead;
  final DateTime createdAt;
  final String? actionUrl;
  final String? orderId;

  PatientNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.category,
    required this.isRead,
    required this.createdAt,
    this.actionUrl,
    this.orderId,
  });

  static const _categoryMap = {
    'order': 'order',
    'prescription': 'health_tip',
    'delivery': 'order_shipped',
    'promo': 'promo',
    'reminder': 'reminder',
    'general': 'general',
    'system': 'general',
  };

  factory PatientNotification.fromJson(Map<String, dynamic> json) {
    final rawCat = (json['category'] as String?) ?? 'general';
    final category = _categoryMap[rawCat] ?? 'general';
    final actionUrl = json['action_url'] as String?;
    String? orderId;
    if (actionUrl != null) {
      final m = RegExp(r'/orders/([^/?#]+)').firstMatch(actionUrl);
      orderId = m?.group(1);
    }
    return PatientNotification(
      id: json['id'] as String,
      title: (json['title'] as String?) ?? 'Notification',
      message: (json['message'] as String?) ?? '',
      category: category,
      isRead: json['read_status'] as bool? ?? false,
      createdAt: DateTime.tryParse((json['created_at'] as String?) ?? '') ?? DateTime.now(),
      actionUrl: actionUrl,
      orderId: orderId,
    );
  }
}

class PatientDelivery {
  final String id;
  final String orderId;
  final String status;
  final String? destinationAddress;
  final int? elapsedSeconds;

  PatientDelivery({
    required this.id,
    required this.orderId,
    required this.status,
    this.destinationAddress,
    this.elapsedSeconds,
  });

  factory PatientDelivery.fromJson(Map<String, dynamic> json) {
    return PatientDelivery(
      id: json['id'] as String,
      orderId: json['order_id'] as String,
      status: (json['status'] as String?) ?? 'pending_assignment',
      destinationAddress: json['destination_address'] as String?,
      elapsedSeconds: (json['elapsed_seconds'] as num?)?.toInt(),
    );
  }

  double get progress {
    const weights = {
      'pending_assignment': 0.05,
      'assigned': 0.1,
      'accepted': 0.15,
      'going_to_pickup': 0.25,
      'arrived_at_pickup': 0.35,
      'picked_up': 0.45,
      'out_for_delivery': 0.6,
      'arrived_at_destination': 0.85,
      'qr_pending': 0.92,
      'delivered': 1.0,
    };
    return weights[status] ?? 0.2;
  }

  int? get etaMinutes {
    if (status == 'delivered') return 0;
    final elapsed = elapsedSeconds ?? 0;
    final remaining = ((30 * 60) - elapsed) / 60;
    return remaining.clamp(1, 999).ceil();
  }
}

class PatientDeliveryQr {
  final String qrCode;
  final String? accessCode;

  PatientDeliveryQr({required this.qrCode, this.accessCode});

  factory PatientDeliveryQr.fromJson(Map<String, dynamic> json) {
    return PatientDeliveryQr(
      qrCode: (json['qr_code'] as String?) ?? (json['qr_payload'] as String?) ?? '',
      accessCode: json['access_code'] as String?,
    );
  }
}

class PharmacyRecommendation {
  final String id;
  final String prescriptionId;
  final String? pharmacyId;
  final String? partnerCompanyId;
  final String sellerName;
  final double? estimatedTotalPrice;
  final int? availableItemsCount;
  final int? totalItemsCount;
  final bool canFulfillComplete;

  PharmacyRecommendation({
    required this.id,
    required this.prescriptionId,
    this.pharmacyId,
    this.partnerCompanyId,
    required this.sellerName,
    this.estimatedTotalPrice,
    this.availableItemsCount,
    this.totalItemsCount,
    this.canFulfillComplete = false,
  });

  factory PharmacyRecommendation.fromJson(Map<String, dynamic> json) {
    final pharmacy = json['pharmacy'] as Map<String, dynamic>?;
    final partner = json['partner'] as Map<String, dynamic>?;
    final name = pharmacy?['name'] as String? ??
        partner?['name'] as String? ??
        'Pharmacy';
    return PharmacyRecommendation(
      id: json['id'] as String,
      prescriptionId: json['prescription_id'] as String,
      pharmacyId: json['pharmacy_id'] as String?,
      partnerCompanyId: json['partner_company_id'] as String?,
      sellerName: name,
      estimatedTotalPrice: (json['estimated_total_price'] as num?)?.toDouble(),
      availableItemsCount: (json['available_items_count'] as num?)?.toInt(),
      totalItemsCount: (json['total_items_count'] as num?)?.toInt(),
      canFulfillComplete: json['can_fulfill_complete_prescription'] as bool? ?? false,
    );
  }
}

class NotificationPreferences {
  final Map<String, bool> channels;
  final Map<String, bool> events;

  NotificationPreferences({required this.channels, required this.events});

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    Map<String, bool> readMap(dynamic raw) {
      if (raw is! Map) return {};
      return raw.map((k, v) => MapEntry(k.toString(), v == true));
    }

    return NotificationPreferences(
      channels: readMap(json['channels']),
      events: readMap(json['events']),
    );
  }

  Map<String, dynamic> toJson() => {'channels': channels, 'events': events};

  static NotificationPreferences defaults() => NotificationPreferences(
        channels: {
          'push': true,
          'email': true,
          'sms': false,
          'whatsapp': false,
        },
        events: {
          'orders': true,
          'health_tips': true,
          'promotions': false,
          'app_updates': true,
          'reminders': true,
        },
      );
}
