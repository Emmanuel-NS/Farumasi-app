import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // Import for SystemUiOverlayStyle
import 'dart:ui' as ui; // For PathMetrics in dashed line
import '../../models/models.dart';
import '../../services/pharmacist_service.dart';
import 'package:fl_chart/fl_chart.dart'; // Import for charts
import '../../data/dummy_data.dart'; // For inventory access
import 'inventory_edit_screen.dart';
import 'prescription_review_screen.dart';
import 'order_details_screen.dart'; // Import the new screen
import 'pharmacist_chat_screen.dart';
import 'revenue_details_screen.dart';
import 'daily_sales_screen.dart';
import 'pharmacist_notifications_screen.dart';
import 'pharmacist_delivery_management_screen.dart';
import '../auth_screen.dart';
import '../medicine_store_screen.dart' as store_screen;
import 'settings/profile_management_screen.dart';
import 'settings/system_audit_logs_screen.dart';
import 'settings/pharmacy_settings_screen.dart';
import 'settings/help_privacy_screen.dart';
import 'package:data_table_2/data_table_2.dart';

class PharmacistDashboardScreen extends StatefulWidget {
  const PharmacistDashboardScreen({super.key});

  @override
  State<PharmacistDashboardScreen> createState() =>
      _PharmacistDashboardScreenState();
}

class _PharmacistDashboardScreenState extends State<PharmacistDashboardScreen> {
  int _selectedIndex = 0;
  bool _isEditingInventoryItem = false;
  Medicine? _editingMedicine;
  String? _activeRightSidebar = 'consulting';
  bool _isSidebarCollapsed = false;
  double _sidebarWidth = 200.0;
  static const Color _shellGreen = Color(0xFF1E9E68);

  // Dashboard Status Filter Tabs
  int _ordersFilterIndex = 0; // 0=All, 1=Requests, 2=Processing...

  // Enhanced Search & Sort State
  String _searchQuery = "";
  String _selectedCategoryFilter = 'All';
  String _sortBy = "Newest";
  final ScrollController _categoryScrollController = ScrollController();

  final PharmacistService _service = PharmacistService();

  // Orders Table State Variables
  final Set<String> _selectedOrderIds = {};
  int _ordersTablePage = 0;
  static const int _ordersTablePageSize = 10;

  // Theme Colors - Green & White
  final Color _primaryGreen = const Color(0xFF2E7D32); // Darker standard green
  final Color _lightGreenErrors = const Color(0xFFE8F5E9);
  final Color _bgWhite = const Color(0xFFFAFAFA);

  // Local Inventory Management
  late List<Medicine> _inventoryList;
  final Set<String> _unpublishedIds = {};

  final List<String> _titles = [
    "Overview",
    "Requests",
    "Orders",
    "Inventory",
    "More",
    "Fleet Management",
    "Audit Logs",
    "Settings",
  ];

