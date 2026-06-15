import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart'; // Import for UserScrollNotification
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:farumasi_app/screens/health_tips_screen.dart';
import 'package:farumasi_app/widgets/farumasi_logo.dart';
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
import 'package:farumasi_app/screens/terms_conditions_screen.dart';
import 'package:farumasi_app/services/state_service.dart';
import 'package:farumasi_app/services/app_lifecycle_service.dart';
import 'package:farumasi_app/services/notification_service.dart';
import 'package:farumasi_app/providers/auth_provider.dart';
import 'package:farumasi_app/core/router.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _ShellPayload {
  final int index;
  final List<Widget> pages;
  const _ShellPayload(this.index, this.pages);
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
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
  final Set<int> _mountedTabs = {0, 1, 2, 3, 4, 5};

  /// Nested navigator key — keeps topbar/sidebar visible on wide screens
  /// while sub-screens (order detail, product detail, etc.) push within
  /// the content card instead of covering the entire viewport.
  final GlobalKey<NavigatorState> _contentNavKey = GlobalKey<NavigatorState>();
  late ValueNotifier<_ShellPayload> _shellPayload;


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
                      ? 'Checkout'
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

  void _goToStoreTab() => _selectTab(0);

  void _selectTab(int index) {
    // When switching tabs on wide screen, pop any pushed sub-screens so the
    // new tab starts from its root (not a stale detail route).
    if (_contentNavKey.currentState?.canPop() == true) {
      _contentNavKey.currentState!.popUntil((route) => route.isFirst);
    }
    setState(() {
      _currentIndex = index;
      _mountedTabs.add(index);
      _shellPayload.value = _ShellPayload(index, _pagesWide);
      if (index == 2 || index == 4) {
        if (!_isBottomBarVisible) {
          _hideBottomBarController.forward();
          _isBottomBarVisible = true;
        }
      }
    });
  }

  void _rebuildPages({bool embedStoreWide = false}) {
    _pages = _buildPages(false);
    _pagesWide = _buildPages(true);
    _shellPayload.value = _ShellPayload(_currentIndex, _pagesWide);
  }

  void _goToPrescriptionUpload() {
    setState(() {
      _openPrescriptionUpload = true;
      _currentIndex = 4;
      _shellPayload.value = _ShellPayload(4, _pagesWide);
      _rebuildPages();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _openPrescriptionUpload = false);
    });
  }

  List<Widget> _buildPages(bool embedStoreInShell) {
    Widget pageFor(int index) {
      switch (index) {
        case 0:
          return store_screen.MedicineStoreScreen(
            key: ValueKey('store-shell-$embedStoreInShell'),
            embeddedInHomeShell: embedStoreInShell,
            onUploadPrescription: _goToPrescriptionUpload,
          );
        case 1:
          return const HealthTipsScreen();
        case 2:
          return GuestGate(
            feature: 'Consult',
            onBrowseStore: _goToStoreTab,
            child: const ConsultChatScreen(),
          );
        case 3:
          return GuestGate(
            feature: 'orders',
            onBrowseStore: _goToStoreTab,
            child: PinGate(
              feature: 'orders',
              child: OrdersScreen(onBrowseStore: _goToStoreTab),
            ),
          );
        case 4:
          return GuestGate(
            feature: 'prescriptions',
            onBrowseStore: _goToStoreTab,
            child: PinGate(
              feature: 'prescriptions',
              child: PrescriptionsScreen(openUploadTab: _openPrescriptionUpload),
            ),
          );
        case 5:
          return SettingsScreen(onBack: () => _selectTab(0));
        default:
          return const SizedBox.shrink();
      }
    }

    return List.generate(6, (index) {
      if (!_mountedTabs.contains(index)) {
        return SizedBox.shrink(key: ValueKey('tab-placeholder-$index'));
      }
      return _KeepAliveTab(
        key: ValueKey('tab-$index-$embedStoreInShell'),
        child: pageFor(index),
      );
    });
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    AppLifecycleService.instance.addListener(_onAppLifecycleChanged);
    _pages = _buildPages(false);
    _pagesWide = _buildPages(true);
    _shellPayload = ValueNotifier(_ShellPayload(0, _pagesWide));
    _hideBottomBarController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
      value: 1.0, // Fully visible initially
    );

    StateService().addListener(_onStateServiceNavigation);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!AppLifecycleService.instance.isInForeground) return;
      final auth = ref.read(authProvider);
      if (auth.status == AuthStatus.authenticated) {
        NotificationService().configurePolling(
          isAuthenticated: () =>
              ref.read(authProvider).status == AuthStatus.authenticated,
          userId: () => ref.read(authProvider).user?.id,
        );
        NotificationService().refreshFromApi();
        NotificationService().refreshConsultMessagePushes(
          myUserId: auth.user?.id,
        );
      }
    });
  }

  void _onAppLifecycleChanged() {
    if (!mounted) return;
    if (AppLifecycleService.instance.isInForeground) {
      final auth = ref.read(authProvider);
      if (auth.status == AuthStatus.authenticated) {
        NotificationService().startPolling();
        NotificationService().refreshFromApi();
        NotificationService().refreshConsultMessagePushes(
          myUserId: auth.user?.id,
        );
      }
    } else {
      // Keep polling while process is alive so consult pushes still arrive.
      NotificationService().startPolling();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      // Polling continues in NotificationService for background pushes.
    } else if (state == AppLifecycleState.resumed) {
      final auth = ref.read(authProvider);
      if (auth.status == AuthStatus.authenticated) {
        NotificationService().refreshFromApi();
        NotificationService().refreshConsultMessagePushes(
          myUserId: auth.user?.id,
        );
      }
    }
  }

  void _onStateServiceNavigation() {
    final tab = StateService().consumePendingHomeTab();
    if (tab == null || !mounted) return;
    final upload = StateService().consumePrescriptionUploadTab();
    _selectTab(tab);
    if (upload) {
      setState(() {
        _openPrescriptionUpload = true;
        _rebuildPages();
      });
    }
    if (upload) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _openPrescriptionUpload = false);
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    AppLifecycleService.instance.removeListener(_onAppLifecycleChanged);
    NotificationService().stopPolling();
    StateService().removeListener(_onStateServiceNavigation);
    _hideBottomBarController.dispose();
    _shellPayload.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isWideScreen = MediaQuery.of(context).size.width >= 600;
    final showDesktopShellHeader = isWideScreen;
    final pages = isWideScreen ? _pagesWide : _pages;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        // On wide screen, let the nested content navigator handle back first.
        if (isWideScreen && (_contentNavKey.currentState?.canPop() == true)) {
          _contentNavKey.currentState!.pop();
          return;
        }
        if (_currentIndex != 0) {
          _selectTab(0);
        }
      },
      child: Scaffold(
        drawer: null,
        body: NotificationListener<UserScrollNotification>(
          onNotification: (notification) {
            if (_currentIndex == 2 || _currentIndex == 4) return false;
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
                              child: Navigator(
                                key: _contentNavKey,
                                onGenerateRoute: (settings) => MaterialPageRoute(
                                  settings: settings,
                                  builder: (_) => ValueListenableBuilder<_ShellPayload>(
                                    valueListenable: _shellPayload,
                                    builder: (_, payload, __) => IndexedStack(
                                      index: payload.index,
                                      children: payload.pages,
                                    ),
                                  ),
                                ),
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

        _selectTab(index);
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
                _selectTab(index);
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
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
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
              ],
            ),
          ),
          if (!isLoggedIn)
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
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
              child: Center(
                child: TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const TermsConditionsScreen(),
                      ),
                    );
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
          const FarumasiLogo(
            size: 26,
            color: Colors.white,
            onDark: true,
          ),
          const SizedBox(width: 10),
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                'FARUMASI',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: MediaQuery.sizeOf(context).width >= 900 ? 26 : 22,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.4,
                ),
              ),
            ),
          ),
          const Spacer(),
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
            isActive: _activeRightSidebar == 'help',
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
                    isActive: _activeRightSidebar == 'cart',
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
            ListenableBuilder(
              listenable: NotificationService(),
              builder: (context, _) {
                return PopupMenuButton<String>(
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
                } else if (value == 'notifications') {
                  setState(() {
                    _activeRightSidebar =
                        _activeRightSidebar == 'notifications' ? null : 'notifications';
                  });
                } else if (value == 'settings') {
                  _selectTab(5);
                } else if (value == 'logout') {
                  ref.read(authProvider.notifier).logout();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Logged out successfully")),
                  );
                }
              },
              itemBuilder: (BuildContext context) {
                final unreadCount = NotificationService().unreadCount;
                return [
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
                PopupMenuItem(
                  value: 'notifications',
                  child: Row(
                    children: [
                      const Icon(
                        Icons.notifications_outlined,
                        color: Color(0xFF1E9E68),
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      const Text('Notifications'),
                      if (unreadCount > 0) ...[
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            unreadCount > 9 ? '9+' : '$unreadCount',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
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
              ];
              },
            );
              },
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
    bool isActive = false,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.all(10.0),
            decoration: BoxDecoration(
              color: isActive ? Colors.white.withValues(alpha: 0.22) : null,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
        ),
      ),
    );
  }
}

/// Keeps tab subtree alive when switching bottom-nav items (WhatsApp-style retention).
class _KeepAliveTab extends StatefulWidget {
  const _KeepAliveTab({super.key, required this.child});

  final Widget child;

  @override
  State<_KeepAliveTab> createState() => _KeepAliveTabState();
}

class _KeepAliveTabState extends State<_KeepAliveTab>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}
