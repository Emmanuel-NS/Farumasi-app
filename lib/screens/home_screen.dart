import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/rendering.dart'; // Import for UserScrollNotification
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:farumasi_app/screens/health_tips_screen.dart';
import 'package:farumasi_app/screens/medicine_store_screen.dart'
    as store_screen;
import 'package:farumasi_app/screens/consult_chat_screen.dart'; // Direct consultation
import 'package:farumasi_app/screens/orders_screen.dart';
import 'package:farumasi_app/screens/prescriptions_screen.dart';
import 'package:farumasi_app/widgets/guest_gate.dart';
import 'package:farumasi_app/widgets/pin_gate.dart';
import 'package:farumasi_app/screens/help_screen.dart';
import 'package:farumasi_app/screens/notification_screen.dart';
import 'package:farumasi_app/screens/cart_screen.dart';
import 'package:farumasi_app/screens/profile_screen.dart';
import 'package:farumasi_app/screens/settings_screen.dart';
import 'package:farumasi_app/services/state_service.dart';
import 'package:farumasi_app/providers/auth_provider.dart';
import 'package:farumasi_app/core/router.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with SingleTickerProviderStateMixin {
  static const Color _shellGreen = Color(0xFF1E9E68); // Match category avatars
  static const Color _shellGreenDark = Color(0xFF167B51); // Darker variant

  int _currentIndex = 0;
  late List<Widget> _pages;
  late List<Widget> _pagesWide;
  bool _openPrescriptionUpload = false;
  late final AnimationController _hideBottomBarController;
  bool _isBottomBarVisible = true;
  bool _isSidebarCollapsed = false;
  double _sidebarWidth = 200.0;
  String? _activeRightSidebar;


  Widget _buildActiveRightSidebar({bool fullWidth = false}) {
    if (_activeRightSidebar == null) return const SizedBox.shrink();
    
    Widget content;
    switch (_activeRightSidebar) {
      case 'notifications':
        content = const NotificationScreen(isEmbedded: true);
        break;
      case 'cart':
        content = const CartScreen(isEmbedded: true);
        break;
      case 'help':
        content = const HelpScreen(isEmbedded: true);
        break;
      default:
        content = const SizedBox.shrink();
    }

    return Container(
      width: fullWidth ? double.infinity : 360,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(left: BorderSide(color: Colors.grey.shade200, width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(-8, 0),
          )
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _activeRightSidebar == 'cart' 
                      ? 'Your Cart' 
                      : (_activeRightSidebar == 'help' ? 'Help & Support' : 'Notifications'),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() => _activeRightSidebar = null),
                ),
              ],
            ),
          ),
          Expanded(child: content),
        ],
      ),
    );
  }

  void _goToStoreTab() => setState(() => _currentIndex = 0);

  void _rebuildPages({bool embedStoreWide = false}) {
    _pages = _buildPages(false);
    _pagesWide = _buildPages(true);
  }

  void _goToPrescriptionUpload() {
    setState(() {
      _openPrescriptionUpload = true;
      _currentIndex = 4;
      _rebuildPages();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _openPrescriptionUpload = false);
    });
  }

  List<Widget> _buildPages(bool embedStoreInShell) {
    return [
      store_screen.MedicineStoreScreen(
        key: ValueKey('store-shell-$embedStoreInShell'),
        embeddedInHomeShell: embedStoreInShell,
        onUploadPrescription: _goToPrescriptionUpload,
      ),
      const HealthTipsScreen(),
      GuestGate(
        feature: 'Consult',
        onBrowseStore: _goToStoreTab,
        child: const ConsultChatScreen(),
      ),
      GuestGate(
        feature: 'orders',
        onBrowseStore: _goToStoreTab,
        child: PinGate(
          feature: 'orders',
          child: OrdersScreen(onBrowseStore: () => setState(() => _currentIndex = 0)),
        ),
      ),
      GuestGate(
        feature: 'prescriptions',
        onBrowseStore: _goToStoreTab,
        child: PinGate(
          feature: 'prescriptions',
          child: PrescriptionsScreen(openUploadTab: _openPrescriptionUpload),
        ),
      ),
      const SettingsScreen(),
    ];
  }

  @override
  void initState() {
    super.initState();
    _pages = _buildPages(false);
    _pagesWide = _buildPages(true);
    _hideBottomBarController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
      value: 1.0, // Fully visible initially
    );

    StateService().addListener(_onStateServiceNavigation);
    // Delay location check slightly to ensure UI is ready
    Future.delayed(Duration.zero, () {
      _autoPickLocation();
    });
  }

  void _onStateServiceNavigation() {
    final tab = StateService().consumePendingHomeTab();
    if (tab == null || !mounted) return;
    final upload = StateService().consumePrescriptionUploadTab();
    setState(() {
      _currentIndex = tab;
      if (upload) _openPrescriptionUpload = true;
      _rebuildPages();
    });
    if (upload) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _openPrescriptionUpload = false);
      });
    }
  }

  @override
  void dispose() {
    StateService().removeListener(_onStateServiceNavigation);
    _hideBottomBarController.dispose();
    super.dispose();
  }

  Future<void> _autoPickLocation() async {
    // Attempt to fetch real GPS location
    try {
      if (mounted) {
        // Show a subtle snackbar or indicator if needed,
        // but for auto-pick we usually do it silently unless it fails.
      }
      await StateService().fetchRealLocation();
      debugPrint(
        "Location fetched successfully: ${StateService().userCoordinates}",
      );
    } catch (e) {
      debugPrint("Location error: $e");
      // Fallback/Demo default if permission denied or error
      if (mounted) {
        // Handle specific error cases with better UI feedback
        String errorMessage = "GPS access failed. Using default location.";

        if (e.toString().contains('Location services are disabled')) {
          errorMessage = "Please enable GPS/Location services on your device.";
        } else if (e.toString().contains('denied')) {
          errorMessage =
              "Location permission is required to detect your address.";
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: 'Settings',
              onPressed: () async {
                // Open relevant settings
                if (e.toString().contains('Location services are disabled')) {
                  await StateService().openLocationSettings();
                } else {
                  await StateService().openAppSettings();
                }
              },
            ),
          ),
        );
        StateService().setLocation(
          "Kigali, Rwanda (Default)",
          "-1.9706, 30.1044",
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isWideScreen = MediaQuery.of(context).size.width >= 600;
    final showDesktopShellHeader = isWideScreen;
    final pages = isWideScreen ? _pagesWide : _pages;

    return PopScope(
      canPop: _currentIndex == 0,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;

        setState(() {
          _currentIndex = 0;
        });
      },
      child: Scaffold(
        drawer: null,
        body: NotificationListener<UserScrollNotification>(
          onNotification: (notification) {
            if (notification.direction == ScrollDirection.reverse) {
              // User is scrolling down (content moving up) -> Hide BAR
              if (_isBottomBarVisible) {
                _hideBottomBarController.reverse();
                _isBottomBarVisible = false;
              }
            } else if (notification.direction == ScrollDirection.forward) {
              // User is scrolling up (content moving down) -> Show BAR
              if (!_isBottomBarVisible) {
                _hideBottomBarController.forward();
                _isBottomBarVisible = true;
              }
            }
            return false;
          },
          child: isWideScreen
              ? Column(
                  children: [
                    if (showDesktopShellHeader)
                      _buildDesktopShellHeader(context),
                    Expanded(
                      child: Container(
                        color: _shellGreen,
                        child: Row(
                          children: [
                            _buildPersistentSidebar(
                              context,
                              showInlineToggle: !showDesktopShellHeader,
                            ),
                            MouseRegion(
                              cursor: SystemMouseCursors.resizeLeftRight,
                              child: GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onPanUpdate: (details) {
                                  setState(() {
                                    _sidebarWidth += details.delta.dx;
                                    if (_sidebarWidth < 140) {
                                      _isSidebarCollapsed = true;
                                      _sidebarWidth =
                                          200; // default for when re-opened
                                    } else {
                                      _isSidebarCollapsed = false;
                                      if (_sidebarWidth > 400) {
                                        _sidebarWidth = 400; // max width
                                      }
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
                                        color: Colors.white.withOpacity(0.8),
                                        borderRadius: BorderRadius.circular(2),
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
                              child: LayoutBuilder(
                                builder: (context, constraints) {
                                  final bool canShowSideBySide = constraints.maxWidth >= 800; // Total width around 1200 considering left sidebar
                                  
                                  if (!canShowSideBySide && _activeRightSidebar != null) {
                                    return ClipRRect(
                                      borderRadius: const BorderRadius.only(topLeft: Radius.circular(32)),
                                      child: _buildActiveRightSidebar(fullWidth: true),
                                    );
                                  }
                                  
                                  return Row(
                                    children: [
                                      Expanded(
                                        child: AnimatedContainer(
                                          duration: const Duration(milliseconds: 300),
                                          curve: Curves.easeInOutCubic,
                                          margin: EdgeInsets.only(
                                            right: (_activeRightSidebar != null && canShowSideBySide) ? 12.0 : 0.0,
                                          ),
                                          child: ClipRRect(
                                            borderRadius: BorderRadius.only(
                                              topLeft: const Radius.circular(32),
                                              topRight: (_activeRightSidebar != null && canShowSideBySide) 
                                                  ? const Radius.circular(24) 
                                                  : Radius.zero,
                                              bottomRight: Radius.zero,
                                            ),
                                            child: Container(
                                              color: const Color(0xFFF6F8FB),
                                              child: IndexedStack(
                                                index: _currentIndex,
                                                children: pages,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                      AnimatedSize(
                                        duration: const Duration(milliseconds: 300),
                                        curve: Curves.easeInOutCubic,
                                        child: (_activeRightSidebar != null && canShowSideBySide)
                                            ? ClipRRect(
                                                borderRadius: const BorderRadius.only(
                                                  topLeft: Radius.circular(24),
                                                  topRight: Radius.circular(24),
                                                ),
                                                child: _buildActiveRightSidebar(fullWidth: false),
                                              )
                                            : const SizedBox.shrink(),
                                      ),
                                    ],
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                )
              : IndexedStack(
                  index: _currentIndex,
                  children: pages,
                ),
        ),
        floatingActionButton: isWideScreen
            ? null
            : ScaleTransition(
                scale: _hideBottomBarController,
                child: SizedBox(
                  height: 70,
                  width: 70,
                  child: FloatingActionButton(
                    backgroundColor: Colors.white,
                    elevation: 4,
                    shape: const CircleBorder(),
                    onPressed: _goToPrescriptionUpload,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.document_scanner_outlined,
                          color: Color(0xFF1E9E68),
                          size: 28,
                        ),
                        const Text(
                          "Upload Rx",
                          style: TextStyle(
                            color: Color(0xFF1E9E68),
                            fontWeight: FontWeight.bold,
                            fontSize: 8,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
        floatingActionButtonLocation: isWideScreen
            ? FloatingActionButtonLocation.endFloat
            : FloatingActionButtonLocation.centerDocked,
        bottomNavigationBar: isWideScreen
            ? null
            : SizeTransition(
                sizeFactor: _hideBottomBarController,
                axisAlignment: -1.0,
                child: BottomAppBar(
                  color: const Color(0xFF1E9E68),
                  shape: const CircularNotchedRectangle(),
                  notchMargin: 8.0,
                  child: SizedBox(
                    height: 60,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildNavItem(Icons.store, 'Home', 0),
                        _buildNavItem(Icons.health_and_safety, 'Health', 1),
                        const SizedBox(width: 48), // Gap for FAB
                        _buildNavItem(
                          Icons.chat_bubble_outline,
                          'Consult',
                          2,
                        ),
                        _buildNavItem(Icons.history, 'Orders', 3),
                      ],
                    ),
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildNavItem(
    IconData icon,
    String label,
    int index, {
    bool isCart = false,
  }) {
    final isLoggedIn = ref.read(authProvider).status == AuthStatus.authenticated;
    final isRestricted =
        (index == 2 || index == 3) && !isLoggedIn;

    final isSelected = _currentIndex == index;
    final color = isSelected ? Colors.white : Colors.white70;

    Widget iconWidget = Icon(icon, color: color, size: 28);

    if (isCart) {
      final itemCount = StateService().cartItems.length;
      if (itemCount > 0) {
        iconWidget = Badge(
          label: Text(itemCount.toString()),
          backgroundColor: Colors.redAccent,
          textColor: Colors.white,
          padding: EdgeInsets.symmetric(horizontal: 6),
          child: iconWidget,
        );
      }
    }

    return InkWell(
      onTap: () {
        if (index == _currentIndex) return;

        setState(() {
          _currentIndex = index;
        });
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                iconWidget,
                if (isRestricted)
                  const Positioned(
                    right: -2,
                    bottom: -2,
                    child: Icon(
                      Icons.lock,
                      size: 10,
                      color: Colors.white70,
                    ),
                  ),
              ],
            ),
            Text(
              label,
              style: TextStyle(
                color: isRestricted ? Colors.white54 : color,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context,
    IconData icon,
    String label,
    int index, {
    bool restricted = false,
    String? restrictedMessage,
    bool closeDrawerOnTap = true,
    bool collapsed = false,
    VoidCallback? onTapOverride,
  }) {
    final selected = _currentIndex == index;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        collapsed ? 8 : 10,
        6,
        collapsed ? 8 : 10,
        0,
      ),
      child: Tooltip(
        message: restricted ? '$label (Login required)' : label,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () {
              if (closeDrawerOnTap && Navigator.canPop(context)) {
                Navigator.pop(context);
              }
              if (restricted) {
                return;
              }
              if (onTapOverride != null) {
                onTapOverride();
              } else {
                setState(() => _currentIndex = index);
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: EdgeInsets.symmetric(
                horizontal: collapsed ? 0 : 10,
                vertical: 9,
              ),
              decoration: BoxDecoration(
                color: restricted
                    ? Colors.transparent
                    : (selected ? const Color(0x3347D196) : Colors.transparent),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: restricted
                      ? Colors.transparent
                      : (selected
                            ? const Color(0x6647D196)
                            : const Color(0x00000000)),
                ),
              ),
              child: Opacity(
                opacity: restricted ? 0.4 : 1,
                child: Row(
                mainAxisAlignment: collapsed
                    ? MainAxisAlignment.center
                    : MainAxisAlignment.start,
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: selected
                          ? const Color(0xFF47D196)
                          : const Color(0x3347D196),
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: Icon(
                      icon,
                      size: 18,
                      color: selected ? const Color(0xFF0A2B1E) : Colors.white,
                    ),
                  ),
                  if (!collapsed) ...[
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        label,
                        style: TextStyle(
                          fontWeight: selected
                              ? FontWeight.w700
                              : FontWeight.w500,
                          color: restricted
                              ? const Color(0xFF96B3A7)
                              : (selected
                                    ? const Color(0xFFEFFBF5)
                                    : const Color(0xFFD2E8DE)),
                        ),
                      ),
                    ),
                    if (restricted)
                      const Icon(
                        Icons.lock_outline,
                        size: 16,
                        color: Color(0xFF96B3A7),
                      )
                    else if (selected)
                      const Icon(
                        Icons.chevron_right,
                        size: 18,
                        color: Color(0xFFBFECD8),
                      ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    ),
    );
  }

  Widget _buildPersistentSidebar(
    BuildContext context, {
    bool showInlineToggle = true,
  }) {
    final authState = ref.watch(authProvider);
    final isLoggedIn = authState.status == AuthStatus.authenticated;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      width: _isSidebarCollapsed ? 92 : _sidebarWidth,
      clipBehavior: Clip.antiAlias,
      decoration: const BoxDecoration(
        color: _shellGreen,
        borderRadius: BorderRadius.zero,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (showInlineToggle)
            Padding(
              padding: EdgeInsets.fromLTRB(
                _isSidebarCollapsed ? 8 : 12,
                8,
                _isSidebarCollapsed ? 8 : 12,
                0,
              ),
              child: SizedBox(
                height: 40,
                child: Material(
                  color: _shellGreenDark,
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () {
                      setState(
                        () => _isSidebarCollapsed = !_isSidebarCollapsed,
                      );
                    },
                    child: Row(
                      mainAxisAlignment: _isSidebarCollapsed
                          ? MainAxisAlignment.center
                          : MainAxisAlignment.spaceBetween,
                      children: [
                        if (!_isSidebarCollapsed)
                          const Padding(
                            padding: EdgeInsets.only(left: 12),
                            child: Text(
                              'Navigation',
                              style: TextStyle(
                                color: Color(0xFFD2E8DE),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        Padding(
                          padding: EdgeInsets.only(
                            right: _isSidebarCollapsed ? 0 : 8,
                          ),
                          child: Icon(
                            _isSidebarCollapsed ? Icons.menu_open : Icons.menu,
                            color: const Color(0xFFEFFBF5),
                            size: 20,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 10),
          _buildDrawerItem(
            context,
            Icons.store,
            'Home',
            0,
            closeDrawerOnTap: false,
            collapsed: _isSidebarCollapsed,
          ),
          _buildDrawerItem(
            context,
            Icons.health_and_safety,
            'Health',
            1,
            closeDrawerOnTap: false,
            collapsed: _isSidebarCollapsed,
          ),
          _buildDrawerItem(
            context,
            Icons.chat_bubble_outline,
            'Consult',
            2,
            restricted: !isLoggedIn,
            restrictedMessage: 'Please log in to consult a pharmacist.',
            closeDrawerOnTap: false,
            collapsed: _isSidebarCollapsed,
          ),
          _buildDrawerItem(
            context,
            Icons.history,
            'Orders',
            3,
            restricted: !isLoggedIn,
            restrictedMessage: 'Please log in to view your orders.',
            closeDrawerOnTap: false,
            collapsed: _isSidebarCollapsed,
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              _isSidebarCollapsed ? 10 : 18,
              14,
              _isSidebarCollapsed ? 10 : 18,
              4,
            ),
            child: const Divider(color: Color(0xFF2A6A53), height: 1),
          ),
          _buildDrawerItem(
            context,
            Icons.description_outlined,
            'Prescriptions',
            4,
            restricted: !isLoggedIn,
            closeDrawerOnTap: false,
            collapsed: _isSidebarCollapsed,
          ),
          const Spacer(),
          _buildDrawerItem(
            context,
            Icons.notifications_outlined,
            'Notifications',
            -1,
            restricted: false,
            closeDrawerOnTap: true,
            collapsed: _isSidebarCollapsed,
            onTapOverride: () {
              final wide = MediaQuery.sizeOf(context).width >= 600;
              if (wide) {
                setState(() {
                  _activeRightSidebar =
                      _activeRightSidebar == 'notifications' ? null : 'notifications';
                });
              } else {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const NotificationScreen()),
                );
              }
            },
          ),
          if (isLoggedIn)
            _buildDrawerItem(
              context,
              Icons.logout,
              'Logout',
              6,
              restricted: false,
              closeDrawerOnTap: false,
              collapsed: _isSidebarCollapsed,
              onTapOverride: () {
                ref.read(authProvider.notifier).logout();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Logged out successfully')),
                );
              },
            )
          else
            _buildDrawerItem(
              context,
              Icons.login,
              'Sign In',
              6,
              restricted: false,
              closeDrawerOnTap: false,
              collapsed: _isSidebarCollapsed,
              onTapOverride: () => context.go(AppRoutes.auth),
            ),
          if (!_isSidebarCollapsed)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: TextButton(
                  onPressed: () async {
                    final u = Uri.parse('https://example.com/terms');
                    if (await canLaunchUrl(u)) {
                      await launchUrl(u);
                    }
                  },
                  child: const Text(
                    'Terms & Conditions',
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
        ],
      ),
    );
  }

  Widget _buildDesktopShellHeader(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoggedIn = authState.status == AuthStatus.authenticated;
    final userName = authState.user?.name ?? authState.user?.email ?? 'Guest';

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
            onPressed: () {
              setState(() {
                _isSidebarCollapsed = !_isSidebarCollapsed;
              });
            },
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
              'Farumasi',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
              ),
            ),
          const Spacer(),
          // SEARCH BAR
          Flexible(
            flex: 3,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 500),
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black12,
                      blurRadius: 4,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: TextField(
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 14,
                  ),
                  onChanged: (val) {
                    StateService().setSearchQuery(val);
                  },
                  decoration: InputDecoration(
                    hintText: 'Search medicines, symptoms, categories...',
                    hintStyle: const TextStyle(
                      color: Colors.grey,
                      fontSize: 14,
                    ),
                    prefixIcon: const Icon(
                      Icons.search,
                      color: Colors.grey,
                      size: 20,
                    ),
                    suffixIcon: IconButton(
                      icon: const Icon(
                        Icons.tune,
                        color: Color(0xFF1E9E68),
                        size: 20,
                      ),
                      onPressed: () {
                        StateService().showFilterModal();
                      },
                      tooltip: 'Sort & Filter',
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const Spacer(),
          _buildShellHeaderIcon(
            icon: Icons.help_outline,
            tooltip: 'Help',
            onTap: () {
              setState(() {
                _activeRightSidebar = _activeRightSidebar == 'help' ? null : 'help';
              });
            },
          ),
          const SizedBox(width: 8),
          ListenableBuilder(
            listenable: StateService(),

            builder: (context, _) {
              final cartCount = StateService().cartItems.length;

              return Stack(
                clipBehavior: Clip.none,

                children: [
                  _buildShellHeaderIcon(
                    icon: Icons.shopping_cart_outlined,
                    tooltip: 'Cart',
                    onTap: () {
                      setState(() {
                        _activeRightSidebar = _activeRightSidebar == 'cart' ? null : 'cart';
                      });
                    },
                  ),
                  if (cartCount > 0)
                    Positioned(
                      right: -2,
                      top: -2,
                      child: CircleAvatar(
                        radius: 8,
                        backgroundColor: Colors.red,
                        child: Text(
                          '$cartCount',
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
          const SizedBox(width: 16),
          if (isLoggedIn) ...[
            _buildShellHeaderIcon(
              icon: Icons.settings_outlined,
              tooltip: 'Settings',
              onTap: () => setState(() => _currentIndex = 5),
            ),
            const SizedBox(width: 12),
            PopupMenuButton<String>(
              offset: const Offset(0, 48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 8,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: const Color(0xFF2B7C5E),
                    child: Text(
                      userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFEFFBF5),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.arrow_drop_down,
                    color: Colors.white,
                    size: 22,
                  ),
                ],
              ),
              onSelected: (value) {
                if (value == 'profile') {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ProfileScreen()),
                  );
                } else if (value == 'logout') {
                  ref.read(authProvider.notifier).logout();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Logged out successfully")),
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
                        'Hello, $userName',
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
            ),
          ] else ...[
            TextButton(
              style: TextButton.styleFrom(
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              onPressed: () => context.go(AppRoutes.auth),
              child: const Text(
                'Log In',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: _shellGreen,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                elevation: 0,
              ),
              onPressed: () => context.go(AppRoutes.auth),
              child: const Text(
                'Sign Up',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
          const SizedBox(width: 24),
        ],
      ),
    );
  }

  Widget _buildShellHeaderIcon({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(10.0),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
        ),
      ),
    );
  }
}