  @override
  void initState() {
    super.initState();
    _inventoryList = List.from(dummyMedicines);
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: AnimatedBuilder(
        animation: _service,
        builder: (context, _) {
          return LayoutBuilder(
            builder: (context, constraints) {
              final bool isWebWide = constraints.maxWidth >= 900;
              final contentArea = (_activeRightSidebar != null && !isWebWide)
                  ? _buildRightContextSidebar(context, fullWidth: true)
                  : Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 1100),
                        child: Column(
                          children: [
                            if (!isWebWide) _buildHeader(),
                            Expanded(
                              child: IndexedStack(
                                index: _selectedIndex,
                                children: [
                                  _buildOverviewTab(),
                                  _buildRequestsTab(),
                                  _buildOrdersTab(),
                                  _buildInventoryTab(),
                                  _buildMoreTab(),
                                  const PharmacistDeliveryManagementScreen(),
                                  const SystemAuditLogsScreen(),
                                  const PharmacySettingsScreen(),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );

              final fab = (_selectedIndex == 3 && !_isEditingInventoryItem)
                  ? FloatingActionButton.extended(
                      backgroundColor: _primaryGreen,
                      icon: const Icon(Icons.add, color: Colors.white),
                      label: const Text(
                        "New Product",
                        style: TextStyle(color: Colors.white),
                      ),
                      onPressed: () {
                        setState(() {
                          _editingMedicine = null;
                          _isEditingInventoryItem = true;
                        });
                      },
                    )
                  : null;

              if (isWebWide) {
                return Scaffold(
                  backgroundColor: _bgWhite,
                  body: Column(
                    children: [
                      _buildDesktopShellHeader(context),
                      Expanded(
                        child: Container(
                          color: _shellGreen,
                          child: Row(
                            children: [
                              _buildPersistentSidebar(context),
                              MouseRegion(
                                cursor: SystemMouseCursors.resizeLeftRight,
                                child: GestureDetector(
                                  behavior: HitTestBehavior.opaque,
                                  onPanUpdate: (details) {
                                    setState(() {
                                      _sidebarWidth += details.delta.dx;
                                      if (_sidebarWidth < 140) {
                                        _isSidebarCollapsed = true;
                                        _sidebarWidth = 200;
                                      } else {
                                        _isSidebarCollapsed = false;
                                        if (_sidebarWidth > 400)
                                          _sidebarWidth = 400;
                                      }
                                    });
                                  },
                                  child: Container(
                                    width: 14,
                                    color: Colors.transparent,
                                    child: Center(
                                      child: Container(
                                        width: 4,
                                        height: 36,
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(
                                            alpha: 0.8,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            2,
                                          ),
                                        ),
                                        child: const Column(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceEvenly,
                                          children: [
                                            Icon(
                                              Icons.circle,
                                              size: 2,
                                              color: Colors.white,
                                            ),
                                            Icon(
                                              Icons.circle,
                                              size: 2,
                                              color: Colors.white,
                                            ),
                                            Icon(
                                              Icons.circle,
                                              size: 2,
                                              color: Colors.white,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: const BorderRadius.only(
                                    topLeft: Radius.circular(32),
                                  ),
                                  child: Container(
                                    color: _bgWhite,
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: AnimatedContainer(
                                            duration: const Duration(
                                              milliseconds: 300,
                                            ),
                                            curve: Curves.easeInOutCubic,
                                            margin: EdgeInsets.only(
                                              right:
                                                  (_activeRightSidebar != null)
                                                  ? 12.0
                                                  : 0.0,
                                            ),
                                            child: ClipRRect(
                                              borderRadius: BorderRadius.only(
                                                topLeft: const Radius.circular(
                                                  32,
                                                ),
                                                topRight:
                                                    (_activeRightSidebar !=
                                                        null)
                                                    ? const Radius.circular(24)
                                                    : Radius.zero,
                                                bottomRight: Radius.zero,
                                              ),
                                              child: Container(
                                                color: const Color(0xFFF6F8FB),
                                                child: Scaffold(
                                                  backgroundColor:
                                                      Colors.transparent,
                                                  body: contentArea,
                                                  floatingActionButton: fab,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                        AnimatedSize(
                                          duration: const Duration(
                                            milliseconds: 300,
                                          ),
                                          curve: Curves.easeInOutCubic,
                                          child: (_activeRightSidebar != null)
                                              ? ClipRRect(
                                                  borderRadius:
                                                      const BorderRadius.only(
                                                        topLeft:
                                                            Radius.circular(24),
                                                        topRight:
                                                            Radius.circular(24),
                                                      ),
                                                  child:
                                                      _buildRightContextSidebar(
                                                        context,
                                                        fullWidth: false,
                                                      ),
                                                )
                                              : const SizedBox.shrink(),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }

              return PopScope(
                canPop: _selectedIndex == 0,
                // ignore: deprecated_member_use
                onPopInvoked: (didPop) {
                  if (didPop) return;
                  if (_selectedIndex != 0) setState(() => _selectedIndex = 0);
                },
                child: Scaffold(
                  backgroundColor: _bgWhite,
                  body: SafeArea(child: contentArea),
                  floatingActionButton: fab,
                  bottomNavigationBar: BottomNavigationBar(
                    currentIndex: _selectedIndex,
                    onTap: (index) => setState(() => _selectedIndex = index),
                    type: BottomNavigationBarType.fixed,
                    backgroundColor: Colors.white,
                    selectedItemColor: _primaryGreen,
                    unselectedItemColor: Colors.grey.shade800,
                    showSelectedLabels: true,
                    showUnselectedLabels: true,
                    selectedLabelStyle: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                    unselectedLabelStyle: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                    items: const [
                      BottomNavigationBarItem(
                        icon: Icon(Icons.dashboard_outlined),
                        activeIcon: Icon(Icons.dashboard),
                        label: "Overview",
                      ),
                      BottomNavigationBarItem(
                        icon: Icon(Icons.assignment_outlined),
                        activeIcon: Icon(Icons.assignment),
                        label: "Requests",
                      ),
                      BottomNavigationBarItem(
                        icon: Icon(Icons.shopping_bag_outlined),
                        activeIcon: Icon(Icons.shopping_bag),
                        label: "Orders",
                      ),
                      BottomNavigationBarItem(
                        icon: Icon(Icons.inventory_2_outlined),
                        activeIcon: Icon(Icons.inventory_2),
                        label: "Stock",
                      ),
                      BottomNavigationBarItem(
                        icon: Icon(Icons.more_horiz_outlined),
                        activeIcon: Icon(Icons.more_horiz),
                        label: "More",
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildDesktopShellHeader(BuildContext context) {
    return Container(
      height: 72,
      width: double.infinity,
      decoration: const BoxDecoration(color: _shellGreen),
      child: Row(
        children: [
          const SizedBox(width: 8),
          IconButton(
            icon: Icon(
              _isSidebarCollapsed ? Icons.menu : Icons.menu_open,
              color: Colors.white,
              size: 28,
            ),
            tooltip: _isSidebarCollapsed ? 'Expand menu' : 'Collapse menu',
            onPressed: () =>
                setState(() => _isSidebarCollapsed = !_isSidebarCollapsed),
          ),
          const SizedBox(width: 6),
          const store_screen.FarumasiLogo(
            size: 26,
            color: Colors.white,
            onDark: true,
          ),
          const SizedBox(width: 10),
          if (MediaQuery.of(context).size.width > 800)
            const Text(
              'FARUMASI Pharmacist',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
              ),
            ),
          const Spacer(),
          IconButton(
            icon: const Icon(
              Icons.help_outline,
              color: Colors.white70,
              size: 24,
            ),
            tooltip: 'Help & Support',
            onPressed: () {
              setState(() {
                _activeRightSidebar = _activeRightSidebar == 'help'
                    ? null
                    : 'help';
              });
            },
          ),
          const SizedBox(width: 8),
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(
                  Icons.chat_bubble_outline,
                  color: Colors.white,
                  size: 24,
                ),
                tooltip: 'Consulting',
                onPressed: () {
                  setState(() {
                    _activeRightSidebar = _activeRightSidebar == 'consulting'
                        ? null
                        : 'consulting';
                  });
                },
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: const Text(
                    "1",
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 4),
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_none, color: Colors.white),
                onPressed: () {
                  setState(() {
                    _activeRightSidebar = _activeRightSidebar == 'notifications'
                        ? null
                        : 'notifications';
                  });
                },
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: const Text(
                    "3",
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'profile') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const ProfileManagementScreen(),
                  ),
                );
              } else if (value == 'logout') {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const AuthScreen()),
                );
              }
            },
            offset: const Offset(0, 48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: const CircleAvatar(
              radius: 18,
              backgroundColor: Colors.white24,
              child: Icon(Icons.person, color: Colors.white, size: 20),
            ),
            itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
              const PopupMenuItem<String>(
                value: 'profile',
                child: ListTile(
                  leading: Icon(Icons.person_outline),
                  title: Text('Profile Management'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem<String>(
                value: 'logout',
                child: ListTile(
                  leading: Icon(Icons.logout, color: Colors.red),
                  title: Text('Logout', style: TextStyle(color: Colors.red)),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
          const SizedBox(width: 24),
        ],
      ),
    );
  }

  Widget _buildPersistentSidebar(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      width: _isSidebarCollapsed ? 92 : _sidebarWidth,
      clipBehavior: Clip.antiAlias,
      decoration: const BoxDecoration(
        color: _shellGreen,
        borderRadius: BorderRadius.zero,
      ),
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 16),
                _buildDrawerItem(
                  context,
                  Icons.dashboard_outlined,
                  Icons.dashboard,
                  "Overview",
                  0,
                ),
                _buildDrawerItem(
                  context,
                  Icons.assignment_outlined,
                  Icons.assignment,
                  "Requests",
                  1,
                ),
                _buildDrawerItem(
                  context,
                  Icons.shopping_bag_outlined,
                  Icons.shopping_bag,
                  "Orders",
                  2,
                ),
                _buildDrawerItem(
                  context,
                  Icons.inventory_2_outlined,
                  Icons.inventory_2,
                  "Stock",
                  3,
                ),
                const Divider(color: Colors.white24, height: 32, thickness: 1),
                _buildDrawerItem(
                  context,
                  Icons.two_wheeler_outlined,
                  Icons.two_wheeler,
                  "Fleet",
                  5,
                ),
                _buildDrawerItem(
                  context,
                  Icons.history_edu_outlined,
                  Icons.history_edu,
                  "Audit Logs",
                  6,
                ),
                _buildDrawerItem(
                  context,
                  Icons.settings_outlined,
                  Icons.settings,
                  "Settings",
                  7,
                ),
              ],
            ),
          ),
          SliverFillRemaining(
            hasScrollBody: false,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildDrawerItem(
                  context,
                  Icons.logout,
                  Icons.logout,
                  "Logout",
                  99,
                  onTapOverride: () => Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => const AuthScreen()),
                  ),
                ),
                if (!_isSidebarCollapsed)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    child: Center(
                      child: TextButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const PrivacyPolicyScreen(),
                            ),
                          );
                        },
                        child: const Text(
                          'Privacy & Terms',
                          style: TextStyle(
                            color: Color(0xFF9BC8B5),
                            fontSize: 12,
                            decoration: TextDecoration.underline,
                            decorationColor: Color(0xFF9BC8B5),
                          ),
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context,
    IconData iconUnselected,
    IconData iconSelected,
    String label,
    int index, {
    VoidCallback? onTapOverride,
  }) {
    final selected = _selectedIndex == index && onTapOverride == null;
    final collapsed = _isSidebarCollapsed;
    final icon = selected ? iconSelected : iconUnselected;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        collapsed ? 8 : 10,
        6,
        collapsed ? 8 : 10,
        0,
      ),
      child: Tooltip(
        message: label,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap:
                onTapOverride ?? () => setState(() => _selectedIndex = index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: EdgeInsets.symmetric(
                horizontal: collapsed ? 0 : 10,
                vertical: 9,
              ),
              decoration: BoxDecoration(
                color: selected ? const Color(0x3347D196) : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: collapsed
                    ? MainAxisAlignment.center
                    : MainAxisAlignment.start,
                children: [
                  Icon(
                    icon,
                    color: selected ? Colors.white : const Color(0xFFD2E8DE),
                    size: 28,
                  ),
                  if (!collapsed) ...[
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        label,
                        style: TextStyle(
                          color: selected
                              ? Colors.white
                              : const Color(0xFFD2E8DE),
                          fontSize: 16,
                          fontWeight: selected
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Brand Header
                  Row(
                    children: [
                      Image.asset(
                        'assets/images/app_logo.png',
                        width: 28,
                        height: 28,
                        errorBuilder: (context, error, stackTrace) => Icon(
                          Icons.local_pharmacy,
                          color: _primaryGreen,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "FARUMASI",
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: _primaryGreen,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _titles[_selectedIndex],
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.grey.shade200,
                          blurRadius: 10,
                          offset: const Offset(0, 5),
                        ),
                      ],
                      border: Border.all(color: _lightGreenErrors),
                    ),
                    child: IconButton(
                      icon: const Icon(
                        Icons.chat_bubble_outline,
                        color: Color(0xFF2E7D32),
                      ),
                      onPressed: () {
                        setState(() {
                          _activeRightSidebar =
                              _activeRightSidebar == 'consulting'
                              ? null
                              : 'consulting';
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.grey.shade200,
                          blurRadius: 10,
                          offset: const Offset(0, 5),
                        ),
                      ],
                      border: Border.all(color: _lightGreenErrors),
                    ),
                    child: Stack(
                      children: [
                        IconButton(
                          icon: Icon(
                            Icons.notifications_none_rounded,
                            color: _primaryGreen,
                          ),
                          onPressed: () {
                            setState(() {
                              _activeRightSidebar =
                                  _activeRightSidebar == 'notifications'
                                  ? null
                                  : 'notifications';
                            });
                          },
                        ),
                        Positioned(
                          right: 12,
                          top: 12,
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(
                              minWidth: 8,
                              minHeight: 8,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          /* Removed arbitrary pharmacy badge */
        ],
      ),
    );
  }

  Widget _buildRightContextSidebar(
    BuildContext context, {
    bool fullWidth = false,
  }) {
    if (_activeRightSidebar != null) {
      Widget content;
      switch (_activeRightSidebar) {
        case 'help':
          content = const HelpCenterScreen(isEmbedded: true);
          break;
        case 'consulting':
          content = const PharmacistChatScreen(isEmbedded: true);
          break;
        case 'notifications':
          content = const PharmacistNotificationsScreen(isEmbedded: true);
          break;
        default:
          content = const SizedBox.shrink();
      }
      final panelWidth = fullWidth ? double.infinity : 360.0;

      return Container(
        width: panelWidth,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            left: BorderSide(color: Colors.grey.shade200, width: 1),
          ),
          boxShadow: [
            BoxShadow(
              // ignore: deprecated_member_use
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(-2, 0),
            ),
          ],
        ),
        child: SafeArea(
          left: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 8.0),
                      child: Text(
                        _activeRightSidebar == 'help'
                            ? 'Help & Support'
                            : _activeRightSidebar == 'consulting'
                            ? 'Consulting'
                            : 'Notifications',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () =>
                          setState(() => _activeRightSidebar = null),
                    ),
                  ],
                ),
              ),
              Expanded(child: content),
            ],
          ),
        ),
      );
    }
    return const SizedBox.shrink();
  }

  // --- TAB 0: OVERVIEW ---
  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            height: 50,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.shade100,
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Icon(Icons.search, color: _primaryGreen),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    onChanged: (val) {
                      setState(() {
                        _searchQuery = val;
                      });
                    },
                    decoration: const InputDecoration(
                      hintText: "Search orders, medicines...",
                      border: InputBorder.none,
                      hintStyle: TextStyle(color: Colors.grey),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Overview Stats
          GridView(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: MediaQuery.of(context).size.width > 900 ? 4 : 2,
              mainAxisExtent:
                  180, // Fixed height to prevent overflow and maintain proportion
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            children: [
              _buildStatCard(
                title: "Stock Items",
                value: "${dummyMedicines.length}",
                subtext: "Low Stock: 2",
                icon: Icons.medication_outlined,
                color: Colors.blue,
                onTap: () {
                  setState(() => _selectedIndex = 3); // Go to Stock tab
                },
              ),
              _buildStatCard(
                title: "Active Orders",
                value: "${_service.processingOrders.length}",
                subtext: "Action Needed",
                icon: Icons.shopping_bag_outlined,
                color: Colors.orange,
                onTap: () {
                  setState(() {
                    _selectedIndex = 2; // Go to Orders tab
                    _ordersFilterIndex = 2; // Auto-filter to 'Processing'
                  });
                },
              ),
              _buildStatCard(
                title: "New Requests",
                value: "${_service.incomingRequests.length}",
                subtext: "+2 since 1h",
                icon: Icons.assignment_late_outlined,
                color: Colors.redAccent,
                onTap: () {
                  setState(() => _selectedIndex = 1); // Go to Requests tab
                },
              ),
              _buildCombinedRevenueCard(
                todayRevenue: _service.todayRevenue,
                weeklyRevenue: _service.weeklyRevenue,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const RevenueDetailsScreen(),
                    ),
                  );
                },
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Chart Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Weekly Activity",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1B5E20),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: _lightGreenErrors,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  "This Week",
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: _primaryGreen,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildLegend(color: _primaryGreen, text: "Orders"),
              const SizedBox(width: 16),
              _buildLegend(color: Colors.blue, text: "Sessions"),
            ],
          ),
          const SizedBox(height: 16),
          _buildChart(),

          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Upcoming Sessions",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1B5E20),
                ),
              ),
              TextButton(
                onPressed: () {
                  _showAllSessions(context);
                },
                child: Text("See All", style: TextStyle(color: _primaryGreen)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildUpcomingSessions(),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildUpcomingSessions() {
    final sessions = _service.upcomingSessions;

    if (sessions.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        alignment: Alignment.center,
        child: Column(
          children: [
            Icon(Icons.event_busy, size: 48, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text(
              "No upcoming sessions",
              style: TextStyle(color: Colors.grey.shade700),
            ),
          ],
        ),
      );
    }

    final isDesktop = MediaQuery.of(context).size.width > 900;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isDesktop ? 2 : 1,
        mainAxisExtent: 110,
        crossAxisSpacing: 24,
        mainAxisSpacing: 16,
      ),
      itemCount: sessions.length,
      itemBuilder: (context, index) {
        final session = sessions[index];
        bool isToday =
            session.date.day == DateTime.now().day &&
            session.date.month == DateTime.now().month &&
            session.date.year == DateTime.now().year;

        return GestureDetector(
          onTap: () => _showSessionDetails(session),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.shade100,
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
              border: Border.all(color: Colors.grey.shade100),
            ),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: _lightGreenErrors,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      session.patientName.isNotEmpty
                          ? session.patientName[0].toUpperCase()
                          : '?',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: _primaryGreen,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session.patientName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "${session.type} • ${isToday ? 'Today' : 'Tomorrow'}", // Simplified date logic
                        style: TextStyle(
                          color: Colors.grey.shade800,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      session.time,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _primaryGreen,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: session.status == "Confirmed"
                            ? const Color(0xFF1E9E68)
                            : Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        session.status,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: session.status == "Confirmed"
                              ? const Color(0xFF1E9E68)
                              : Colors.orange,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildChart() {
    return Container(
      height: 220,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade100,
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: 20,
          barTouchData: BarTouchData(
            touchCallback: (FlTouchEvent event, barTouchResponse) {
              if (barTouchResponse == null || barTouchResponse.spot == null) {
                return;
              }
              if (event is FlTapUpEvent ||
                  event is FlPanDownEvent ||
                  event is FlLongPressEnd) {
                final int dayIndex =
                    barTouchResponse.spot!.touchedBarGroupIndex;
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => DailySalesScreen(dayIndex: dayIndex),
                  ),
                );
              }
            },
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (group) => Colors.grey.shade800,
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                final String title = rodIndex == 0 ? "Orders" : "Sessions";
                return BarTooltipItem(
                  '$title: ${rod.toY.toInt()}',
                  const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                );
              },
            ),
          ),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (double value, TitleMeta meta) {
                  const style = TextStyle(
                    color: Colors.grey,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                  );
                  String text = '';
                  switch (value.toInt()) {
                    case 0:
                      text = 'M';
                      break;
                    case 1:
                      text = 'T';
                      break;
                    case 2:
                      text = 'W';
                      break;
                    case 3:
                      text = 'T';
                      break;
                    case 4:
                      text = 'F';
                      break;
                    case 5:
                      text = 'S';
                      break;
                    case 6:
                      text = 'S';
                      break;
                  }
                  return SideTitleWidget(
                    meta: meta,
                    child: Text(text, style: style),
                  );
                },
              ),
            ),
            leftTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          barGroups: [
            _makeBarGroup(0, 8, 4),
            _makeBarGroup(1, 10, 5),
            _makeBarGroup(2, 14, 8),
            _makeBarGroup(3, 15, 6),
            _makeBarGroup(4, 13, 10),
            _makeBarGroup(5, 18, 14), // Saturday peak
            _makeBarGroup(6, 12, 11),
          ],
        ),
      ),
    );
  }

  BarChartGroupData _makeBarGroup(int x, double orders, double sessions) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: orders,
          color: _primaryGreen,
          width: 8,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          backDrawRodData: BackgroundBarChartRodData(
            show: true,
            toY: 20,
            color: Colors.grey.shade100,
          ),
        ),
        BarChartRodData(
          toY: sessions,
          color: Colors.blue,
          width: 8,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          backDrawRodData: BackgroundBarChartRodData(
            show: true,
            toY: 20,
            color: Colors.grey.shade100,
          ),
        ),
      ],
    );
  }

  Widget _buildLegend({required Color color, required String text}) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required String subtext,
    required IconData icon,
    required Color color,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.shade100,
              blurRadius: 10,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(height: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade700,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtext,
                  style: TextStyle(
                    fontSize: 10,
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCombinedRevenueCard({
    required double todayRevenue,
    required double weeklyRevenue,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.shade100,
              blurRadius: 10,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _primaryGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.payments_outlined,
                    size: 20,
                    color: _primaryGreen,
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  size: 14,
                  color: Colors.grey.shade800,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "RWF ${todayRevenue.toStringAsFixed(0)}",
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  "Today",
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey.shade700,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "RWF ${weeklyRevenue.toStringAsFixed(0)}",
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue.shade700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  "This Week",
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey.shade700,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- TAB 1: REQUESTS (Prescription Review) ---
  Widget _buildRequestsTab() {
    final list = _service.incomingRequests;
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.assignment_turned_in_outlined,
              size: 80,
              color: Colors.grey.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              "No Pending Requests",
              style: TextStyle(color: Colors.grey.shade700, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(24),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: MediaQuery.of(context).size.width > 900 ? 2 : 1,
        mainAxisExtent: 280,
        crossAxisSpacing: 24,
        mainAxisSpacing: 16,
      ),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final order = list[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.shade200,
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: _lightGreenErrors,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(16),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "New Prescription",
                      style: TextStyle(
                        color: _primaryGreen,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      order.date.toString().substring(0, 16),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade800,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Prescription Image Thumbnail
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: 70,
                        height: 70,
                        color: Colors.grey.shade200,
                        child: Icon(Icons.image, color: Colors.grey.shade800),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            order.patientName,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "Ins: ${order.insuranceProvider ?? 'None'}",
                            style: TextStyle(
                              color: Colors.grey.shade800,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "Loc: ${order.patientLocationName}",
                            style: TextStyle(
                              color: Colors.grey.shade800,
                              fontSize: 13,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {}, // Reject Logic
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                        ),
                        child: const Text("Reject"),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _handleAcceptRequest(order),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _primaryGreen,
                          foregroundColor: Colors.white,
                          elevation: 0,
                        ),
                        child: const Text("Review & Price"),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _handleAcceptRequest(PrescriptionOrder order) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PrescriptionReviewScreen(order: order)),
    ).then((_) => setState(() {}));
  }

  // --- TAB 2: ORDERS (Active Processing) ---

  PrescriptionOrder? _selectedOrder;

  // --- TAB 2: ORDERS (Advanced Enterprise Layout) ---
  Widget _buildOrdersTab() {
    List<PrescriptionOrder> list = List.from(_service.orders);

    // Filter
    if (_ordersFilterIndex == 1) list = list.where((o) => o.prescriptionImageUrl != null).toList();
    if (_ordersFilterIndex == 2) list = list.where((o) => o.prescriptionImageUrl == null).toList();
    if (_ordersFilterIndex == 3) list = list.where((o) => o.status == OrderStatus.cancelled).toList();

    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((o) {
        return o.id.toLowerCase().contains(q) ||
               o.patientName.toLowerCase().contains(q);
      }).toList();
    }

    final totalRevenue = list.fold<double>(0.0, (sum, o) => sum + o.totalPrice);
    final pendingCount = list.where((o) => o.status == OrderStatus.paymentPending || o.status == OrderStatus.pendingReview).length;
    final inTransit = list.where((o) => o.status == OrderStatus.driverAssigned || o.status == OrderStatus.outForDelivery).length;

    return Column(
      children: [
        // KPI Header
        Container(
          padding: const EdgeInsets.all(24),
          color: Colors.white,
          child: Row(
            children: [
              _buildModernKPI('Total Orders', list.length.toString(), Icons.shopping_basket, Colors.blue),
              const SizedBox(width: 16),
              _buildModernKPI('Revenue', 'RWF ', Icons.monetization_on, Colors.green),
              const SizedBox(width: 16),
              _buildModernKPI('Pending Action', pendingCount.toString(), Icons.warning_amber_rounded, Colors.orange),
              const SizedBox(width: 16),
              _buildModernKPI('In Transit', inTransit.toString(), Icons.local_shipping, Colors.purple),
            ],
          ),
        ),
        Divider(height: 1, color: Colors.grey.shade300),
        
        // Split View Data Area
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left: Orders List
              Container(
                width: 380,
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(right: BorderSide(color: Colors.grey.shade300)),
                ),
                child: Column(
                  children: [
                    // Search & Filters Config
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: TextField(
                        onChanged: (val) => setState(() => _searchQuery = val),
                        decoration: InputDecoration(
                          hintText: 'Search orders...',
                          prefixIcon: const Icon(Icons.search),
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                    Divider(height: 1, color: Colors.grey.shade200),
                    Expanded(
                      child: ListView.separated(
                        itemCount: list.length,
                        separatorBuilder: (c, i) => Divider(height: 1, color: Colors.grey.shade100),
                        itemBuilder: (context, index) {
                          final o = list[index];
                          final isSelected = _selectedOrder?.id == o.id;
                          return InkWell(
                            onTap: () => setState(() => _selectedOrder = o),
                            child: Container(
                              color: isSelected ? _primaryGreen.withOpacity(0.05) : Colors.transparent,
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(o.id, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                      _buildStatusBadge(o.status),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(o.patientName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                                  const SizedBox(height: 4),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(' items', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                                      Text('RWF ', style: TextStyle(color: _primaryGreen, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              
              // Right: Order Details Panel
              Expanded(
                child: Container(
                  color: Colors.grey.shade50,
                  child: _selectedOrder == null
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey.shade300),
                              const SizedBox(height: 16),
                              Text('Select an order to view details', style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
                            ],
                          ),
                        )
                      : _buildOrderDetailsPanel(_selectedOrder!),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildModernKPI(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(color: Colors.grey.shade100, blurRadius: 4, offset: const Offset(0, 2)),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: Colors.grey.shade600, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderDetailsPanel(PrescriptionOrder order) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top Action Bar
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 16,
            runSpacing: 16,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Order ', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Placed on ', style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.print, size: 18),
                    label: const Text('Print Invoice'),
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      _showAdvanceStatusDialog(order);
                    },
                    icon: const Icon(Icons.arrow_forward),
                    label: const Text('Update Status'),
                    style: ElevatedButton.styleFrom(backgroundColor: _primaryGreen, foregroundColor: Colors.white),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Progress Kanban/Timeline
          _buildOrderTimeline(order.status),
          const SizedBox(height: 32),

          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Customer & Delivery Info
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Customer & Delivery', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      _buildInfoRow(Icons.person_outline, 'Customer', order.patientName),
                      const SizedBox(height: 12),
                      _buildInfoRow(Icons.location_on_outlined, 'Address', order.patientLocationName),
                      const SizedBox(height: 12),
                      _buildInfoRow(Icons.delivery_dining, 'Driver', order.assignedDriverName ?? 'Not Assigned Yet'),
                      if (order.prescriptionImageUrl != null) ...[
                        const SizedBox(height: 16),
                        const Text('Prescription Attached', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                      ]
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Items & Pricing
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Order Items', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      ...order.items.map((i) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          children: [
                            Container(
                              width: 40, height: 40,
                              decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
                              child: const Icon(Icons.medication, color: Colors.grey),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(i.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  Text(i.manufacturer, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                                ],
                              ),
                            ),
                            Text('RWF ', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                      )),
                      const Divider(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Subtotal', style: TextStyle(color: Colors.grey.shade600)),
                          Text('RWF '),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Delivery Fee', style: TextStyle(color: Colors.grey.shade600)),
                          Text('RWF '),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Amount', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          Text('RWF ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: _primaryGreen)),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Colors.grey.shade500),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOrderTimeline(OrderStatus status) {
    final steps = [
      {'label': 'Pending Review', 'status': OrderStatus.pendingReview},
      {'label': 'Pharmacy Accepted', 'status': OrderStatus.pharmacyAccepted},
      {'label': 'Paid', 'status': OrderStatus.readyForPickup},
      {'label': 'Out for Delivery', 'status': OrderStatus.outForDelivery},
      {'label': 'Delivered', 'status': OrderStatus.delivered},
    ];

    int currentIndex = steps.indexWhere((s) => (s['status'] as OrderStatus).index >= status.index);
    if (status == OrderStatus.cancelled) currentIndex = -1;
    if (currentIndex == -1 && status != OrderStatus.cancelled) currentIndex = steps.length - 1;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: List.generate(steps.length * 2 - 1, (index) {
            if (index % 2 != 0) {
              final stepIndex = index ~/ 2;
              final isCompleted = status != OrderStatus.cancelled && currentIndex > stepIndex;
              return Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 14),
                color: isCompleted ? _primaryGreen : Colors.grey.shade200,
              );
            } else {
              final stepIndex = index ~/ 2;
              final isCompleted = status != OrderStatus.cancelled && currentIndex >= stepIndex;
              final isActive = status != OrderStatus.cancelled && currentIndex == stepIndex;
              return SizedBox(
                width: 80,
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: isCompleted ? _primaryGreen : Colors.grey.shade200,
                      child: isCompleted ? const Icon(Icons.check, size: 16, color: Colors.white) : Text('', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      steps[stepIndex]['label'] as String,
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, fontWeight: isActive ? FontWeight.bold : FontWeight.normal, color: isCompleted ? Colors.black87 : Colors.grey.shade500)
                    ),
                  ],
                ),
              );
            }
          }),
        ),
      ),
    );
  }

    Widget _buildStatusBadge(OrderStatus status) {
    Color color;
    String label;
    switch (status) {
      case OrderStatus.pendingReview:
        color = Colors.orange;
        label = 'Pending';
        break;
      case OrderStatus.pharmacyAccepted:
      case OrderStatus.findingPharmacy:
      case OrderStatus.paymentPending:
        color = Colors.blue;
        label = 'Accepted';
        break;
      case OrderStatus.readyForPickup:
      case OrderStatus.driverAssigned:
      case OrderStatus.outForDelivery:
        color = Colors.purple;
        label = 'Dispatched';
        break;
      case OrderStatus.delivered:
        color = Colors.green;
        label = 'Delivered';
        break;
      case OrderStatus.cancelled:
        color = Colors.red;
        label = 'Cancelled';
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }

void _showAdvanceStatusDialog(PrescriptionOrder order) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Update Status'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Manually advance the state of this order.'),
            const SizedBox(height: 24),
            DropdownButtonFormField<OrderStatus>(
              value: order.status,
              decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Order Status'),
              items: OrderStatus.values.map((s) => DropdownMenuItem(value: s, child: Text(s.toString().split('.').last))).toList(),
              onChanged: (val) {},
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Status updated')));
            },
            style: ElevatedButton.styleFrom(backgroundColor: _primaryGreen, foregroundColor: Colors.white),
            child: const Text('Save'),
          )
        ],
      ),
    );
  }

// --- TAB 3: INVENTORY ---
  Widget _buildInventoryTab() {
    if (_isEditingInventoryItem) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: InventoryEditScreen(
          medicine: _editingMedicine,
          onCancel: () => setState(() => _isEditingInventoryItem = false),
          onSave: (updatedMed) {
            setState(() {
              if (_editingMedicine == null) {
                // adding a new drug, need to get a new ID in real app.
              } else {
                // update existing
              }
              _isEditingInventoryItem = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Product saved successfully',
                  style: TextStyle(color: Colors.white),
                ),
                backgroundColor: Color(0xFF1E9E68),
              ),
            );
          },
        ),
      );
    }
    final Set<String> allCategoriesSet = {'All'};
    for (var med in _inventoryList) {
      if (med.allCategories.isNotEmpty) {
        allCategoriesSet.addAll(med.allCategories);
      } else {
        allCategoriesSet.add(
          med.category.isNotEmpty ? med.category : 'Uncategorized',
        );
      }
    }

    final sortedCategories = allCategoriesSet.toList()
      ..sort((a, b) => a == 'All' ? -1 : (b == 'All' ? 1 : a.compareTo(b)));

    final filteredList = _inventoryList.where((m) {
      final q = _searchQuery.toLowerCase();
      final matchesSearch =
          _searchQuery.isEmpty ||
          m.name.toLowerCase().contains(q) ||
          m.manufacturer.toLowerCase().contains(q) ||
          m.category.toLowerCase().contains(q);

      final matchesCategory =
          _selectedCategoryFilter == 'All' ||
          m.allCategories.contains(_selectedCategoryFilter) ||
          m.category == _selectedCategoryFilter ||
          (m.category.isEmpty && _selectedCategoryFilter == 'Uncategorized');

      return matchesSearch && matchesCategory;
    }).toList();

    return Column(
      children: [
        // Filter Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          color: Colors.white,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: TextField(
                        onChanged: (val) => setState(() => _searchQuery = val),
                        decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.search, size: 20),
                          hintText: "Search stock...",
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.only(top: 8),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: _primaryGreen.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.filter_list, color: _primaryGreen),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.chevron_left, color: _primaryGreen),
                    onPressed: () {
                      _categoryScrollController.animateTo(
                        _categoryScrollController.offset - 150,
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    },
                  ),
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: ScrollConfiguration(
                        behavior: ScrollConfiguration.of(context).copyWith(
                          dragDevices: {
                            ui.PointerDeviceKind.touch,
                            ui.PointerDeviceKind.mouse,
                            ui.PointerDeviceKind.trackpad,
                          },
                        ),
                        child: ListView.builder(
                          controller: _categoryScrollController,
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          itemCount: sortedCategories.length,
                          itemBuilder: (context, index) {
                            final category = sortedCategories[index];
                            final isSelected =
                                _selectedCategoryFilter == category;
                            return Padding(
                              padding: const EdgeInsets.only(right: 12.0),
                              child: ChoiceChip(
                                label: Text(category),
                                selected: isSelected,
                                selectedColor: _primaryGreen.withOpacity(0.2),
                                backgroundColor: Colors.white,
                                elevation: isSelected ? 2 : 0,
                                pressElevation: 3,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: BorderSide(
                                    color: isSelected
                                        ? _primaryGreen
                                        : Colors.grey.shade300,
                                    width: 1,
                                  ),
                                ),
                                labelStyle: TextStyle(
                                  color: isSelected
                                      ? _primaryGreen
                                      : Colors.black87,
                                  fontWeight: isSelected
                                      ? FontWeight.bold
                                      : FontWeight.normal,
                                ),
                                onSelected: (selected) {
                                  if (selected) {
                                    setState(
                                      () => _selectedCategoryFilter = category,
                                    );
                                  }
                                },
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.chevron_right, color: _primaryGreen),
                    onPressed: () {
                      _categoryScrollController.animateTo(
                        _categoryScrollController.offset + 150,
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: filteredList.isEmpty
              ? Center(
                  child: Text(
                    "No items found",
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(24),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: MediaQuery.of(context).size.width > 1200
                        ? 3
                        : (MediaQuery.of(context).size.width > 800 ? 2 : 1),
                    mainAxisExtent: 110, // Adjusted nicely for the card
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: filteredList.length,
                  itemBuilder: (context, index) {
                    final med = filteredList[index];
                    final bool isPublished = !_unpublishedIds.contains(med.id);
                    final bool isLowStock = index % 3 == 0; // Fake logic

                    return _buildInventoryCard(med, isPublished, isLowStock);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildInventoryCard(Medicine med, bool isPublished, bool isLowStock) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      color: Colors.white,
      margin: EdgeInsets.zero,
      child: Opacity(
        opacity: isPublished ? 1.0 : 0.6,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            _showProductDetailsModal(context, med);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    width: 60,
                    height: 60,
                    color: Colors.grey.shade100,
                    child: Image.network(
                      med.imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Icon(
                        Icons.inventory_2,
                        color: Colors.grey.shade400,
                        size: 30,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        med.name,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: isPublished
                              ? Colors.black87
                              : Colors.grey.shade600,
                          decoration: !isPublished
                              ? TextDecoration.lineThrough
                              : null,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        med.manufacturer,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (!isPublished)
                        Container(
                          margin: const EdgeInsets.only(top: 4),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            "UNPUBLISHED",
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: Colors.black54,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: isLowStock
                            ? Colors.orange.shade50
                            : const Color(0xFF1E9E68).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: isLowStock
                              ? Colors.orange.withOpacity(0.3)
                              : const Color(0xFF1E9E68).withOpacity(0.3),
                        ),
                      ),
                      child: Text(
                        isLowStock ? "Low Stock" : "In Stock",
                        style: TextStyle(
                          fontSize: 10,
                          color: isLowStock
                              ? Colors.orange.shade800
                              : const Color(0xFF1E9E68),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    SizedBox(
                      width: 60,
                      child: Text(
                        "RWF ${med.price.toInt()}",
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: Colors.black87,
                        ),
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                // Replace popupmenu button
                _buildActionMenu(med, isPublished),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionMenu(Medicine med, bool isPublished) {
    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert, size: 20, color: Colors.grey.shade600),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      padding: EdgeInsets.zero,
      onSelected: (value) async {
        if (value == 'edit') {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => InventoryEditScreen(medicine: med),
            ),
          );
          if (result != null && result is Medicine) {
            setState(() {
              final index = _inventoryList.indexWhere((m) => m.id == result.id);
              if (index != -1) {
                _inventoryList[index] = result;
              }
            });
          }
        } else if (value == 'delete') {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text("Delete Product"),
              content: Text("Are you sure you want to delete '${med.name}'?"),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text(
                    "Cancel",
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _inventoryList.removeWhere((m) => m.id == med.id);
                    });
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("${med.name} deleted"),
                        backgroundColor: Colors.red,
                      ),
                    );
                  },
                  child: const Text(
                    "Delete",
                    style: TextStyle(
                      color: Colors.red,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          );
        } else if (value == 'publish') {
          setState(() {
            if (isPublished) {
              _unpublishedIds.add(med.id);
            } else {
              _unpublishedIds.remove(med.id);
            }
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                isPublished
                    ? "${med.name} unpublished"
                    : "${med.name} published",
              ),
              backgroundColor: isPublished ? Colors.grey : _primaryGreen,
              duration: const Duration(milliseconds: 1500),
            ),
          );
        }
      },
      itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
        const PopupMenuItem<String>(
          value: 'edit',
          child: Row(
            children: [
              Icon(Icons.edit, size: 18),
              SizedBox(width: 8),
              Text('Edit'),
            ],
          ),
        ),
        PopupMenuItem<String>(
          value: 'publish',
          child: Row(
            children: [
              Icon(
                isPublished ? Icons.visibility_off : Icons.visibility,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(isPublished ? 'Unpublish' : 'Publish'),
            ],
          ),
        ),
        const PopupMenuDivider(),
        const PopupMenuItem<String>(
          value: 'delete',
          child: Row(
            children: [
              Icon(Icons.delete_outline, size: 18, color: Colors.red),
              SizedBox(width: 8),
              Text('Delete', style: TextStyle(color: Colors.red)),
            ],
          ),
        ),
      ],
    );
  }

  void _showAllSessions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          builder: (_, controller) {
            final allSessions = _service.upcomingSessions;
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "All Booked Sessions",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: ListView.separated(
                      controller: controller,
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      itemCount: allSessions.length,
                      separatorBuilder: (context, index) => const Divider(),
                      itemBuilder: (context, index) {
                        final session = allSessions[index];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                            backgroundColor: _lightGreenErrors,
                            child: Text(
                              session.patientName[0],
                              style: TextStyle(color: _primaryGreen),
                            ),
                          ),
                          title: Text(
                            session.patientName,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            "${session.type}\n${session.date.toString().split(' ')[0]} at ${session.time}\nRe: ${session.notes}",
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          isThreeLine: true,
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                session.status,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: session.status == 'Confirmed'
                                      ? const Color(0xFF1E9E68)
                                      : Colors.orange,
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right,
                                size: 16,
                                color: Colors.grey,
                              ),
                            ],
                          ),
                          onTap: () {
                            Navigator.pop(context); // Close sheet
                            _showSessionDetails(session);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showSessionDetails(PharmacistBooking session) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Session Details"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _detailRow("Patient:", session.patientName),
            _detailRow("Type:", session.type),
            _detailRow(
              "Time:",
              "${session.time} (${session.date.toString().split(' ')[0]})",
            ),
            _detailRow("Status:", session.status),
            _detailRow("Notes:", session.notes),
            const SizedBox(height: 20),
            if (session.status == "Pending")
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    _service.updateBookingStatus(session.id, "Confirmed");
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Session confirmed!")),
                    );
                  },
                  icon: const Icon(Icons.check),
                  label: const Text("Confirm Session"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primaryGreen,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            if (session.status == "Confirmed")
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    _service.updateBookingStatus(session.id, "Completed");
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Session completed!")),
                    );
                  },
                  icon: const Icon(Icons.done_all),
                  label: const Text("Mark as Completed"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  _service.updateBookingStatus(session.id, "Cancelled");
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Session cancelled.")),
                  );
                },
                child: const Text(
                  "Cancel Session",
                  style: TextStyle(color: Colors.red),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Close"),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  // --- TAB 4: MORE (Profile, Logs, Settings) ---
  Widget _buildMoreTab() {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        // Profile Header
        Row(
          children: [
            CircleAvatar(
              radius: 30,
              backgroundColor: _primaryGreen.withValues(alpha: 0.1),
              child: Icon(Icons.person, color: _primaryGreen, size: 30),
            ),
            const SizedBox(width: 16),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Dr. John Doe",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                  Text(
                    "License: PH-49201-RW",
                    style: TextStyle(color: Colors.grey),
                  ),
                  // Removed arbitrary pharmacy assignment string
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 32),

        // Menu Sections
        const Text(
          "Management",
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 8),
        _buildMoreMenuItem(
          Icons.person_outline,
          "Profile Management",
          "Update your personal and professional details",
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const ProfileManagementScreen(),
              ),
            );
          },
        ),
        _buildMoreMenuItem(
          Icons.two_wheeler,
          "Fleet & Deliveries",
          "Manage drivers, assign orders, and live track routes",
          onTap: () {
            setState(() => _selectedIndex = 5);
          },
        ),
        _buildMoreMenuItem(
          Icons.history_edu,
          "System Audit Logs",
          "View detailed chain of custody and system records",
          onTap: () {
            setState(() => _selectedIndex = 6);
          },
        ),
        _buildMoreMenuItem(
          Icons.settings_outlined,
          "Pharmacy Settings",
          "Manage operating hours, notifications, and preferences",
          onTap: () {
            setState(() => _selectedIndex = 7);
          },
        ),

        const SizedBox(height: 24),
        const Text(
          "Support & Security",
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 8),
        _buildMoreMenuItem(
          Icons.help_outline,
          "Help & Support",
          "Contact system administrator",
          onTap: () {
            setState(() => _activeRightSidebar = 'help');
          },
        ),
        _buildMoreMenuItem(
          Icons.privacy_tip_outlined,
          "Privacy & Terms",
          "Read the compliance & terms of service",
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen()),
            );
          },
        ),
        _buildMoreMenuItem(
          Icons.logout,
          "Logout",
          "Sign out of your account",
          isDestructive: true,
          onTap: () {
            // Handle Logout
            showDialog(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text("Logout"),
                content: const Text("Are you sure you want to sign out?"),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text("Cancel"),
                  ),
                  TextButton(
                    onPressed: () {
                      // Pop dialog
                      Navigator.pop(ctx);
                      // Replace with AuthScreen and clear stack
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const AuthScreen()),
                        (route) => false,
                      );
                    },
                    child: const Text(
                      "Logout",
                      style: TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildMoreMenuItem(
    IconData icon,
    String title,
    String subtitle, {
    bool isDestructive = false,
    VoidCallback? onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDestructive ? Colors.red.shade100 : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade50,
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        onTap:
            onTap ??
            () {
              // Placeholder for navigation
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text("$title Screen Comming Soon")),
              );
            },
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isDestructive
                ? Colors.red.shade50
                : _primaryGreen.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: isDestructive ? Colors.red : _primaryGreen),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isDestructive ? Colors.red : Colors.black87,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(fontSize: 12, color: Colors.grey.shade800),
        ),
        trailing: Icon(Icons.chevron_right, color: Colors.grey.shade800),
      ),
    );
  }

  void _showProductDetailsModal(BuildContext context, Medicine medicine) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        String? selectedAgeRange;
        String? selectedDosage;
        return StatefulBuilder(
          builder: (context, setModalState) {
            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.8,
              minChildSize: 0.5,
              maxChildSize: 0.95,
              builder: (context, scrollController) {
                return SingleChildScrollView(
                  controller: scrollController,
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    medicine.name,
                                    style: const TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    medicine.manufacturer,
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close),
                              onPressed: () => Navigator.pop(context),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // General Product Info
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            Chip(
                              label: Text('Base Price: RWF '),
                              backgroundColor: _primaryGreen.withValues(
                                alpha: 0.1,
                              ),
                              labelStyle: TextStyle(
                                color: _primaryGreen,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (medicine.expiryDate != null &&
                                medicine.expiryDate!.isNotEmpty)
                              Chip(
                                label: Text('Expires: '),
                                backgroundColor: Colors.orange.withValues(
                                  alpha: 0.1,
                                ),
                                labelStyle: const TextStyle(
                                  color: Colors.deepOrange,
                                ),
                              ),
                            if (medicine.requiresPrescription)
                              const Chip(
                                label: Text('Rx Required'),
                                backgroundColor: Color(0xFFFFEBEE),
                                labelStyle: TextStyle(color: Colors.red),
                              ),
                            Chip(
                              label: Text(
                                medicine.category.isNotEmpty
                                    ? medicine.category
                                    : 'Uncategorized',
                              ),
                              backgroundColor: Colors.blue.withValues(
                                alpha: 0.1,
                              ),
                              labelStyle: const TextStyle(color: Colors.blue),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        if (medicine.description.isNotEmpty) ...[
                          const Text(
                            'Description',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            medicine.description,
                            style: TextStyle(
                              color: Colors.grey.shade700,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],

                        if (medicine.sideEffects.isNotEmpty) ...[
                          const Text(
                            'Side Effects',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            medicine.sideEffects,
                            style: TextStyle(
                              color: Colors.grey.shade700,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],

                        if (medicine.dosage.isNotEmpty ||
                            medicine.doseTimeInterval != null) ...[
                          const Text(
                            'Standard Dosage',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            medicine.dosage.isNotEmpty
                                ? medicine.dosage
                                : 'Interval: ',
                            style: TextStyle(
                              color: Colors.grey.shade700,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Age Range Selector
                        if (medicine.ageDosages.isNotEmpty)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Select Age Range',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: _primaryGreen,
                                ),
                              ),
                              const SizedBox(height: 12),
                              DropdownButtonFormField<String>(
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 12,
                                  ),
                                ),
                                hint: const Text('Choose age range...'),
                                value: selectedAgeRange,
                                items: medicine.ageDosages.map((ageDose) {
                                  final label = ageDose.ageRange
                                      .toString()
                                      .split('.')
                                      .last;
                                  return DropdownMenuItem<String>(
                                    value: label,
                                    child: Text(label),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  setModalState(() {
                                    selectedAgeRange = value;
                                    selectedDosage = medicine.ageDosages
                                        .firstWhere(
                                          (ad) =>
                                              ad.ageRange
                                                  .toString()
                                                  .split('.')
                                                  .last ==
                                              value,
                                        )
                                        .dosageInstructions;
                                  });
                                },
                              ),
                              if (selectedDosage != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 12),
                                  child: Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: _primaryGreen.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: _primaryGreen.withOpacity(0.3),
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Dosage Instructions',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: _primaryGreen,
                                            fontSize: 12,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          selectedDosage!,
                                          style: const TextStyle(fontSize: 13),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              const SizedBox(height: 24),
                            ],
                          ),

                        // Marketing Pharmacies List
                        if (medicine.marketingPharmacies.isNotEmpty)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Available at Pharmacies',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: _primaryGreen,
                                ),
                              ),
                              const SizedBox(height: 12),
                              ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: medicine.marketingPharmacies.length,
                                itemBuilder: (context, index) {
                                  final pharmacy =
                                      medicine.marketingPharmacies[index];
                                  final statusColor =
                                      pharmacy.stockStatus ==
                                          StockStatus.available
                                      ? Colors.green
                                      : pharmacy.stockStatus ==
                                            StockStatus.lowStock
                                      ? Colors.orange
                                      : Colors.red;
                                  final statusLabel = pharmacy.stockStatus
                                      .toString()
                                      .split('.')
                                      .last;

                                  return Card(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    child: Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  pharmacy.pharmacyName,
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 14,
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Row(
                                                  children: [
                                                    Container(
                                                      padding:
                                                          const EdgeInsets.symmetric(
                                                            horizontal: 8,
                                                            vertical: 4,
                                                          ),
                                                      decoration: BoxDecoration(
                                                        color: statusColor
                                                            .withOpacity(0.2),
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                              6,
                                                            ),
                                                      ),
                                                      child: Text(
                                                        statusLabel,
                                                        style: TextStyle(
                                                          fontSize: 12,
                                                          color: statusColor,
                                                          fontWeight:
                                                              FontWeight.bold,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                          Text(
                                            'RWF ${pharmacy.price.toStringAsFixed(0)}',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16,
                                              color: _primaryGreen,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 24),
                            ],
                          ),

                        // Edit Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _primaryGreen,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: () {
                              Navigator.pop(context);
                              setState(() {
                                _editingMedicine = medicine;
                                _isEditingInventoryItem = true;
                              });
                            },
                            child: const Text(
                              'Edit Product',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

// Custom Painter for dashed lines on the simulated map

class _DashedLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    var paint = Paint()
      ..color = Colors.blue.withValues(alpha: 0.5)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    var path = Path();
    path.moveTo(0, 0); // Start top left
    path.quadraticBezierTo(
      size.width * 0.5,
      size.height * 0.2,
      size.width,
      size.height,
    ); // Curve down to bottom right

    double dashWidth = 8.0, dashSpace = 6.0, distance = 0.0;

    // Simplistic dash implementation using PathMetrics
    for (ui.PathMetric pathMetric in path.computeMetrics()) {
      while (distance < pathMetric.length) {
        canvas.drawPath(
          pathMetric.extractPath(distance, distance + dashWidth),
          paint,
        );
        distance += dashWidth + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
