import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/gestures.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:async'; // For Typewriter animation timer
import '../models/models.dart';
import '../widgets/medicine_item.dart';
import 'medicine_detail_screen.dart';
import '../services/state_service.dart';
import '../services/patient_catalog_service.dart';
import '../services/app_lifecycle_service.dart';
import '../services/notification_service.dart';
import '../api/repositories/patient_repository.dart';
import '../widgets/auth_helper.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:farumasi_app/screens/help_screen.dart';
import 'package:farumasi_app/screens/profile_screen.dart';
import 'package:farumasi_app/screens/settings_screen.dart';
import 'package:farumasi_app/screens/orders_screen.dart';
import 'package:farumasi_app/providers/auth_provider.dart';
import 'package:farumasi_app/widgets/gated_navigation.dart';
import 'cart_screen.dart';
import '../utils/product_cart_flow.dart';
import '../models/product_category.dart';
import '../widgets/store_category_scroller.dart';
import '../widgets/wave_header_overlay.dart';
import '../widgets/shimmer_loading.dart';
import '../widgets/app_refresh.dart';
import '../widgets/lite_network_image.dart';
import '../widgets/store_hero_background.dart';
import '../widgets/notification_badge_icon.dart';
import '../widgets/sponsored_carousel.dart';
import '../widgets/farumasi_logo.dart';
import 'prescriptions_screen.dart';

enum _StoreSort { defaultSort, nameAsc, nameDesc }

enum _PrescriptionFilter { all, otc, rx }

class _ProductTypeOption {
  final String value;
  final String label;
  const _ProductTypeOption(this.value, this.label);
}

const _productTypeOptions = [
  _ProductTypeOption('medicine', 'Medicine'),
  _ProductTypeOption('medical_device', 'Medical Device'),
  _ProductTypeOption('food_supplements', 'Food Supplements'),
  _ProductTypeOption('cosmetics', 'Cosmetics'),
];

class MedicineStoreScreen extends StatefulWidget {
  final bool embeddedInHomeShell;
  final VoidCallback? onUploadPrescription;

  const MedicineStoreScreen({
    super.key,
    this.embeddedInHomeShell = false,
    this.onUploadPrescription,
  });

  @override
  State<MedicineStoreScreen> createState() => _MedicineStoreScreenState();
}

