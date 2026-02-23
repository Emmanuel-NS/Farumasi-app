import 'package:flutter/material.dart';
import 'dart:async'; // For Typewriter animation timer
import '../models/models.dart';
import '../data/dummy_data.dart';
import '../widgets/medicine_item.dart';
import 'medicine_detail_screen.dart';
import '../services/state_service.dart';
import 'auth_screen.dart';

import 'notification_screen.dart'; 
import 'package:flutter/rendering.dart'; 
import 'package:farumasi_app/screens/help_screen.dart';
import 'package:farumasi_app/screens/profile_screen.dart';
import 'package:farumasi_app/screens/settings_screen.dart';
import 'package:farumasi_app/screens/orders_screen.dart';
import 'pharmacy_detail_screen.dart'; // Import Pharmacy Detail Screen
import 'cart_screen.dart';
import 'prescription_upload_screen.dart'; // Add this import

class MedicineStoreScreen extends StatefulWidget {
  const MedicineStoreScreen({super.key});

  @override
  State<MedicineStoreScreen> createState() => _MedicineStoreScreenState();
}

class _MedicineStoreScreenState extends State<MedicineStoreScreen>
    with SingleTickerProviderStateMixin {
  late ScrollController _scrollController;
  late TextEditingController _searchController; // Added controller
  bool _isScrolled = false;
  // Track scroll position to determine direction
  double _lastScrollOffset = 0.0;
  bool _showFloatingActions = true; // Default to visible

  @override
  void initState() {
    super.initState();
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
        if (_scrollController.position.userScrollDirection == ScrollDirection.reverse) {
           if (!_showCategories) setState(() => _showCategories = true);
           if (!_showFloatingActions) setState(() => _showFloatingActions = true);
        } 
        // Scrolling UP (forward) -> HIDE
        else if (_scrollController.position.userScrollDirection == ScrollDirection.forward) {
           if (_showCategories) setState(() => _showCategories = false);
           if (_showFloatingActions) setState(() => _showFloatingActions = false);
        }
        _lastScrollOffset = _scrollController.offset;
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose(); // Dispose search controller
    super.dispose();
  }

  // Search & Filter State
  String _searchQuery = '';
  String? _suggestedQuery; // New: For "Did you mean?"
  Set<String> _selectedCategories = {}; // Revert to set for multi-selection
  String? _selectedSubCategory;
  RangeValues _priceRange = const RangeValues(0, 50000); Set<String> _availableSubCategories = {}; // Dynamic subcategories

  double _minRating = 0.0;
  String _sortBy = 'Name'; // 'Name' or 'Price'
  bool _sortAscending = true;
  bool _showCategories = false; // Collapsed by default

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
  bool get _isShowigCorrectedResults {
     if (_searchQuery.isEmpty) return false;
     if (_getMedicinesForQuery(_searchQuery).isNotEmpty) return false;
     // If original query has no results, but current filtered list has items,
     // it means we are showing corrected results.
     return _filteredMedicines.isNotEmpty;
  }
  
  String? get _correctionTerm {
    if (_searchQuery.isEmpty) return null;
    return _findBestMatch(_searchQuery);
  }

  // 1b. Helper to get results for a specific string query
  List<Medicine> _getMedicinesForQuery(String queryText) {
     return dummyMedicines.where((m) {
      
      // Clean the query
      final cleanQuery = queryText.toLowerCase().trim();
      List<String> queryWords = cleanQuery.split(' ').where((w) => w.isNotEmpty).toList();
      
      bool matches = true; 
      
      // If query is empty, we don't filter by text at all.
      // We set matches = true so that other filters (category, price) can do their job.
      if (cleanQuery.isEmpty) {
        matches = true;
      } else {
        for (String word in queryWords) {
          if (queryWords.length > 1 && word.length < 3 && !_isSignificant(word)) {
            continue; 
          }
          if (!_checkMedicineAgainstTerm(m, word)) {
            matches = false;
            break;
          }
        }

        // Fallback: If strict word matching failed, check if the full phrase is contained directly
        if (!matches && (m.name.toLowerCase().contains(cleanQuery) || 
            m.description.toLowerCase().contains(cleanQuery) ||
            m.category.toLowerCase().contains(cleanQuery))) {
           matches = true;
        }
      }

      // Category Match
      final matchesCategory = _selectedCategories.isEmpty || 
          _selectedCategories.contains(m.category);
      
      // SubCategory Match (if any selected, must match)
      final matchesSubCategory = _selectedSubCategory == null || 
          m.subCategory == _selectedSubCategory;
      // Filtering by Price
      // If Sort By is Min Price, filter by Min Price
      // If Sort By is Max Price, filter by Max Price
      // If Sort By is Name (or anything else), filter by Min Price (default behavior)
      bool matchesPrice = false;
      
      if (_sortBy == 'MaxPrice') {
         final maxP = m.maxPrice ?? m.price;
         matchesPrice = maxP >= _priceRange.start && maxP <= _priceRange.end;
      } else {
         // Default to filtering on base/min price
         matchesPrice = m.price >= _priceRange.start && m.price <= _priceRange.end;
      }

      final matchesRating = m.rating >= _minRating;

      return matches && matchesCategory && matchesSubCategory && matchesPrice && matchesRating;
    }).toList();
  }

  // New Helper: Find best match for "Did you mean"
  String? _findBestMatch(String typo) {
    String? bestTerm;
    int minDistance = 100;
    
    // 1. Collect candidate terms from known medicines
    final Set<String> candidates = {};
    for (var m in dummyMedicines) {
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
        v1[j + 1] = [v1[j] + 1, v0[j + 1] + 1, v0[j] + cost].reduce((a, b) => a < b ? a : b);
      }
      for (int j = 0; j < v0.length; j++) v0[j] = v1[j];
    }
    return v1[t.length];
  }

  List<Medicine> get _sortedMedicines {
    var list = _filteredMedicines;
    switch (_sortBy) {
      case 'MinPrice':
        list.sort((a, b) => _sortAscending 
            ? a.price.compareTo(b.price) 
            : b.price.compareTo(a.price));
        break;
      case 'MaxPrice':
        list.sort((a, b) {
           final aMax = a.maxPrice ?? a.price;
           final bMax = b.maxPrice ?? b.price;
           return _sortAscending 
               ? aMax.compareTo(bMax)
               : bMax.compareTo(aMax);
        });
        break;
      case 'Name':
      default:
        list.sort((a, b) => _sortAscending 
            ? a.name.compareTo(b.name) 
            : b.name.compareTo(a.name));
        break;
    }
    return list;
  }

  List<String> get _categories =>
      dummyMedicines.map((e) => e.category).toSet().toList();
  
  List<String> get _currentSubCategories {
    if (_selectedCategories.isEmpty) return [];
    return dummyMedicines
        .where((m) => _selectedCategories.contains(m.category) && m.subCategory != null)
        .map((m) => m.subCategory!)
        .toSet()
        .toList();
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
      case 'Herbal Medicines':
        return Icons.spa;
      default:
        return Icons.category;
    }
  }

  void _showFilterModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Container(
            padding: const EdgeInsets.all(20.0),
            height: MediaQuery.of(context).size.height * 0.75, // Slightly reduced height
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Sort & Filter',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    TextButton(
                      child: const Text('Reset', style: TextStyle(color: Colors.red)),
                      onPressed: () {
                        setModalState(() {
                          _selectedCategories.clear();
                          _selectedSubCategory = null;
                          _priceRange = const RangeValues(0, 50000);
                          _minRating = 0.0;
                          _sortBy = 'Name';
                          _sortAscending = true;
                        });
                        setState(() {});
                      },
                    ),
                  ],
                ),
                const Divider(),
                Expanded(
                  child: ListView(
                    children: [
                      // --- Sorting Logic Redesign ---
                      const Text(
                        'Sort Products By',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      const SizedBox(height: 12),
                      
                      // Custom Radio-like Options for Sort Field
                      _buildSortOption(
                        title: "Name",
                        isSelected: _sortBy == 'Name',
                        onTap: () {
                          setModalState(() {
                             _sortBy = 'Name';
                          });
                          setState(() {});
                        },
                      ),
                      _buildSortOption(
                        title: "Minimum Price",
                        subtitle: "Sort based on the lowest available price",
                        isSelected: _sortBy == 'MinPrice',
                        onTap: () {
                          setModalState(() {
                             _sortBy = 'MinPrice';
                          });
                          setState(() {});
                        },
                      ),
                      _buildSortOption(
                        title: "Maximum Price",
                        subtitle: "Sort based on the highest available price",
                        isSelected: _sortBy == 'MaxPrice',
                        onTap: () {
                          setModalState(() {
                             _sortBy = 'MaxPrice';
                          });
                          setState(() {});
                        },
                      ),
                      
                      const SizedBox(height: 16),
                      const Text('Order', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      // Ascending / Descending Toggle
                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setModalState(() => _sortAscending = true);
                                setState(() {});
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  color: _sortAscending ? Colors.green.shade50 : Colors.white,
                                  border: Border.all(
                                    color: _sortAscending ? Colors.green : Colors.grey.shade300,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Center(
                                  child: Text(
                                    "Ascending", 
                                    style: TextStyle(
                                      fontWeight: _sortAscending ? FontWeight.bold : FontWeight.normal,
                                      color: _sortAscending ? Colors.green : Colors.black87,
                                    )
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setModalState(() => _sortAscending = false);
                                setState(() {});
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  color: !_sortAscending ? Colors.green.shade50 : Colors.white,
                                  border: Border.all(
                                    color: !_sortAscending ? Colors.green : Colors.grey.shade300,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Center(
                                  child: Text(
                                    "Descending", 
                                    style: TextStyle(
                                      fontWeight: !_sortAscending ? FontWeight.bold : FontWeight.normal,
                                      color: !_sortAscending ? Colors.green : Colors.black87,
                                    )
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),
                      const Divider(),
                      const SizedBox(height: 16),

                      // --- Filtering ---
                      const Text('Category', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),

                      // Searchable Dropdown Button (Updated for Multi-Select)
                      InkWell(
                        onTap: () async {
                          // Show custom searchable dialog that supports multi-select
                          final selected = await showDialog<List<String>>(
                            context: context,
                            builder: (ctx) => _SearchableMultiSelectDialog(
                              title: "Select Categories",
                              items: _categories,
                              selectedItems: _selectedCategories.toList(),
                            ),
                          );
                          
                          if (selected != null) {
                            setModalState(() {
                              _selectedCategories = selected.toSet();
                              // Clear subcat if not valid anymore (optional but safer)
                              if (_selectedSubCategory != null) {
                                  // Check if the selected sub belongs to ANY of the new categories
                                  bool isValid = dummyMedicines.any((m) => 
                                     _selectedCategories.contains(m.category) && 
                                     m.subCategory == _selectedSubCategory
                                  );
                                  if (!isValid) _selectedSubCategory = null;
                              }
                            });
                            setState(() {});
                          }
                        },
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  _selectedCategories.isEmpty 
                                      ? 'All Categories' 
                                      : '${_selectedCategories.length} selected',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: _selectedCategories.isEmpty ? Colors.grey.shade600 : Colors.black87,
                                    fontWeight: _selectedCategories.isNotEmpty ? FontWeight.bold : FontWeight.normal
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const Icon(Icons.arrow_drop_down, color: Colors.grey),
                            ],
                          ),
                        ),
                      ),
                      
                      // Display Selected Categories as Chips for Easy Removal
                      if (_selectedCategories.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _selectedCategories.map((cat) => Chip(
                            label: Text(cat, style: const TextStyle(fontSize: 12)),
                            deleteIcon: const Icon(Icons.close, size: 16),
                            onDeleted: () {
                              setModalState(() {
                                _selectedCategories.remove(cat);
                                if (_selectedCategories.isEmpty) _selectedSubCategory = null;
                              });
                              setState(() {});
                            },
                            backgroundColor: Colors.green.shade50,
                            labelStyle: TextStyle(color: Colors.green.shade900),
                          )).toList(),
                        ),
                      ],

                      // Sub-Category Section (Conditional)
                      if (_selectedCategories.isNotEmpty && _currentSubCategories.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        const Text(
                          'Sub-Category (Refine)',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: [
                             ChoiceChip(
                                label: const Text('Any'),
                                selected: _selectedSubCategory == null,
                                onSelected: (selected) {
                                  if (selected) {
                                    setModalState(() => _selectedSubCategory = null);
                                    setState(() {});
                                  }
                                },
                              ),
                             ..._currentSubCategories.map((sub) => ChoiceChip(
                               label: Text(sub),
                               selected: _selectedSubCategory == sub,
                               onSelected: (selected) {
                                 setModalState(() {
                                   if (selected) {
                                     _selectedSubCategory = sub;
                                   } else {
                                     _selectedSubCategory = null;
                                   }
                                 });
                                 setState(() {});
                               },
                             )),
                          ],
                        ),
                      ],

                      // PRICE RANGE SECTION
                      const SizedBox(height: 24),
                      Text(
                         _sortBy == 'MaxPrice' 
                             ? 'Maximum Price Range' 
                             : 'Minimum Price Range',
                         style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Row(
                         mainAxisAlignment: MainAxisAlignment.spaceBetween,
                         children: [
                           Text(
                            'Filter by ${_sortBy == 'MaxPrice' ? 'Max' : 'Min'} Price',
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                          ),
                          Text(
                            '${_priceRange.start.round()} - ${_priceRange.end.round()} RWF',
                            style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                          ),
                         ],
                      ),
                      RangeSlider(
                        values: _priceRange,
                        min: 0,
                        max: 50000,
                        divisions: 50,
                        activeColor: Colors.green,
                        inactiveColor: Colors.green.shade100,
                        labels: RangeLabels(
                          '${_priceRange.start.round()}',
                          '${_priceRange.end.round()}',
                        ),
                        onChanged: (values) {
                          setModalState(() => _priceRange = values);
                          setState(() {});
                        },
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Apply Changes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // Helper widget for custom radio-style sort option
  Widget _buildSortOption({
    required String title,
    String? subtitle,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.green.shade50 : Colors.white,
          border: Border.all(
            color: isSelected ? Colors.green : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: isSelected ? Colors.green : Colors.grey,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Text(
                      title,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        color: isSelected ? Colors.green : Colors.black87,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: AnimatedBuilder(
        animation: StateService(),
        builder: (context, child) {
          return Scaffold(
            floatingActionButton: _showFloatingActions 
              ? Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    FloatingActionButton(
                      heroTag: 'upload_btn',
                      backgroundColor: StateService().isLoggedIn ? Colors.blue : Colors.grey,
                      onPressed: () {
                         if (!StateService().isLoggedIn) {
                           ScaffoldMessenger.of(context).showSnackBar(
                             SnackBar(
                               content: const Text("Please login to upload a prescription."),
                               action: SnackBarAction(
                                 label: 'Login',
                                 onPressed: () {
                                   Navigator.push(
                                     context,
                                     MaterialPageRoute(builder: (_) => const AuthScreen()),
                                   );
                                 },
                               ),
                             ),
                           );
                           return;
                         }
                         Navigator.push(
                           context,
                           MaterialPageRoute(builder: (_) => const PrescriptionUploadScreen()),
                         );
                      },
                      tooltip: 'Upload Prescription',
                      child: const Icon(Icons.upload_file, color: Colors.white),
                    ),
                    const SizedBox(height: 12),
                    Stack(
                      alignment: Alignment.topRight,
                      clipBehavior: Clip.none,
                      children: [
                        FloatingActionButton(
                          heroTag: 'cart_main_btn',
                          backgroundColor: Colors.green,
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const CartScreen()),
                            );
                          },
                          tooltip: 'View Cart',
                          child: const Icon(Icons.shopping_cart, color: Colors.white),
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
                    ),
                  ],
                ) 
              : null,
          body: CustomScrollView(
            controller: _scrollController,
            slivers: [
              // 1. Unpinned Parallax Header (Brand + Image)
              SliverAppBar(
                pinned: true, // Keep it visible when scrolled up
                expandedHeight: 180, // Increased height to prevent overflow and improve visibility
                collapsedHeight: 60, 
                toolbarHeight: 60,   
                backgroundColor: Colors.green,
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
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Cart Icon in App Bar
                        Stack(
                          clipBehavior: Clip.none,
                          alignment: Alignment.center,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.shopping_cart, color: Colors.white),
                              onPressed: _isScrolled
                                  ? () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                            builder: (_) => const CartScreen()),
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
                        ),
                        Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: IconButton(
                            icon: const Icon(Icons.help_outline, color: Colors.white),
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
                        Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: IconButton(
                            icon: const Icon(Icons.settings, color: Colors.white),
                            onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => const SettingsScreen(),
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
                      Image.network(
                        'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=1200',
                        fit: BoxFit.cover,
                      ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.green.shade900.withOpacity(0.9),
                              Colors.transparent,
                            ],
                            begin: Alignment.bottomLeft,
                            end: Alignment.topRight,
                          ),
                        ),
                      ),

                      // Brand Name + Slogan (Moved to Top)
                      Positioned(
                        top: 80, // Moved down to clear the status bar/collapsed toolbar area
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
                                color: Colors.green,
                                onDark: true,
                              ),
                              SizedBox(width: 12), 
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
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
                                              builder: (context) =>
                                                  const NotificationScreen()),
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
                                              Icons.notifications,
                                              color: Colors.white,
                                              size: 28,
                                            ),
                                          ),
                                          const Positioned(
                                            right: 8,
                                            top: 8,
                                            child: CircleAvatar(
                                              radius: 4,
                                              backgroundColor: Colors.red,
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
                                                    const ProfileScreen()),
                                          );
                                        } else if (value == 'orders') {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                                builder: (context) =>
                                                    const OrdersScreen()),
                                          );
                                        } else if (value == 'settings') {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                                builder: (context) =>
                                                    const SettingsScreen()),
                                          );
                                        } else if (value == 'logout') {
                                          StateService().logout();
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
                                            crossAxisAlignment: CrossAxisAlignment.start,
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
                                              Icon(Icons.person_outline, color: Colors.green, size: 20),
                                              SizedBox(width: 12),
                                              Text('My Profile'),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'orders',
                                          child: Row(
                                            children: [
                                              Icon(Icons.shopping_bag_outlined, color: Colors.green, size: 20),
                                              SizedBox(width: 12),
                                              Text('My Orders'),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'settings',
                                          child: Row(
                                            children: [
                                              Icon(Icons.settings_outlined, color: Colors.green, size: 20),
                                              SizedBox(width: 12),
                                              Text('Settings'),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuDivider(),
                                        const PopupMenuItem(
                                          value: 'logout',
                                          child: Row(
                                            children: [
                                              Icon(Icons.logout, color: Colors.red, size: 20),
                                              SizedBox(width: 12),
                                              Text('Logout', style: TextStyle(color: Colors.red)),
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
                                            color: Colors.green,
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
                                      onPressed: () => Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => const AuthScreen(),
                                        ),
                                      ),
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
                                      onPressed: () => Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => const AuthScreen(),
                                        ),
                                      ),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.white,
                                        foregroundColor: Colors.green,
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(20),
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
                  height: _showCategories
                      ? 220 
                      : 80, // Increased height to prevent overflow
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start, 
                    children: [
                      // Search Bar
                      Container(
                        color: Colors.green,
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
                                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                                    suffixIcon: IconButton(
                                      icon: const Icon(
                                        Icons.sort, // Changed icon to sort
                                        color: Colors.green,
                                        size: 24,
                                      ),
                                      onPressed: _showFilterModal,
                                      tooltip: "Sort & Filter",
                                    ),
                                    border: InputBorder.none,
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
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
                          height: 130, // Increased height for safe wrapping
                          color: Colors.white,
                          padding: EdgeInsets.symmetric(vertical: 10),
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            padding: EdgeInsets.symmetric(horizontal: 16),
                            children: _categories
                                .map(
                                  (cat) => Padding(
                                    padding: const EdgeInsets.only(right: 16.0),
                                    child: GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          if (_selectedCategories.contains(cat)) {
                                            _selectedCategories.remove(cat);
                                            // Optional: clear subcategory if it belongs to removed category?
                                            // _selectedSubCategory = null; 
                                          } else {
                                            _selectedCategories.add(cat);
                                            _selectedSubCategory = null;
                                          }
                                        });
                                      },
                                      child: Column(
                                        children: [
                                          AnimatedContainer(
                                            duration: Duration(
                                              milliseconds: 200,
                                            ),
                                            padding: EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color:
                                                  _selectedCategories.contains(cat)
                                                  ? Colors.green
                                                  : Colors.grey.shade100,
                                              shape: BoxShape.circle,
                                              border: Border.all(
                                                color:
                                                    _selectedCategories.contains(cat)
                                                    ? Colors.green
                                                    : Colors.grey.shade300,
                                              ),
                                            ),
                                            child: Icon(
                                              _getCategoryIcon(cat),
                                              color:
                                                  _selectedCategories.contains(cat)
                                                  ? Colors.white
                                                  : Colors.green,
                                              size: 28,
                                            ),
                                          ),
                                          SizedBox(height: 8),
                                          Text(
                                            cat,
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight:
                                                  _selectedCategories.contains(cat)
                                                  ? FontWeight.bold
                                                  : FontWeight.w500,
                                              color: Colors.black87,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              // Partner Pharmacies Section (Replaces Popular Today)
              if (_searchQuery.isEmpty && _selectedCategories.isEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Pharmacies we work with',
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
                  child: SizedBox(
                    height: 180,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: EdgeInsets.symmetric(horizontal: 12),
                      itemCount: dummyPharmacies.length,
                      itemBuilder: (context, index) {
                        final pharmacy = dummyPharmacies[index];
                        return GestureDetector(
                          onTap: () {
                             // Navigate to pharmacy detail
                             Navigator.push(
                               context, 
                               MaterialPageRoute(builder: (_) => PharmacyDetailScreen(pharmacy: pharmacy))
                             );
                          },
                          child: Container(
                            width: 240,
                            margin: const EdgeInsets.only(right: 16),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.grey.shade100,
                                  blurRadius: 8,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                              border: Border.all(color: Colors.grey.shade100),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.network(
                                    pharmacy.imageUrl,
                                    height: 100,
                                    width: double.infinity,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_,__,___) => Container(color: Colors.grey.shade200, height: 100, child: Icon(Icons.store, color: Colors.grey)),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  pharmacy.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(Icons.location_on, size: 14, color: Colors.grey.shade600),
                                    Expanded(
                                      child: Text(
                                        " ${pharmacy.province}, ${pharmacy.district}, ${pharmacy.sector}, ${pharmacy.cell}", 
                                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],

              // "Did you mean?" Suggestion Header
              if (_searchQuery.isNotEmpty && _filteredMedicines.isNotEmpty && _getMedicinesForQuery(_searchQuery).isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
                                    final correction = _findBestMatch(_searchQuery) ?? "";
                                    _searchQuery = correction;
                                    _searchController.text = correction; // Update text field
                                    // Move cursor to end
                                    _searchController.selection = TextSelection.fromPosition(
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
                        _searchQuery.isNotEmpty
                            ? 'Search Results'
                            : (_selectedCategories.isNotEmpty || _selectedSubCategory != null
                                  ? 'Filtered Results'
                                  : 'Explore Medicines'),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      if (_searchQuery.isNotEmpty || _selectedCategories.isNotEmpty || _selectedSubCategory != null)
                        TextButton.icon(
                          onPressed: () {
                            setState(() {
                              _searchQuery = '';
                              _searchController.clear();
                              _selectedCategories.clear();
                              _selectedSubCategory = null;
                              _priceRange = const RangeValues(0, 50000);
                              _minRating = 0.0;
                              _sortBy = 'Name';
                              _sortAscending = true;
                            });
                          },
                          icon: const Icon(Icons.close, size: 16, color: Colors.orange),
                          label: const Text('Clear All', style: TextStyle(color: Colors.orange)),
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
              SliverPadding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                sliver: SliverGrid(
                  gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 200, 
                    mainAxisExtent: 280, // FIXED HEIGHT instead of aspect ratio
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final med = _sortedMedicines[index];
                    return MedicineItem(
                      medicine: med,
                      onTap: () {
                        if (med.requiresPrescription) {
                          ScaffoldMessenger.of(context).hideCurrentSnackBar();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Prescription Required. Please consult a pharmacist.',
                              ),
                              backgroundColor: Colors.orange,
                            ),
                          );
                          return;
                        }
                        final isAdded = StateService().cartItems.any(
                          (item) => item.medicine.id == med.id,
                        );
                        if (isAdded) {
                          StateService().removeFromCart(med.id);
                          ScaffoldMessenger.of(context).hideCurrentSnackBar();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('${med.name} removed from cart'),
                              duration: Duration(seconds: 1),
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: Colors.black87,
                            ),
                          );
                        } else {
                          StateService().addToCart(med, 1);
                          ScaffoldMessenger.of(context).hideCurrentSnackBar();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('${med.name} added to cart!'),
                              duration: Duration(seconds: 1),
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: Colors.green,
                            ),
                          );
                        }
                      },
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
    return SizedBox(
      height: height,
      child: child,
    );
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
    this.color = Colors.green,
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
        painter: _LeafyFPainter(color: onDark ? Colors.green.shade700 : color),
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
          if (_currentIndex < _fullText.length || (DateTime.now().second % 2 == 0))
            WidgetSpan(
              child: Container(
                width: 3, 
                height: 24, 
                color: Colors.green, // Match text color
                margin: const EdgeInsets.only(left: 2),
              ),
              alignment: PlaceholderAlignment.middle,
            ),
        ],
      ),
      style: const TextStyle(
        color: Colors.green, 
        fontSize: 22, 
        fontWeight: FontWeight.w900, 
        letterSpacing: 1.0,
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
    super.key,
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
        .where((item) => item.toLowerCase().contains(_searchQuery.toLowerCase()))
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
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                )
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
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
                     if (_searchQuery.isNotEmpty && !'all categories'.contains(_searchQuery.toLowerCase())) {
                       return const SizedBox.shrink(); 
                     }
                     return ListTile(
                       title: const Text('All Categories', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
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
class _SearchableMultiSelectDialog extends StatefulWidget {
  final String title;
  final List<String> items;
  final List<String> selectedItems;

  const _SearchableMultiSelectDialog({
    super.key,
    required this.title,
    required this.items,
    required this.selectedItems,
  });

  @override
  State<_SearchableMultiSelectDialog> createState() => _SearchableMultiSelectDialogState();
}

class _SearchableMultiSelectDialogState extends State<_SearchableMultiSelectDialog> {
  String _searchQuery = '';
  late Set<String> _tempSelected;

  @override
  void initState() {
    super.initState();
    _tempSelected = Set.from(widget.selectedItems);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.items
        .where((item) => item.toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        padding: const EdgeInsets.all(16),
        height: 600,
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(widget.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            if (_tempSelected.isNotEmpty)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => setState(() => _tempSelected.clear()),
                  child: const Text('Clear All', style: TextStyle(color: Colors.red)),
                ),
              ),
            TextField(
              decoration: InputDecoration(
                hintText: 'Search categories...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              onChanged: (val) => setState(() => _searchQuery = val),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.separated(
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final item = filtered[index];
                  final isSelected = _tempSelected.contains(item);
                  return CheckboxListTile(
                    title: Text(item),
                    value: isSelected,
                    activeColor: Colors.green,
                    onChanged: (val) {
                      setState(() {
                        if (val == true) {
                          _tempSelected.add(item);
                        } else {
                          _tempSelected.remove(item);
                        }
                      });
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () {
                   Navigator.pop(context, _tempSelected.toList());
                },
                child: Text('Done (\)', style: const TextStyle(color: Colors.white, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
