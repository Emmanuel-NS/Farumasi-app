import 'package:flutter/material.dart';
import '../models/models.dart';
import '../data/dummy_data.dart';
import '../widgets/medicine_item.dart';
import 'medicine_detail_screen.dart';
import '../services/state_service.dart';
import 'auth_screen.dart';

class MedicineStoreScreen extends StatefulWidget {
  const MedicineStoreScreen({super.key});

  @override
  State<MedicineStoreScreen> createState() => _MedicineStoreScreenState();
}

class _MedicineStoreScreenState extends State<MedicineStoreScreen>
    with SingleTickerProviderStateMixin {
  // Search & Filter State
  String _searchQuery = '';
  final Set<String> _selectedCategories = {};
  RangeValues _priceRange = const RangeValues(0, 50000);
  double _minRating = 0.0;
  String _sortBy = 'Popularity';
  bool _showCategories = true; // State for category visibility

  List<Medicine> get _filteredMedicines {
    return dummyMedicines.where((m) {
      final matchesSearch = m.name.toLowerCase().contains(
        _searchQuery.toLowerCase(),
      );
      final matchesCategory =
          _selectedCategories.isEmpty ||
          _selectedCategories.contains(m.category);
      final matchesPrice =
          m.price >= _priceRange.start && m.price <= _priceRange.end;
      final matchesRating = m.rating >= _minRating;
      return matchesSearch && matchesCategory && matchesPrice && matchesRating;
    }).toList();
  }

  List<Medicine> get _sortedMedicines {
    var list = _filteredMedicines;
    switch (_sortBy) {
      case 'Price Low-High':
        list.sort((a, b) => a.price.compareTo(b.price));
        break;
      case 'Price High-Low':
        list.sort((a, b) => b.price.compareTo(a.price));
        break;
      case 'Name':
        list.sort((a, b) => a.name.compareTo(b.name));
        break;
      case 'Popularity':
      default:
        list.sort((a, b) {
          if (a.isPopular && !b.isPopular) return -1;
          if (!a.isPopular && b.isPopular) return 1;
          return b.rating.compareTo(a.rating);
        });
        break;
    }
    return list;
  }

  List<Medicine> get _popularMedicines =>
      dummyMedicines.where((m) => m.isPopular).toList();

  List<String> get _categories =>
      dummyMedicines.map((e) => e.category).toSet().toList();

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
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Container(
            padding: const EdgeInsets.all(20.0),
            height: MediaQuery.of(context).size.height * 0.7,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Filters',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextButton(
                      child: Text('Reset'),
                      onPressed: () {
                        setModalState(() {
                          _selectedCategories.clear();
                          _priceRange = const RangeValues(0, 50000);
                          _minRating = 0.0;
                          _sortBy = 'Popularity';
                        });
                        setState(() {});
                      },
                    ),
                  ],
                ),
                Divider(),
                Expanded(
                  child: ListView(
                    children: [
                      Text(
                        'Sort By',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Wrap(
                        spacing: 8,
                        children:
                            [
                              'Popularity',
                              'Price Low-High',
                              'Price High-Low',
                              'Name',
                            ].map((sort) {
                              return ChoiceChip(
                                label: Text(sort),
                                selected: _sortBy == sort,
                                onSelected: (selected) {
                                  if (selected) {
                                    setModalState(() => _sortBy = sort);
                                    setState(() {});
                                  }
                                },
                              );
                            }).toList(),
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Category',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Wrap(
                        spacing: 8,
                        children: [
                          FilterChip(
                            label: Text('All'),
                            selected: _selectedCategories.isEmpty,
                            onSelected: (_) {
                              setModalState(() => _selectedCategories.clear());
                              setState(() {});
                            },
                          ),
                          ..._categories.map(
                            (cat) => FilterChip(
                              label: Text(cat),
                              selected: _selectedCategories.contains(cat),
                              onSelected: (selected) {
                                setModalState(() {
                                  if (selected) {
                                    _selectedCategories.add(cat);
                                  } else {
                                    _selectedCategories.remove(cat);
                                  }
                                });
                                setState(() {});
                              },
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Price Range: ${_priceRange.start.round()} - ${_priceRange.end.round()} RWF',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      RangeSlider(
                        values: _priceRange,
                        min: 0,
                        max: 50000,
                        divisions: 50,
                        labels: RangeLabels(
                          '${_priceRange.start.round()} RWF',
                          '${_priceRange.end.round()} RWF',
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
                    child: Text('Apply Filters'),
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

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: StateService(),
      builder: (context, child) {
        return Scaffold(
          body: CustomScrollView(
            slivers: [
              // 1. Unpinned Parallax Header (Brand + Image)
              SliverAppBar(
                pinned: false, // Scrolls away completely
                expandedHeight: 180, // Reduced height further as requested
                backgroundColor: Colors.green,
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
                      // Brand Name + Notification Icon
                      Positioned(
                        bottom: 20,
                        left: 20,
                        right: 20,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  // Unique 'F' Medical Logo (Leafy Style)
                                  FarumasiLogo(
                                    size: 60,
                                    color: Colors.green,
                                    onDark: true,
                                  ),
                                  SizedBox(width: 8), // Reduced spacing
                                  Flexible(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          "FARUMASI",
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize:
                                                28, // Reduced size to prevent overflow (was 34)
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 1.0,
                                            shadows: [
                                              Shadow(
                                                blurRadius: 4,
                                                color: Colors.black45,
                                                offset: Offset(1, 1),
                                              ),
                                            ],
                                          ),
                                          overflow: TextOverflow.fade,
                                          maxLines: 1,
                                          softWrap: false,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Auth State Display (Profile if logged in, Buttons if not)
                            if (StateService().isLoggedIn)
                              Row(
                                children: [
                                  Stack(
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
                                  const SizedBox(width: 12),
                                  PopupMenuButton<String>(
                                    offset: const Offset(0, 40),
                                    onSelected: (value) {
                                      if (value == 'logout') {
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
                                        child: Text(
                                          'Hello, ${StateService().userName ?? 'User'}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      const PopupMenuItem(
                                        value: 'logout',
                                        child: Row(
                                          children: [
                                            Icon(
                                              Icons.logout,
                                              color: Colors.green,
                                            ),
                                            SizedBox(width: 8),
                                            Text('Logout'),
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
                            else
                              Row(
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
                                        borderRadius: BorderRadius.circular(20),
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
                          ],
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
                      ? 190
                      : 92, // Increased height for padding
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      // Search Bar
                      Container(
                        color: Colors.green,
                        padding: const EdgeInsets.fromLTRB(
                          16,
                          24,
                          16,
                          4,
                        ), // Increased top padding
                        child: Row(
                          children: [
                            // Sticky Header Logo (Mini Version)
                            FarumasiLogo(
                              size: 40,
                              color: Colors.green,
                              onDark: true,
                            ),
                            SizedBox(width: 10),
                            // Expanded Search Field
                            Expanded(
                              child: Container(
                                height: 45,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.white),
                                ),
                                child: TextField(
                                  decoration: InputDecoration(
                                    hintText: 'Search medicines...',
                                    hintStyle: TextStyle(color: Colors.grey),
                                    prefixIcon: Icon(
                                      Icons.search,
                                      color: Colors.grey,
                                    ),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        Icons.tune,
                                        color: Colors.green,
                                      ),
                                      onPressed: _showFilterModal,
                                    ),
                                    border: InputBorder.none,
                                    contentPadding: EdgeInsets.symmetric(
                                      vertical: 10,
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
                          height: 110,
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
                                          if (_selectedCategories.contains(
                                            cat,
                                          )) {
                                            _selectedCategories.remove(cat);
                                          } else {
                                            // No clearing, allow multiple
                                            _selectedCategories.add(cat);
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
                                                  _selectedCategories.contains(
                                                    cat,
                                                  )
                                                  ? Colors.green
                                                  : Colors.grey.shade100,
                                              shape: BoxShape.circle,
                                              border: Border.all(
                                                color:
                                                    _selectedCategories
                                                        .contains(cat)
                                                    ? Colors.green
                                                    : Colors.grey.shade300,
                                              ),
                                            ),
                                            child: Icon(
                                              _getCategoryIcon(cat),
                                              color:
                                                  _selectedCategories.contains(
                                                    cat,
                                                  )
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
                                                  _selectedCategories.contains(
                                                    cat,
                                                  )
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
                      Divider(
                        height: 1,
                        thickness: 1,
                        color: Colors.green.shade800,
                      ),
                    ],
                  ),
                ),
              ),

              // Section Title: Popular (Only if filtering is inactive)
              if (_searchQuery.isEmpty && _selectedCategories.isEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Popular Today',
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
                    height: 250,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: EdgeInsets.symmetric(horizontal: 12),
                      itemCount: _popularMedicines.length,
                      itemBuilder: (context, index) {
                        final med = _popularMedicines[index];
                        return SizedBox(
                          width: 170,
                          child: MedicineItem(
                            medicine: med,
                            onTap: () {
                              if (med.requiresPrescription) {
                                ScaffoldMessenger.of(
                                  context,
                                ).hideCurrentSnackBar();
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
                                ScaffoldMessenger.of(
                                  context,
                                ).hideCurrentSnackBar();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      '${med.name} removed from cart',
                                    ),
                                    duration: Duration(seconds: 1),
                                    behavior: SnackBarBehavior.floating,
                                    backgroundColor: Colors.black87,
                                  ),
                                );
                              } else {
                                StateService().addToCart(med, 1);
                                ScaffoldMessenger.of(
                                  context,
                                ).hideCurrentSnackBar();
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
                                builder: (_) =>
                                    MedicineDetailScreen(medicine: med),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],

              // All Products Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text(
                    _searchQuery.isNotEmpty
                        ? 'Search Results'
                        : (_selectedCategories.isNotEmpty
                              ? 'Filtered Results'
                              : 'Explore Medicines'),
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ),

              // Main Grid
              SliverPadding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                sliver: SliverGrid(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.68,
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
    ); // end AnimatedBuilder
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
    return Container(
      color: Colors.green, // Fix white line gap by using green background
      child:
          child, // The child will have its own white background for the categories part
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
