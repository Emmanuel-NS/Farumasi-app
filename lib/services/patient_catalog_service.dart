import 'dart:async';

import 'package:flutter/foundation.dart';

import '../api/repositories/patient_repository.dart';
import '../services/app_lifecycle_service.dart';
import '../models/models.dart';
import '../models/product_category.dart';

/// Loads patient store catalogue from the API; uses locally cached real data offline.
class PatientCatalogService extends ChangeNotifier {
  PatientCatalogService._();
  static final PatientCatalogService _instance = PatientCatalogService._();
  factory PatientCatalogService() => _instance;

  List<Medicine> _medicines = const [];
  List<ProductCategory> _categoryDefinitions = [];
  bool _isLoading = false;
  String? _error;
  bool _loadedFromApi = false;
  bool _loadedFromCache = false;
  Future<void>? _refreshFuture;
  String? _lastSearch;
  String? _lastCategory;
  Timer? _debounceTimer;

  List<Medicine> get medicines => _medicines;
  List<ProductCategory> get categoryDefinitions => _sortedCategoryDefinitions;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get loadedFromApi => _loadedFromApi;
  bool get loadedFromCache => _loadedFromCache;

  List<ProductCategory> get _sortedCategoryDefinitions {
    if (_categoryDefinitions.isEmpty) {
      return _fallbackCategoriesFromMedicines();
    }
    final countMap = <String, int>{};
    for (final m in _medicines) {
      for (final cat in m.category.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty)) {
        countMap[cat] = (countMap[cat] ?? 0) + 1;
      }
    }
    final sorted = List<ProductCategory>.from(_categoryDefinitions);
    sorted.sort((a, b) => (countMap[b.name] ?? 0).compareTo(countMap[a.name] ?? 0));
    return sorted;
  }

  List<ProductCategory> _fallbackCategoriesFromMedicines() {
    if (_medicines.isEmpty) return const [];
    final names = _medicines.map((m) => m.category).toSet().toList()..sort();
    return names.map((n) => ProductCategory(id: n, name: n)).toList();
  }

  Future<void> refresh({String? search, String? category, bool immediate = false}) {
    _debounceTimer?.cancel();
    if (!immediate) {
      final completer = Completer<void>();
      _debounceTimer = Timer(const Duration(milliseconds: 400), () {
        _runRefresh(search: search, category: category).then(completer.complete).catchError(completer.completeError);
      });
      return completer.future;
    }
    return _runRefresh(search: search, category: category);
  }

  Future<void> _runRefresh({String? search, String? category}) {
    final normalizedSearch = search?.trim();
    final normalizedCategory = category?.trim();
    if (_refreshFuture != null &&
        _lastSearch == normalizedSearch &&
        _lastCategory == normalizedCategory) {
      return _refreshFuture!;
    }

    _lastSearch = normalizedSearch;
    _lastCategory = normalizedCategory;
    _isLoading = true;
    _error = null;
    notifyListeners();

    _refreshFuture = _fetchCatalog(
      search: normalizedSearch,
      category: normalizedCategory,
    ).whenComplete(() {
      _refreshFuture = null;
    });
    return _refreshFuture!;
  }

  Future<void> _fetchCatalog({String? search, String? category}) async {
    if (!AppLifecycleService.instance.isInForeground) {
      _isLoading = false;
      notifyListeners();
      return;
    }
    _loadedFromCache = false;
    try {
      final results = await Future.wait([
        PatientRepository.instance.fetchProducts(search: search, category: category),
        PatientRepository.instance.fetchCategoryDefinitions(),
      ]);
      final products = results[0] as List<Medicine>;
      final cats = results[1] as List<ProductCategory>;

      if (products.isNotEmpty) {
        _medicines = products;
        _loadedFromApi = true;
        _error = null;
      } else if (!_loadedFromApi && _medicines.isEmpty) {
        _medicines = const [];
      }

      if (cats.isNotEmpty) {
        _categoryDefinitions = cats;
      }
    } catch (e) {
      _error = e.toString();
      final cachedProducts = await PatientRepository.instance.loadCachedProducts(
        search: search,
        category: category,
      );
      final cachedCats = await PatientRepository.instance.loadCachedCategoryDefinitions();

      if (cachedProducts.isNotEmpty) {
        _medicines = cachedProducts;
        _loadedFromCache = true;
        _loadedFromApi = false;
      } else if (!_loadedFromApi) {
        _medicines = const [];
      }

      if (cachedCats.isNotEmpty) {
        _categoryDefinitions = cachedCats;
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Warm cache on app start when offline — loads last saved catalogue without network.
  Future<void> hydrateFromCache() async {
    if (_medicines.isNotEmpty) return;
    final cached = await PatientRepository.instance.loadCachedProducts();
    final cats = await PatientRepository.instance.loadCachedCategoryDefinitions();
    if (cached.isEmpty && cats.isEmpty) return;
    _medicines = cached;
    _categoryDefinitions = cats;
    _loadedFromCache = true;
    _loadedFromApi = false;
    notifyListeners();
  }
}