class _MedicineStoreScreenState extends State<MedicineStoreScreen>
    with SingleTickerProviderStateMixin {
  late ScrollController _scrollController;
  late ScrollController _categoryScrollController;
  late TextEditingController _searchController; // Added controller
  bool _isScrolled = false;
  // Track scroll position to determine direction
  double _lastScrollOffset = 0.0;
  bool _showFloatingActions = true; // Default to visible

  List<Medicine> get _catalogMedicines => PatientCatalogService().medicines;
  List<Pharmacy> _pharmacies = const [];
  bool _sellersLoading = false;
  bool _sellersError = false;
  bool _sellersRequested = false;
  String? _selectedPharmacyId;
  String? _selectedPharmacyName;
  String? _selectedSellerKind;
  Map<String, double> _pharmacyListingPrices = {};
  bool _pharmacyListingsLoading = false;

  Future<void> _loadStoreSellers() async {
    setState(() {
      _sellersLoading = true;
      _sellersError = false;
    });
    try {
      final result = await PatientRepository.instance.fetchStoreSellers();
      if (!mounted) return;
      var sellers = result.sellers;
      if (sellers.isEmpty && result.hadError) {
        sellers = await PatientRepository.instance.loadCachedStoreSellers();
      }
      setState(() {
        if (sellers.isNotEmpty) _pharmacies = sellers;
        _sellersError = sellers.isEmpty;
        _sellersLoading = false;
      });
    } catch (_) {
      final cached = await PatientRepository.instance.loadCachedStoreSellers();
      if (!mounted) return;
      setState(() {
        if (cached.isNotEmpty) _pharmacies = cached;
        _sellersError = cached.isEmpty;
        _sellersLoading = false;
      });
    }
  }

  List<ProductCategory> get _backendCategories =>
      PatientCatalogService().categoryDefinitions;

  void _toggleCategory(ProductCategory cat) {
    setState(() {
      if (cat.name == 'All') {
        _selectedCategories.clear();
        return;
      }
      final norm = cat.name.toLowerCase();
      if (_selectedCategories.contains(norm)) {
        _selectedCategories.remove(norm);
      } else {
        _selectedCategories.add(norm);
      }
    });
  }

  bool _medicineMatchesCategory(Medicine m) {
    if (_selectedCategories.isEmpty) return true;
    final cats = <String>{};
    for (final c in m.allCategories) {
      for (final part in c.split(',')) {
        final t = part.trim().toLowerCase();
        if (t.isNotEmpty) cats.add(t);
      }
    }
    return cats.any(_selectedCategories.contains);
  }

  String _categoryLabel(String key) {
    for (final c in _backendCategories) {
      if (c.name.toLowerCase() == key) return c.name;
    }
    if (key.isEmpty) return key;
    return key[0].toUpperCase() + key.substring(1);
  }

  void _scrollCategoriesBy(int delta) {
    if (!_categoryScrollController.hasClients) return;
    _categoryScrollController.animateTo(
      (_categoryScrollController.offset + delta).clamp(
        0.0,
        _categoryScrollController.position.maxScrollExtent,
      ),
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOutCubic,
    );
  }

  Widget _buildCategoryRow({bool showArrows = false, double height = 96}) {
    return StoreCategoryScroller(
      categories: _backendCategories,
      selectedCategoryKeys: _selectedCategories,
      onToggle: _toggleCategory,
      scrollController: _categoryScrollController,
      showScrollArrows: showArrows,
      canScrollLeft: _canScrollLeft,
      canScrollRight: _canScrollRight,
      onScrollLeft: () => _scrollCategoriesBy(-400),
      onScrollRight: () => _scrollCategoriesBy(400),
      height: height,
    );
  }

  Future<void> _togglePharmacyFilter(Pharmacy pharmacy) async {
    if (_selectedPharmacyId == pharmacy.id) {
      setState(() {
        _selectedPharmacyId = null;
        _selectedPharmacyName = null;
        _selectedSellerKind = null;
        _pharmacyListingPrices = {};
      });
      return;
    }
    setState(() {
      _selectedPharmacyId = pharmacy.id;
      _selectedPharmacyName = pharmacy.name;
      _selectedSellerKind = pharmacy.sellerKind;
      _pharmacyListingsLoading = true;
      _pharmacyListingPrices = {};
    });
    try {
      final listings = await PatientRepository.instance.fetchListingsForSeller(
        pharmacy.id,
        kind: pharmacy.sellerKind,
      );
      if (!mounted) return;
      setState(() {
        _pharmacyListingPrices = {
          for (final l in listings)
            if (l.productId != null && l.productId!.isNotEmpty) l.productId!: l.price,
        };
        _pharmacyListingsLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _pharmacyListingsLoading = false);
    }
  }

  String? _sellerMapUrl(Pharmacy pharmacy) {
    final coords = pharmacy.coordinates;
    if (coords.length >= 2) {
      final lat = coords[0];
      final lng = coords[1];
      if (lat.abs() > 0.01 || lng.abs() > 0.01) {
        return 'https://www.google.com/maps?q=$lat,$lng';
      }
    }
    final query = '${pharmacy.name} ${pharmacy.locationName}'.trim();
    if (query.isNotEmpty) {
      return 'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}';
    }
    return null;
  }

  Widget _buildSellerCarouselCard(Pharmacy pharmacy) {
    final isSelected = _selectedPharmacyId == pharmacy.id;
    final listedCount = isSelected ? _pharmacyListingPrices.length : null;
    final mapUrl = _sellerMapUrl(pharmacy);
    return Container(
      width: 250,
      height: 106,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isSelected ? const Color(0xFF1E9E68) : const Color(0xFFE6EAEE),
          width: isSelected ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isSelected
                ? const Color(0x401E9E68)
                : const Color(0x120F172A),
            blurRadius: isSelected ? 12 : 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Stack(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => _togglePharmacyFilter(pharmacy),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(14),
                  ),
                  child: pharmacy.imageUrl.isNotEmpty
                      ? LiteNetworkImage(
                          url: pharmacy.imageUrl,
                          width: 96,
                          height: 106,
                          fit: BoxFit.cover,
                          memCacheWidth: 192,
                          error: _sellerPlaceholder(pharmacy.name),
                        )
                      : _sellerPlaceholder(pharmacy.name, width: 96),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          pharmacy.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: isSelected
                                ? const Color(0xFF1E9E68)
                                : const Color(0xFF0F172A),
                          ),
                        ),
                        if (pharmacy.district.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            pharmacy.district,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                        const SizedBox(height: 2),
                        Text(
                          pharmacy.sellerKind == 'partner'
                              ? 'Healthcare company'
                              : (pharmacy.isOpen ? 'Open now' : 'Closed'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade500,
                          ),
                        ),
                        if (isSelected) ...[
                          const SizedBox(height: 4),
                          if (_pharmacyListingsLoading)
                            const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          else
                            Text(
                              listedCount != null
                                  ? '$listedCount products listed'
                                  : 'Viewing inventory',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E9E68),
                              ),
                            ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (mapUrl != null)
            Positioned(
              top: 8,
              right: 8,
              child: Material(
                color: Colors.white.withValues(alpha: 0.92),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                elevation: 1,
                child: InkWell(
                  borderRadius: BorderRadius.circular(999),
                  onTap: () async {
                    final uri = Uri.parse(mapUrl);
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    }
                  },
                  child: const Padding(
                    padding: EdgeInsets.all(6),
                    child: Icon(
                      Icons.location_on_outlined,
                      size: 16,
                      color: Color(0xFF1E9E68),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _sellerPlaceholder(String name, {double width = 96}) {
    final initials = name.trim().isNotEmpty
        ? name.trim().split(' ').take(2).map((w) => w[0]).join().toUpperCase()
        : '?';
    return Container(
      width: width,
      color: const Color(0xFFEDFDF6),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: const TextStyle(
          fontWeight: FontWeight.bold,
          color: Color(0xFF1E9E68),
          fontSize: 18,
        ),
      ),
    );
  }

  Widget _buildCatalogStatusBanner() {
    return const SizedBox.shrink();
  }

  void _requestStoreSellers() {
    if (_sellersRequested) return;
    _sellersRequested = true;
    _loadStoreSellers();
  }

  Widget _buildSellersCarousel({EdgeInsets? padding}) {
    final pad = padding ?? const EdgeInsets.symmetric(horizontal: 16);
    if (_sellersLoading && _pharmacies.isEmpty) {
      return SizedBox(
        height: 106,
        child: Padding(
          padding: pad,
          child: const Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Loading partners…',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
            ),
          ),
        ),
      );
    }
    if (_pharmacies.isEmpty) {
      return SizedBox(
        height: 106,
        child: Padding(
          padding: pad,
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              _sellersError
                  ? 'Could not load sellers. Check your connection and try again.'
                  : 'No pharmacies or companies with stock right now.',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
            ),
          ),
        ),
      );
    }
    return SizedBox(
      height: 106,
      child: ListView.separated(
        padding: pad,
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: _pharmacies.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (context, index) =>
            _buildSellerCarouselCard(_pharmacies[index]),
      ),
    );
  }

  void _onGlobalSearchChanged() {
    if (_searchQuery != StateService().searchQuery) {
      setState(() {
        _searchQuery = StateService().searchQuery;
        _searchController.text = _searchQuery;
      });
      PatientCatalogService().refresh(search: _searchQuery);
    }
  }

  void _onCatalogChanged() {
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    StateService().onShowFilterModal = _toggleShowFilters;
    _categoryScrollController = ScrollController();
    _categoryScrollController.addListener(_updateCategoryScrollState);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _updateCategoryScrollState();
    });

    StateService().addListener(_onGlobalSearchChanged);
    PatientCatalogService().addListener(_onCatalogChanged);
    if (PatientCatalogService().medicines.isEmpty) {
      PatientCatalogService().refresh(immediate: true);
    } else if (AppLifecycleService.instance.isInForeground) {
      // Cached catalogue — refresh quietly after delay to save mobile data.
      Future.delayed(const Duration(seconds: 45), () {
        if (!mounted || !AppLifecycleService.instance.isInForeground) return;
        PatientCatalogService().refresh(
          immediate: true,
          search: _searchQuery.isEmpty ? null : _searchQuery,
        );
      });
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 1200), () {
        if (mounted && AppLifecycleService.instance.isInForeground) {
          _requestStoreSellers();
        }
      });
      Future.delayed(const Duration(seconds: 4), () {
        if (!mounted || !AppLifecycleService.instance.isInForeground) return;
        if (StateService().userCoordinates != null &&
            StateService().userCoordinates!.isNotEmpty) {
          return;
        }
        StateService().fetchRealLocation().catchError((_) {});
      });
    });
    _searchController = TextEditingController(); // Initialize
    _scrollController = ScrollController();
    _scrollController.addListener(() {
      // 1. App Bar Logic
      if (_scrollController.offset > 120 && !_isScrolled) {
        setState(() => _isScrolled = true);
      } else if (_scrollController.offset <= 120 && _isScrolled) {
        setState(() => _isScrolled = false);
      }

      // 2. Hide/Show Logic
      if ((_scrollController.offset - _lastScrollOffset).abs() > 20) {
        // Scrolling DOWN (reverse) -> SHOW
        if (_scrollController.position.userScrollDirection ==
            ScrollDirection.reverse) {
          if (!_showCategories) setState(() => _showCategories = true);
          if (!_showFloatingActions) {
            setState(() => _showFloatingActions = true);
          }
        }
        // Scrolling UP (forward) -> HIDE
        else if (_scrollController.position.userScrollDirection ==
            ScrollDirection.forward) {
          if (_showCategories) setState(() => _showCategories = false);
          if (_showFloatingActions) {
            setState(() => _showFloatingActions = false);
          }
        }
        _lastScrollOffset = _scrollController.offset;
      }
    });
  }

  @override
  void dispose() {
    StateService().onShowFilterModal = null;
    StateService().removeListener(_onGlobalSearchChanged);
    PatientCatalogService().removeListener(_onCatalogChanged);
    _categoryScrollController.removeListener(_updateCategoryScrollState);
    _categoryScrollController.dispose();
    _scrollController.dispose();
    _searchController.dispose(); // Dispose search controller
    super.dispose();
  }

  // Search & Filter State — aligned with patient portal store-filter-store
  String _searchQuery = '';
  Set<String> _selectedCategories = {};
  _StoreSort _sort = _StoreSort.defaultSort;
  _PrescriptionFilter _prescriptionFilter = _PrescriptionFilter.all;
  String _selectedProductType = 'All';
  bool _showFilters = false;
  bool _showCategories = true; // Match patient portal: visible by default
  bool _hideDesktopCategories = false; // User toggle for desktop shell
  bool _canScrollLeft = false;
  bool _canScrollRight = true;

  void _updateCategoryScrollState() {
    if (!mounted || !_categoryScrollController.hasClients) return;
    setState(() {
      _canScrollLeft = _categoryScrollController.offset > 0;
      _canScrollRight =
          _categoryScrollController.offset <
          _categoryScrollController.position.maxScrollExtent;
    });
  }

  Future<void> _refreshStore() async {
    await PatientCatalogService().refresh(
      immediate: true,
      search: _searchQuery.isEmpty ? null : _searchQuery,
    );
    _requestStoreSellers();
  }

  List<Medicine> get _filteredMedicines {
    String query = _searchQuery.toLowerCase().trim();

    // Always apply filters via _getMedicinesForQuery, even if query is empty.
    // This ensures category, price, rating filters work without text search.
    var results = _getMedicinesForQuery(query);

    // If we have results (filtered or not), return them.
    if (results.isNotEmpty) {
      return results;
    }

    // Only attempt "Did you mean?" suggestions if there was an actual text query.
    if (query.isNotEmpty && query.length > 3) {
      final bestMatch = _findBestMatch(query);
      if (bestMatch != null) {
        // Return results for the corrected term, still respecting filters if possible?
        // For now, let's just return matches for the term.
        // Ideally, we should apply filters to the corrected term too.
        return _getMedicinesForQuery(bestMatch);
      }
    }

    return [];
  }

  // Helper to determine if we are showing corrected results
  // ignore: unused_element
  bool get _isShowigCorrectedResults {
    if (_searchQuery.isEmpty) return false;
    if (_getMedicinesForQuery(_searchQuery).isNotEmpty) return false;
    // If original query has no results, but current filtered list has items,
    // it means we are showing corrected results.
    return _filteredMedicines.isNotEmpty;
  }

  // ignore: unused_element
  String? get _correctionTerm {
    if (_searchQuery.isEmpty) return null;
    return _findBestMatch(_searchQuery);
  }

  // 1b. Helper to get results for a specific string query
  List<Medicine> _getMedicinesForQuery(String queryText) {
    return _catalogMedicines.where((m) {
      // Clean the query
      final cleanQuery = queryText.toLowerCase().trim();
      List<String> queryWords = cleanQuery
          .split(' ')
          .where((w) => w.isNotEmpty)
          .toList();

      bool matches = true;

      // If query is empty, we don't filter by text at all.
      // We set matches = true so that other filters (category, price) can do their job.
      if (cleanQuery.isEmpty) {
        matches = true;
      } else {
        for (String word in queryWords) {
          if (queryWords.length > 1 &&
              word.length < 3 &&
              !_isSignificant(word)) {
            continue;
          }
          if (!_checkMedicineAgainstTerm(m, word)) {
            matches = false;
            break;
          }
        }

        // Fallback: If strict word matching failed, check if the full phrase is contained directly
        if (!matches &&
            (m.name.toLowerCase().contains(cleanQuery) ||
                m.description.toLowerCase().contains(cleanQuery) ||
                m.category.toLowerCase().contains(cleanQuery))) {
          matches = true;
        }
      }

      final matchesCategory = _medicineMatchesCategory(m);

      final matchesProductType = _selectedProductType == 'All' ||
          m.productType.toLowerCase() == _selectedProductType.toLowerCase();

      final matchesPharmacy = _selectedPharmacyId == null ||
          _pharmacyListingPrices.isEmpty ||
          _pharmacyListingPrices.containsKey(m.id);

      final matchesRx = _prescriptionFilter == _PrescriptionFilter.all ||
          (_prescriptionFilter == _PrescriptionFilter.otc &&
              !m.requiresPrescription) ||
          (_prescriptionFilter == _PrescriptionFilter.rx &&
              m.requiresPrescription);

      return matches &&
          matchesCategory &&
          matchesProductType &&
          matchesPharmacy &&
          matchesRx;
    }).toList();
  }

  String get _medicinesSectionTitle {
    if (_selectedPharmacyName != null) {
      return 'At ${_selectedPharmacyName!}';
    }
    if (_searchQuery.isNotEmpty) return 'Search Results';
    if (_selectedCategories.isNotEmpty) {
      return 'Filtered Results';
    }
    return 'Explore Medicines';
  }

  // New Helper: Find best match for "Did you mean"
  String? _findBestMatch(String typo) {
    String? bestTerm;
    int minDistance = 100;

    // 1. Collect candidate terms from known medicines
    final Set<String> candidates = {};
    for (var m in _catalogMedicines) {
      candidates.add(m.name.toLowerCase());
      // Add category as candidate
      candidates.add(m.category.toLowerCase());
    }

    // 2. Find closest
    final typoLower = typo.toLowerCase().trim();

    for (var term in candidates) {
      final dist = _levenshtein(typoLower, term);

      // Calculate threshold based on length
      // "placitamor" (10) vs "paracetamol" (11) -> dist might be 4 or 5.
      // Tolerance: ~50% of length for long words?
      final threshold = (term.length * 0.55).ceil();

      if (dist < minDistance && dist <= threshold) {
        minDistance = dist;
        bestTerm = term;
      }
    }

    return bestTerm;
  }

  bool _isSignificant(String term) {
    // Keep short medical terms or acronyms relevant
    const significantShorts = ['rx', 'flu', 'uv', 'bp', 'id'];
    return significantShorts.contains(term);
  }

  // Extracted helper to check a specific term against a medicine
  bool _checkMedicineAgainstTerm(Medicine m, String term) {
    // 1. Direct containment (Higher priority)
    if (m.name.toLowerCase().contains(term) ||
        m.description.toLowerCase().contains(term) ||
        m.category.toLowerCase().contains(term) ||
        m.keywords.any((k) => k.toLowerCase().contains(term))) {
      return true;
    }

    // 2. Fuzzy / Typo tolerance
    // TIGHTER CONTROLS:
    // - Only fuzzy match if term is > 3 chars (don't fuzzy match "flu" -> "fly")
    // - Or if term is exactly 3 chars, ONLY fuzzy match against keywords/categories, not description text blobs.

    if (term.length > 3) {
      // Allow distance 1 for length 4-5, distance 2 for longer
      int maxEdits = term.length < 6 ? 1 : 2;

      // Check Name parts (tokenized)
      final nameParts = m.name.toLowerCase().split(' ');
      for (final part in nameParts) {
        if (_levenshtein(part, term) <= maxEdits) return true;
      }

      // Check Category
      if (_levenshtein(m.category.toLowerCase(), term) <= maxEdits) return true;

      // Check Keywords
      for (final k in m.keywords) {
        if (_levenshtein(k.toLowerCase(), term) <= maxEdits) return true;
      }
    }

    return false;
  }

  // Levenshtein Distance Algorithm (unchanged)
  int _levenshtein(String s, String t) {
    if (s == t) return 0;
    if (s.isEmpty) return t.length;
    if (t.isEmpty) return s.length;

    List<int> v0 = List<int>.generate(t.length + 1, (i) => i);
    List<int> v1 = List<int>.filled(t.length + 1, 0);

    for (int i = 0; i < s.length; i++) {
      v1[0] = i + 1;
      for (int j = 0; j < t.length; j++) {
        int cost = (s.codeUnitAt(i) == t.codeUnitAt(j)) ? 0 : 1;
        v1[j + 1] = [
          v1[j] + 1,
          v0[j + 1] + 1,
          v0[j] + cost,
        ].reduce((a, b) => a < b ? a : b);
      }
      for (int j = 0; j < v0.length; j++) {
        v0[j] = v1[j];
      }
    }
    return v1[t.length];
  }

  List<Medicine> get _sortedMedicines {
    final list = List<Medicine>.from(_filteredMedicines);
    switch (_sort) {
      case _StoreSort.nameAsc:
        list.sort(
          (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
        );
        break;
      case _StoreSort.nameDesc:
        list.sort(
          (a, b) => b.name.toLowerCase().compareTo(a.name.toLowerCase()),
        );
        break;
      case _StoreSort.defaultSort:
        break;
    }
    return list;
  }

  bool get _catalogLoading =>
      PatientCatalogService().isLoading &&
      PatientCatalogService().medicines.isEmpty;

  int get _activeFilterCount {
    var count = 0;
    if (_sort != _StoreSort.defaultSort) count++;
    if (_prescriptionFilter != _PrescriptionFilter.all) count++;
    if (_selectedProductType != 'All') count++;
    if (_selectedCategories.isNotEmpty) count++;
    if (_searchQuery.trim().isNotEmpty) count++;
    return count;
  }

  void _toggleShowFilters() {
    setState(() => _showFilters = !_showFilters);
  }

  void _clearAllFilters() {
    setState(() {
      _searchQuery = '';
      _searchController.clear();
      StateService().setSearchQuery('');
      _sort = _StoreSort.defaultSort;
      _prescriptionFilter = _PrescriptionFilter.all;
      _selectedProductType = 'All';
      _selectedCategories.clear();
      _showFilters = false;
    });
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'Pain Relief':
        return Icons.healing;
      case 'Antibiotics':
        return Icons.science;
      case 'Vitamins':
        return Icons.wb_sunny;
      case 'Cold & Flu':
        return Icons.snowing;
      case 'Skincare':
        return Icons.face_retouching_natural;
      case 'Sexual Health':
        return Icons.favorite;
      case 'Mobility Aids':
        return Icons.accessible;
      case 'Mother & Baby':
        return Icons.child_friendly;
      case 'Devices':
        return Icons.monitor_heart;
      case 'First Aid':
        return Icons.medical_services;
      case 'Chronic Care':
        return Icons.medication_liquid;
      case 'Nutrition':
        return Icons.fitness_center;
      case 'Others':
        return Icons.more_horiz;
      default:
        return Icons.category;
    }
  }

  Widget _buildFilterPanel() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x080F172A),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                'Sort by:',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey.shade600,
                ),
              ),
              _buildFilterChip(
                label: 'Default',
                selected: _sort == _StoreSort.defaultSort,
                onTap: () => setState(() => _sort = _StoreSort.defaultSort),
              ),
              _buildFilterChip(
                label: 'A → Z',
                selected: _sort == _StoreSort.nameAsc,
                onTap: () => setState(() => _sort = _StoreSort.nameAsc),
              ),
              _buildFilterChip(
                label: 'Z → A',
                selected: _sort == _StoreSort.nameDesc,
                onTap: () => setState(() => _sort = _StoreSort.nameDesc),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                'Prescription',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey.shade600,
                ),
              ),
              _buildFilterChip(
                label: 'All',
                selected: _prescriptionFilter == _PrescriptionFilter.all,
                onTap: () =>
                    setState(() => _prescriptionFilter = _PrescriptionFilter.all),
              ),
              _buildFilterChip(
                label: 'OTC',
                selected: _prescriptionFilter == _PrescriptionFilter.otc,
                onTap: () =>
                    setState(() => _prescriptionFilter = _PrescriptionFilter.otc),
              ),
              _buildFilterChip(
                label: 'Rx',
                selected: _prescriptionFilter == _PrescriptionFilter.rx,
                onTap: () =>
                    setState(() => _prescriptionFilter = _PrescriptionFilter.rx),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                'Type',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey.shade600,
                ),
              ),
              _buildFilterChip(
                label: 'All',
                selected: _selectedProductType == 'All',
                onTap: () => setState(() => _selectedProductType = 'All'),
              ),
              ..._productTypeOptions.map(
                (pt) => _buildFilterChip(
                  label: pt.label,
                  selected: _selectedProductType == pt.value,
                  onTap: () => setState(() => _selectedProductType = pt.value),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF1E9E68) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? const Color(0xFF1E9E68) : const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: selected ? Colors.white : const Color(0xFFCBD5E1),
                  width: 2,
                ),
                color: selected ? Colors.white38 : Colors.transparent,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: selected ? Colors.white : const Color(0xFF475569),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterTrigger({
    Color? iconColor,
    bool compact = false,
  }) {
    final active = _showFilters || _activeFilterCount > 0;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          onPressed: _toggleShowFilters,
          tooltip: 'Filters',
          icon: Icon(
            Icons.tune,
            color: iconColor ?? const Color(0xFF1E9E68),
            size: compact ? 20 : 24,
          ),
          style: compact && active
              ? IconButton.styleFrom(
                  backgroundColor: const Color(0xFF1E9E68),
                  foregroundColor: Colors.white,
                )
              : null,
        ),
        if (_activeFilterCount > 0)
          Positioned(
            right: 4,
            top: 4,
            child: Container(
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              padding: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFBBF24),
                borderRadius: BorderRadius.circular(999),
              ),
              alignment: Alignment.center,
              child: Text(
                _activeFilterCount > 9 ? '9+' : '$_activeFilterCount',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  height: 1,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _desktopHeroIconButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.18),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.35)),
          ),
          child: Icon(icon, color: Colors.white),
        ),
      ),
    );
  }

  Widget _buildDesktopStore(BuildContext context, double screenWidth) {
    final contentWidth = (screenWidth * 0.96).clamp(1100.0, 1380.0).toDouble();
    final desktopCardWidth = ((contentWidth * 0.19).clamp(
      200.0,
      260.0,
    )).toDouble();
    final desktopCardHeight = (desktopCardWidth * 1.44).toDouble();
    final showHeroHeader = !widget.embeddedInHomeShell;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: AnimatedBuilder(
        animation: StateService(),
        builder: (context, _) {
          return Scaffold(
            backgroundColor: const Color(0xFFF6F8FB),
            body: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: contentWidth),
                child: AppRefreshScroll(
                  onRefresh: _refreshStore,
                  child: CustomScrollView(
                  controller: _scrollController,
                  physics: AppRefreshScroll.scrollPhysics(
                    const AlwaysScrollableScrollPhysics(),
                  ),
                  slivers: [
                    if (showHeroHeader)
                      SliverAppBar(
                        pinned: true,
                        expandedHeight: 210,
                        collapsedHeight: 72,
                        toolbarHeight: 72,
                        automaticallyImplyLeading: false,
                        backgroundColor: const Color(0xFF1E8E63),
                        title: Row(
                          children: [
                            FarumasiLogo(
                              size: 28,
                              color: Colors.white,
                              onDark: true,
                            ),
                            const SizedBox(width: 10),
                            const Text(
                              'FARUMASI',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        actions: [
                          _desktopHeroIconButton(
                            icon: Icons.help_outline,
                            tooltip: 'Help',
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const HelpScreen(),
                                ),
                              );
                            },
                          ),
                          const SizedBox(width: 8),
                          _desktopHeroIconButton(
                            icon: Icons.settings_outlined,
                            tooltip: 'Settings',
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (ctx) => SettingsScreen(onBack: () => Navigator.pop(ctx)),
                                ),
                              );
                            },
                          ),
                          const SizedBox(width: 8),
                          const AuthNotificationBadgeIcon(),
                          ListenableBuilder(
                            listenable: StateService(),

                            builder: (context, _) {
                              return Stack(
                                clipBehavior: Clip.none,

                                children: [
                                  _desktopHeroIconButton(
                                    icon: Icons.shopping_cart_outlined,
                                    tooltip: 'Cart',
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => const CartScreen(),
                                        ),
                                      );
                                    },
                                  ),
                                  if (StateService().cartItems.isNotEmpty)
                                    Positioned(
                                      right: -2,
                                      top: -2,
                                      child: CircleAvatar(
                                        radius: 8,
                                        backgroundColor: Colors.red,
                                        child: Text(
                                          '${StateService().cartItems.length}',
                                          style: const TextStyle(
                                            fontSize: 10,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              );
                            },
                          ),
                          const SizedBox(width: 12),
                        ],
                        flexibleSpace: FlexibleSpaceBar(
                          background: Stack(
                            fit: StackFit.expand,
                            children: [
                              const StoreHeroBackground(
                                baseColor: Color(0xFF1E8E63),
                                darkColor: Color(0xFF167B51),
                              ),
                              DecoratedBox(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                            colors: [
                              const Color(0xFF1E9E68).withValues(alpha: 0.62),
                              const Color(0xFF1E9E68).withValues(alpha: 0.38),
                              Colors.transparent,
                            ],
                                    begin: Alignment.centerLeft,
                                    end: Alignment.centerRight,
                                  ),
                                ),
                              ),
                              const Positioned(
                                left: 22,
                                bottom: 18,
                                child: Text(
                                  'Your trusted digital pharmacy partner in Rwanda',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                    shadows: [
                                      Shadow(
                                        color: Colors.black38,
                                        blurRadius: 6,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      const SliverToBoxAdapter(child: SizedBox.shrink()),
                    if (!widget.embeddedInHomeShell)
                      SliverPersistentHeader(
                        pinned: true,
                        delegate: _StickyHeaderDelegate(
                          height: 90,
                          child: Container(
                            color: const Color(0xFFF6F8FB),
                            alignment: Alignment.center,
                            child: Container(
                              margin: const EdgeInsets.fromLTRB(16, 10, 16, 10),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: const Color(0xFFE4E8EC),
                                ),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x110F172A),
                                    blurRadius: 14,
                                    offset: Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  const Expanded(
                                    child: Text(
                                      'FARUMASI Store',
                                      style: TextStyle(
                                        fontSize: 26,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: -0.2,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                  ),
                                  Flexible(
                                    flex: 8,
                                    child: ConstrainedBox(
                                      constraints: const BoxConstraints(
                                        maxWidth: 520,
                                      ),
                                      child: TextField(
                                        controller: _searchController,
                                        decoration: InputDecoration(
                                          hintText:
                                              'Search medicines, symptoms, categories...',
                                          prefixIcon: const Icon(Icons.search),
                                          suffixIcon: _buildFilterTrigger(
                                            compact: true,
                                          ),
                                          filled: true,
                                          fillColor: const Color(0xFFF3F6FA),
                                          border: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              14,
                                            ),
                                            borderSide: BorderSide.none,
                                          ),
                                        ),
                                        onChanged: (val) =>
                                            setState(() => _searchQuery = val),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    if (_showFilters)
                      SliverToBoxAdapter(child: _buildFilterPanel()),
                    SliverPersistentHeader(
                      pinned: true,
                      delegate: _StickyHeaderDelegate(
                        height: _hideDesktopCategories
                            ? 64
                            : 168,
                        child: Container(
                          color: const Color(0xFFF6F8FB),
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: _hideDesktopCategories
                                    ? MainAxisAlignment.end
                                    : MainAxisAlignment.spaceBetween,
                                children: [
                                  if (!_hideDesktopCategories)
                                    const Text(
                                      'Browse Categories',
                                      style: TextStyle(
                                        fontSize: 19,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                  Tooltip(
                                    message: _hideDesktopCategories
                                        ? 'Show Categories'
                                        : 'Hide Categories',
                                    child: Material(
                                      color: _hideDesktopCategories
                                          ? Colors.white
                                          : Colors.transparent,
                                      elevation: _hideDesktopCategories ? 2 : 0,
                                      borderRadius: BorderRadius.circular(20),
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(20),
                                        onTap: () => setState(
                                          () => _hideDesktopCategories =
                                              !_hideDesktopCategories,
                                        ),
                                        child: Padding(
                                          padding: _hideDesktopCategories
                                              ? const EdgeInsets.symmetric(
                                                  horizontal: 12.0,
                                                  vertical: 8.0,
                                                )
                                              : const EdgeInsets.all(8.0),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              if (_hideDesktopCategories)
                                                const Text(
                                                  'Categories',
                                                  style: TextStyle(
                                                    fontWeight: FontWeight.w600,
                                                    fontSize: 13,
                                                    color: Color(0xFF64748B),
                                                  ),
                                                ),
                                              Icon(
                                                _hideDesktopCategories
                                                    ? Icons.keyboard_arrow_down
                                                    : Icons.keyboard_arrow_up,
                                                color: const Color(0xFF64748B),
                                                size: _hideDesktopCategories
                                                    ? 20
                                                    : 24,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              if (!_hideDesktopCategories)
                                const SizedBox(height: 10),
                              if (!_hideDesktopCategories)
                                Expanded(
                                  child: _buildCategoryRow(showArrows: true),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    if (_searchQuery.isEmpty &&
                        _selectedCategories.isEmpty) ...[
                      const SliverToBoxAdapter(child: SponsoredCarousel()),
                      SliverToBoxAdapter(child: _buildCatalogStatusBanner()),
                      SliverToBoxAdapter(
                        child: const Padding(
                          padding: EdgeInsets.fromLTRB(16, 24, 16, 12),
                          child: Text(
                            'Pharmacies & Companies',
                            style: TextStyle(
                              fontSize: 21,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: _buildSellersCarousel(),
                      ),
                    ],
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 26, 16, 12),
                        child: Row(
                          children: [
                            Text(
                              _medicinesSectionTitle,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              '${_sortedMedicines.length} medicine${_sortedMedicines.length == 1 ? '' : 's'}',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                            ),
                            const Spacer(),
                            if (_activeFilterCount > 0)
                              TextButton.icon(
                                onPressed: _clearAllFilters,
                                icon: const Icon(Icons.close, size: 16),
                                label: const Text('Clear All'),
                              ),
                          ],
                        ),
                      ),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      sliver: _catalogLoading
                          ? SliverToBoxAdapter(
                              child: ShimmerProductGrid(
                                count: 8,
                                crossAxisCount: 4,
                              ),
                            )
                          : SliverGrid(
                        gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: desktopCardWidth,
                          mainAxisExtent: desktopCardHeight,
                          crossAxisSpacing: 14,
                          mainAxisSpacing: 14,
                        ),
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final med = _sortedMedicines[index];
                          return MedicineItem(
                            medicine: med,
                            onTap: () => handleProductCartTap(context, med),
                            onAboutTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    MedicineDetailScreen(medicine: med),
                              ),
                            ),
                          );
                        }, childCount: _sortedMedicines.length),
                      ),
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 28)),
                  ],
                ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth >= 600;
    final cappedWidth = screenWidth > 1280 ? 1280.0 : screenWidth;
    final responsiveCardWidth =
        ((cappedWidth * (isDesktop ? 0.19 : 0.46)).clamp(
          170.0,
          340.0,
        )).toDouble();
    final responsiveCardHeight = ((responsiveCardWidth * 1.52).clamp(
      292.0,
      440.0,
    )).toDouble();
    final responsiveGridSpacing = ((responsiveCardWidth * 0.06).clamp(
      10.0,
      18.0,
    )).toDouble();

    if (isDesktop) {
      return _buildDesktopStore(context, screenWidth);
    }

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: AnimatedBuilder(
        animation: StateService(),
        builder: (context, child) {
          final storeScrollView = AppRefreshScroll(
            onRefresh: _refreshStore,
            child: CustomScrollView(
            controller: _scrollController,
            physics: AppRefreshScroll.scrollPhysics(
              const AlwaysScrollableScrollPhysics(),
            ),
            slivers: [
              // 1. Unpinned Parallax Header (Brand + Image)
              SliverAppBar(
                pinned: true, // Keep it visible when scrolled up
                expandedHeight:
                    180, // Increased height to prevent overflow and improve visibility
                collapsedHeight: 60,
                toolbarHeight: 60,
                backgroundColor: const Color(0xFF1E9E68),
                elevation: 0,
                scrolledUnderElevation: 0,
                automaticallyImplyLeading: false,
                title: AnimatedOpacity(
                  duration: const Duration(milliseconds: 300),
                  opacity: _isScrolled ? 1.0 : 0.0,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      FarumasiLogo(
                        size: 32, // Nice readable logo
                        color: Colors.white,
                        onDark: true,
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        "FARUMASI",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 22, // Nice bold readable font
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.0,
                        ),
                      ),
                    ],
                  ),
                ),
                actions: [
                  AnimatedOpacity(
                    duration: const Duration(milliseconds: 300),
                    opacity: _isScrolled ? 1.0 : 0.0,
                    child: IgnorePointer(
                      ignoring: !_isScrolled,
                      child: const AuthNotificationBadgeIcon(),
                    ),
                  ),
                  AnimatedOpacity(
                    duration: const Duration(milliseconds: 300),
                    opacity: _isScrolled ? 1.0 : 0.0,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Cart Icon in App Bar
                        ListenableBuilder(
                          listenable: StateService(),

                          builder: (context, _) {
                            return Stack(
                              clipBehavior: Clip.none,

                              alignment: Alignment.center,

                              children: [
                                IconButton(
                                  icon: const Icon(
                                    Icons.shopping_cart,
                                    color: Colors.white,
                                  ),
                                  onPressed: _isScrolled
                                      ? () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) =>
                                                  const CartScreen(),
                                            ),
                                          );
                                        }
                                      : null,
                                ),
                                if (StateService().cartItems.isNotEmpty)
                                  Positioned(
                                    right: 8,
                                    top: 8,
                                    child: Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: const BoxDecoration(
                                        color: Colors.red,
                                        shape: BoxShape.circle,
                                      ),
                                      constraints: const BoxConstraints(
                                        minWidth: 14,
                                        minHeight: 14,
                                      ),
                                      child: Text(
                                        '${StateService().cartItems.length}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                                  ),
                              ],
                            );
                          },
                        ),
                        Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: IconButton(
                            icon: const Icon(
                              Icons.help_outline,
                              color: Colors.white,
                            ),
                            tooltip: 'Help',
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const HelpScreen(),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      const StoreHeroBackground(),
                      const WaveHeaderOverlay(color: Colors.white, opacity: 0.16),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              const Color(0xFF1E9E68).withValues(alpha: 0.65),
                              Colors.transparent,
                            ],
                            begin: Alignment.bottomLeft,
                            end: Alignment.topRight,
                          ),
                        ),
                      ),
                      Positioned(
                        top: MediaQuery.of(context).padding.top + 4,
                        right: 4,
                        child: AnimatedOpacity(
                          duration: const Duration(milliseconds: 200),
                          opacity: _isScrolled ? 0.0 : 1.0,
                          child: IgnorePointer(
                            ignoring: _isScrolled,
                            child: const AuthNotificationBadgeIcon(),
                          ),
                        ),
                      ),
                      // Brand Name + Slogan (Moved to Top)
                      Positioned(
                        top:
                            80, // Moved down to clear the status bar/collapsed toolbar area
                        left: 16,
                        right: 16,
                        child: AnimatedOpacity(
                          duration: const Duration(milliseconds: 200),
                          opacity: _isScrolled ? 0.0 : 1.0,
                          child: Row(
                            children: [
                              // Unique 'F' Medical Logo (Leafy Style)
                              FarumasiLogo(
                                size: 56, // Increased size
                                color: const Color(0xFF1E9E68),
                                onDark: true,
                              ),
                              SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      "FARUMASI",
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 32, // Increased size
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1.2,
                                        height: 1.0,
                                        shadows: [
                                          Shadow(
                                            blurRadius: 4,
                                            color: Colors.black45,
                                            offset: Offset(1, 1),
                                          ),
                                        ],
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                      maxLines: 1,
                                    ),
                                    // Typewriter Slogan
                                    const Flexible(child: TypewriterSlogan()),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Auth State Display (Kept at Bottom)
                      Positioned(
                        bottom: 16,
                        right: 16,
                        child: AnimatedOpacity(
                          duration: const Duration(milliseconds: 200),
                          opacity: _isScrolled ? 0.0 : 1.0,
                          child: StateService().isLoggedIn
                              ? Row(
                                  children: [
                                    GestureDetector(
                                      onTap: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (ctx) => SettingsScreen(
                                              onBack: () => Navigator.pop(ctx),
                                            ),
                                          ),
                                        );
                                      },
                                      child: Stack(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.all(8),
                                            decoration: const BoxDecoration(
                                              color: Colors.white24,
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(
                                              Icons.settings_outlined,
                                              color: Colors.white,
                                              size: 28,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    PopupMenuButton<String>(
                                      offset: const Offset(0, 40),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      elevation: 8,
                                      onSelected: (value) {
                                        if (value == 'profile') {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (context) =>
                                                  const ProfileScreen(),
                                            ),
                                          );
                                        } else if (value == 'orders') {
                                          pushGatedRoute(
                                            context,
                                            feature: 'orders',
                                            requirePin: true,
                                            child: OrdersScreen(
                                              onBrowseStore: () => Navigator.pop(context),
                                            ),
                                          );
                                        } else if (value == 'settings') {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (ctx) => SettingsScreen(
                                                onBack: () => Navigator.pop(ctx),
                                              ),
                                            ),
                                          );
                                        } else if (value == 'help') {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => const HelpScreen(),
                                            ),
                                          );
                                        } else if (value == 'logout') {
                                          final container = ProviderScope.containerOf(context);
                                          container.read(authProvider.notifier).logout();
                                          ScaffoldMessenger.of(
                                            context,
                                          ).showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                "Logged out successfully",
                                              ),
                                            ),
                                          );
                                        }
                                      },
                                      itemBuilder: (BuildContext context) => [
                                        PopupMenuItem(
                                          enabled: false,
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Hello, ${StateService().userName ?? 'User'}',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 16,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              const Divider(),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'profile',
                                          child: Row(
                                            children: [
                                              Icon(
                                                Icons.person_outline,
                                                color: Color(0xFF1E9E68),
                                                size: 20,
                                              ),
                                              SizedBox(width: 12),
                                              Text('My Profile'),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'orders',
                                          child: Row(
                                            children: [
                                              Icon(
                                                Icons.shopping_bag_outlined,
                                                color: Color(0xFF1E9E68),
                                                size: 20,
                                              ),
                                              SizedBox(width: 12),
                                              Text('My Orders'),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'settings',
                                          child: Row(
                                            children: [
                                              Icon(
                                                Icons.settings_outlined,
                                                color: Color(0xFF1E9E68),
                                                size: 20,
                                              ),
                                              SizedBox(width: 12),
                                              Text('Settings'),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuDivider(),
                                        const PopupMenuItem(
                                          value: 'help',
                                          child: Row(
                                            children: [
                                              Icon(
                                                Icons.help_outline,
                                                color: Color(0xFF1E9E68),
                                                size: 20,
                                              ),
                                              SizedBox(width: 12),
                                              Text('Help & Support'),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'logout',
                                          child: Row(
                                            children: [
                                              Icon(
                                                Icons.logout,
                                                color: Colors.red,
                                                size: 20,
                                              ),
                                              SizedBox(width: 12),
                                              Text(
                                                'Logout',
                                                style: TextStyle(
                                                  color: Colors.red,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                      child: CircleAvatar(
                                        radius: 22,
                                        backgroundColor: Colors.white,
                                        child: Text(
                                          StateService().userName != null &&
                                                  StateService()
                                                      .userName!
                                                      .isNotEmpty
                                              ? StateService().userName![0]
                                                    .toUpperCase()
                                              : 'U',
                                          style: const TextStyle(
                                            color: Color(0xFF1E9E68),
                                            fontWeight: FontWeight.bold,
                                            fontSize: 20,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                              : Row(
                                  children: [
                                    TextButton(
                                      onPressed: () => promptSignIn(context),
                                      child: const Text(
                                        'Login',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    ElevatedButton(
                                      onPressed: () => promptSignIn(context),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.white,
                                        foregroundColor: const Color(
                                          0xFF1E9E68,
                                        ),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            20,
                                          ),
                                        ),
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 16,
                                          vertical: 0,
                                        ),
                                        minimumSize: const Size(0, 36),
                                      ),
                                      child: const Text(
                                        'Sign Up',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                  collapseMode: CollapseMode.parallax,
                ),
              ),

              // 2. Sticky Header (Search + Categories)
              SliverPersistentHeader(
                pinned: true,
                delegate: _StickyHeaderDelegate(
                  height: _showCategories ? (isDesktop ? 190 : 220) : 80,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                      // Search Bar
                      Container(
                        color: const Color(0xFF1E9E68),
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                        child: Row(
                          children: [
                            // Search Label Text
                            const Text(
                              "Search",
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(width: 12),
                            // Expanded Search Field
                            Expanded(
                              child: Container(
                                height: 48,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(24),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black12,
                                      blurRadius: 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: TextField(
                                  controller: _searchController,
                                  style: const TextStyle(fontSize: 16),
                                  textAlignVertical: TextAlignVertical.center,
                                  decoration: InputDecoration(
                                    hintText: 'Medicines, symptoms...',
                                    hintStyle: TextStyle(
                                      color: Colors.grey.shade400,
                                      fontSize: 15,
                                    ),
                                    prefixIcon: const Icon(
                                      Icons.search,
                                      color: Colors.grey,
                                    ),
                                    suffixIcon: _buildFilterTrigger(),
                                    border: InputBorder.none,
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                    ),
                                  ),
                                  onChanged: (val) =>
                                      setState(() => _searchQuery = val),
                                ),
                              ),
                            ),
                            // Toggle Categories Button
                            SizedBox(width: 8),
                            IconButton(
                              icon: Icon(
                                _showCategories
                                    ? Icons.keyboard_arrow_up
                                    : Icons.keyboard_arrow_down,
                                color: Colors.white,
                              ),
                              onPressed: () => setState(
                                () => _showCategories = !_showCategories,
                              ),
                              tooltip: _showCategories
                                  ? "Hide Categories"
                                  : "Show Categories",
                            ),
                          ],
                        ),
                      ),

                      // Categories List (Conditionally Visible)
                      if (_showCategories)
                        Container(
                          height: 104,
                          color: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: _buildCategoryRow(
                            height: 96,
                            showArrows: true,
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              if (_showFilters)
                SliverToBoxAdapter(child: _buildFilterPanel()),

              // Partner Pharmacies Section (Replaces Popular Today)
              if (_searchQuery.isEmpty && _selectedCategories.isEmpty) ...[
                const SliverToBoxAdapter(child: SponsoredCarousel()),
                SliverToBoxAdapter(child: _buildCatalogStatusBanner()),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Pharmacies & Companies',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: _buildSellersCarousel(),
                ),              ],

              // "Did you mean?" Suggestion Header
              if (_searchQuery.isNotEmpty &&
                  _filteredMedicines.isNotEmpty &&
                  _getMedicinesForQuery(_searchQuery).isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.orange.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "No results found for your search.",
                            style: TextStyle(color: Colors.red),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Text("Showing results for "),
                              GestureDetector(
                                onTap: () {
                                  // Update the search query to the corrected term
                                  setState(() {
                                    final correction =
                                        _findBestMatch(_searchQuery) ?? "";
                                    _searchQuery = correction;
                                    _searchController.text =
                                        correction; // Update text field
                                    // Move cursor to end
                                    _searchController
                                        .selection = TextSelection.fromPosition(
                                      TextPosition(offset: correction.length),
                                    );
                                  });
                                },
                                child: Text(
                                  "${_findBestMatch(_searchQuery)}",
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontStyle: FontStyle.italic,
                                    color: Colors.blue,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // All Products Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _medicinesSectionTitle,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '${_sortedMedicines.length} medicine${_sortedMedicines.length == 1 ? '' : 's'}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                      if (_activeFilterCount > 0)
                        TextButton.icon(
                          onPressed: _clearAllFilters,
                          icon: const Icon(
                            Icons.close,
                            size: 16,
                            color: Colors.orange,
                          ),
                          label: const Text(
                            'Clear All',
                            style: TextStyle(color: Colors.orange),
                          ),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.symmetric(horizontal: 8),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              // Main Grid
              if (_catalogLoading)
                SliverToBoxAdapter(
                  child: ShimmerProductGrid(
                    count: 6,
                    crossAxisCount: isDesktop ? 4 : 2,
                  ),
                )
              else
              SliverPadding(
                padding: EdgeInsets.symmetric(horizontal: isDesktop ? 20 : 12),
                sliver: SliverGrid(
                  gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: responsiveCardWidth,
                    mainAxisExtent: responsiveCardHeight,
                    crossAxisSpacing: responsiveGridSpacing,
                    mainAxisSpacing: responsiveGridSpacing,
                  ),
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final med = _sortedMedicines[index];
                    return MedicineItem(
                      medicine: med,
                      onTap: () => handleProductCartTap(context, med),
                      onAboutTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => MedicineDetailScreen(medicine: med),
                        ),
                      ),
                    );
                  }, childCount: _sortedMedicines.length),
                ),
              ),

              SliverToBoxAdapter(child: SizedBox(height: 80)),
            ],
          ),
          );

          return Scaffold(
            floatingActionButton: (!isDesktop && _showFloatingActions)
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      FloatingActionButton(
                        heroTag: 'upload_btn',
                        backgroundColor: StateService().isLoggedIn
                            ? Colors.blue
                            : Colors.grey,
                        onPressed: () {
                          if (!StateService().isLoggedIn) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: const Text(
                                  "Please login to upload a prescription.",
                                ),
                                action: SnackBarAction(
                                  label: 'Login',
                                  onPressed: () => promptSignIn(context),
                                ),
                              ),
                            );
                            return;
                          }
                          if (widget.onUploadPrescription != null) {
                            widget.onUploadPrescription!();
                          } else {
                            StateService().requestHomeTab(4, prescriptionUpload: true);
                          }
                        },
                        tooltip: 'Upload Prescription',
                        child: const Icon(
                          Icons.upload_file,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ListenableBuilder(
                        listenable: StateService(),

                        builder: (context, _) {
                          return Stack(
                            alignment: Alignment.topRight,

                            clipBehavior: Clip.none,

                            children: [
                              FloatingActionButton(
                                heroTag: 'cart_main_btn',
                                backgroundColor: const Color(0xFF1E9E68),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const CartScreen(),
                                    ),
                                  );
                                },
                                tooltip: 'View Cart',
                                child: const Icon(
                                  Icons.shopping_cart,
                                  color: Colors.white,
                                ),
                              ),
                              if (StateService().cartItems.isNotEmpty)
                                Positioned(
                                  right: 0,
                                  top: 0,
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: Colors.red,
                                      shape: BoxShape.circle,
                                    ),
                                    constraints: const BoxConstraints(
                                      minWidth: 16,
                                      minHeight: 16,
                                    ),
                                    child: Text(
                                      '${StateService().cartItems.length}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ),
                            ],
                          );
                        },
                      ),
                    ],
                  )
                : null,
            body: isDesktop
                ? Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 1280),
                      child: storeScrollView,
                    ),
                  )
                : storeScrollView,
          );
        }, // end builder
      ), // end AnimatedBuilder
    ); // end GestureDetector
  }
}

class _StickyHeaderDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;
  final double height;

  _StickyHeaderDelegate({required this.child, required this.height});

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    // Determine visibility based on shrinkOffset to prevent content bleeding
    // When fully collapsed, only valid content should show.
    return SizedBox(height: height, child: child);
  }

  @override
  double get maxExtent => height;

  @override
  double get minExtent => height;

  @override
  bool shouldRebuild(_StickyHeaderDelegate oldDelegate) {
    return oldDelegate.child != child || oldDelegate.height != height;
  }
}

class FarumasiLogo extends StatelessWidget {
  final double size;
  final Color color;
  final bool onDark;

  const FarumasiLogo({
    super.key,
    required this.size,
    this.color = const Color(0xFF1E9E68),
    this.onDark = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.15),
      decoration: BoxDecoration(
        color: onDark ? Colors.white : Colors.transparent,
        shape: BoxShape.circle,
        boxShadow: onDark
            ? [
                BoxShadow(
                  blurRadius: 8,
                  color: Colors.black26,
                  offset: Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: CustomPaint(
        painter: _LeafyFPainter(
          color: onDark ? const Color(0xFF1E9E68) : color,
        ),
      ),
    );
  }
}

class _LeafyFPainter extends CustomPainter {
  final Color color;
  _LeafyFPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.08
      ..strokeCap = StrokeCap.round;

    // 1. Arc Circle (The encircling swoosh)
    final arcPath = Path();
    arcPath.addArc(
      Rect.fromLTWH(0, 0, w, h),
      0.8, // Start angle (bottom rightish)
      5.0, // Sweep angle (leave gap on left)
    );
    canvas.drawPath(arcPath, strokePaint);

    // 2. The "F" shapes (Leaf-like Wings)

    // Top Wing (Forms top bar and curve of F)
    final topWing = Path();
    topWing.moveTo(w * 0.28, h * 0.55); // Start at stem bottom-left
    topWing.quadraticBezierTo(
      w * 0.20,
      h * 0.20,
      w * 0.85,
      h * 0.22,
    ); // Curve up to top right tip
    topWing.quadraticBezierTo(
      w * 0.55,
      h * 0.35,
      w * 0.45,
      h * 0.45,
    ); // Curve back under
    topWing.close();
    canvas.drawPath(topWing, fillPaint);

    // Bottom Wing (Forms middle bar)
    final bottomWing = Path();
    bottomWing.moveTo(w * 0.32, h * 0.65); // Start below top wing
    bottomWing.quadraticBezierTo(
      w * 0.45,
      h * 0.50,
      w * 0.80,
      h * 0.50,
    ); // Curve out
    bottomWing.quadraticBezierTo(
      w * 0.60,
      h * 0.60,
      w * 0.40,
      h * 0.70,
    ); // Curve back
    bottomWing.close();
    canvas.drawPath(bottomWing, fillPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class TypewriterSlogan extends StatefulWidget {
  const TypewriterSlogan({super.key});

  @override
  State<TypewriterSlogan> createState() => _TypewriterSloganState();
}

class _TypewriterSloganState extends State<TypewriterSlogan> {
  final String _fullText = "Better Access, Better Living.";
  String _displayText = "";
  int _currentIndex = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // Start typing after a short delay
    Future.delayed(const Duration(milliseconds: 500), _startLoop);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startLoop() {
    if (!mounted) return;
    setState(() {
      _currentIndex = 0;
      _displayText = "";
    });
    _typeNextChar();
  }

  void _typeNextChar() {
    if (!mounted) return;

    if (_currentIndex < _fullText.length) {
      if (!mounted) return;
      setState(() {
        _displayText = _fullText.substring(0, _currentIndex + 1);
        _currentIndex++;
      });
      // Random typing speed creates a more natural effect
      _timer = Timer(
        Duration(milliseconds: 50 + (DateTime.now().millisecond % 100)),
        _typeNextChar,
      );
    } else {
      // Finished typing, wait then restart
      _timer = Timer(const Duration(seconds: 3), _startLoop);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: _displayText),
          if (_currentIndex < _fullText.length ||
              (DateTime.now().second % 2 == 0))
            WidgetSpan(
              child: Container(
                width: 3,
                height: 24,
                color: Colors.white,
                margin: const EdgeInsets.only(left: 2),
              ),
              alignment: PlaceholderAlignment.middle,
            ),
        ],
      ),
      style: const TextStyle(
        color: Colors.white,
        fontSize: 20,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.6,
        shadows: [
          Shadow(blurRadius: 6, color: Colors.black54, offset: Offset(0, 1)),
          Shadow(blurRadius: 2, color: Colors.black38, offset: Offset(0, 1)),
        ],
      ),
      overflow: TextOverflow.ellipsis,
      maxLines: 2,
    );
  }
}

class _SearchableListDialog extends StatefulWidget {
  final String title;
  final List<String> items;

  const _SearchableListDialog({
    required this.title,
    required this.items,
  });

  @override
  State<_SearchableListDialog> createState() => _SearchableListDialogState();
}

class _SearchableListDialogState extends State<_SearchableListDialog> {
  String _searchQuery = '';
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Filter items
    final filtered = widget.items
        .where(
          (item) => item.toLowerCase().contains(_searchQuery.toLowerCase()),
        )
        .toList();

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        padding: const EdgeInsets.all(16),
        height: 500, // Fixed height or create constrained Box
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _controller,
              decoration: InputDecoration(
                hintText: 'Search...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
              ),
              onChanged: (val) {
                setState(() {
                  _searchQuery = val;
                });
              },
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.separated(
                itemCount: filtered.length + 1,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  if (index == 0) {
                    // "All" Option
                    if (_searchQuery.isNotEmpty &&
                        !'all categories'.contains(
                          _searchQuery.toLowerCase(),
                        )) {
                      return const SizedBox.shrink();
                    }
                    return ListTile(
                      title: const Text(
                        'All Categories',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E9E68),
                        ),
                      ),
                      onTap: () => Navigator.pop(context, 'All Categories'),
                    );
                  }

                  // Adjust index because 0 is taken
                  final actualIndex = index - 1;
                  // If "All" was hidden (SizedBox.shrink), index 0 still exists in builder but takes no space?
                  // No, ListView builder logic is strict.
                  // BETTER APPROACH: Build a unified list.

                  return ListTile(
                    title: Text(filtered[actualIndex]),
                    onTap: () => Navigator.pop(context, filtered[actualIndex]),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
