import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

# Add missing state variables to the state class
state_vars = '''  int _selectedIndex = 0;
  bool _isSidebarCollapsed = false;
  double _sidebarWidth = 200.0;
  static const Color _shellGreen = Color(0xFF1E9E68);
'''
text = re.sub(r'  int _selectedIndex = 0;', state_vars, text)

# Add medicine_store_screen import if not present
if "import '../medicine_store_screen.dart'" not in text:
    text = text.replace("import '../auth_screen.dart';", "import '../auth_screen.dart';\nimport '../medicine_store_screen.dart' as store_screen;")

# Find where the PopScope starts and _buildHeader starts
popscope_pattern = r'          return PopScope\(.*?                \],\n              \),\n            \);\n          \},\n        \),\n      \);\n    \}'

new_layout = '''          return LayoutBuilder(
            builder: (context, constraints) {
              final bool isWebWide = constraints.maxWidth >= 900;
              final contentArea = Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1100), child: Column(
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
                      ],
                    ),
                  ),
                ],
              )));
              
              final fab = _selectedIndex == 3
                  ? FloatingActionButton.extended(
                      backgroundColor: _primaryGreen,
                      icon: const Icon(Icons.add, color: Colors.white),
                      label: const Text("New Product", style: TextStyle(color: Colors.white)),
                      onPressed: () async {
                        final result = await Navigator.push(context, MaterialPageRoute(builder: (c) => const InventoryEditScreen()));
                        if (result != null && result is Medicine) setState(() => _inventoryList.insert(0, result));
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
                                        if (_sidebarWidth > 400) _sidebarWidth = 400;
                                      }
                                    });
                                  },
                                  child: Container(
                                    width: 14, color: Colors.transparent,
                                    child: Center(
                                      child: Container(
                                        width: 4, height: 36,
                                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.8), borderRadius: BorderRadius.circular(2)),
                                        child: const Column(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [Icon(Icons.circle, size: 2, color: Colors.white),Icon(Icons.circle, size: 2, color: Colors.white),Icon(Icons.circle, size: 2, color: Colors.white)]),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: const BorderRadius.only(topLeft: Radius.circular(16)),
                                  child: Scaffold(backgroundColor: _bgWhite, body: contentArea, floatingActionButton: fab),
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
                    unselectedItemColor: Colors.grey.shade400,
                    showSelectedLabels: true,
                    showUnselectedLabels: true,
                    selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    unselectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                    items: const [
                      BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: "Overview"),
                      BottomNavigationBarItem(icon: Icon(Icons.assignment_outlined), activeIcon: Icon(Icons.assignment), label: "Requests"),
                      BottomNavigationBarItem(icon: Icon(Icons.shopping_bag_outlined), activeIcon: Icon(Icons.shopping_bag), label: "Orders"),
                      BottomNavigationBarItem(icon: Icon(Icons.inventory_2_outlined), activeIcon: Icon(Icons.inventory_2), label: "Stock"),
                      BottomNavigationBarItem(icon: Icon(Icons.more_horiz_outlined), activeIcon: Icon(Icons.more_horiz), label: "More"),
                    ],
                  ),
                ),
              );
            },
          );
        },
      );
    }'''
text = re.sub(popscope_pattern, new_layout, text, flags=re.DOTALL)

# Add sidebar methods before _buildOverviewTab
desktop_methods = '''

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
            onPressed: () => setState(() => _isSidebarCollapsed = !_isSidebarCollapsed),
          ),
          const SizedBox(width: 6),
          const store_screen.FarumasiLogo(size: 26, color: Colors.white, onDark: true),
          const SizedBox(width: 10),
          if (MediaQuery.of(context).size.width > 800)
            const Text('Farumasi Pharmacist', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w600, letterSpacing: 1.0)),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.help_outline, color: Colors.white70, size: 24),
            tooltip: 'Help & Support',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpCenterScreen())),
          ),
          const SizedBox(width: 8),
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.chat_bubble_outline, color: Colors.white, size: 24),
                tooltip: 'Consulting',
                onPressed: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const PharmacistChatScreen()));
                }
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                  child: const Text("1", style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
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
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const PharmacistNotificationsScreen()));
                }
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                  child: const Text("3", style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'profile') {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileManagementScreen()));
              } else if (value == 'logout') {
                Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
              }
            },
            offset: const Offset(0, 48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: const CircleAvatar(radius: 18, backgroundColor: Colors.white24, child: Icon(Icons.person, color: Colors.white, size: 20)),
            itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
              const PopupMenuItem<String>(value: 'profile', child: ListTile(leading: Icon(Icons.person_outline), title: Text('Profile Management'), contentPadding: EdgeInsets.zero)),
              const PopupMenuItem<String>(value: 'logout', child: ListTile(leading: Icon(Icons.logout, color: Colors.red), title: Text('Logout', style: TextStyle(color: Colors.red)), contentPadding: EdgeInsets.zero)),
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
      decoration: const BoxDecoration(color: _shellGreen, borderRadius: BorderRadius.zero),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          _buildDrawerItem(context, Icons.dashboard_outlined, Icons.dashboard, "Overview", 0),
          _buildDrawerItem(context, Icons.assignment_outlined, Icons.assignment, "Requests", 1),
          _buildDrawerItem(context, Icons.shopping_bag_outlined, Icons.shopping_bag, "Orders", 2),
          _buildDrawerItem(context, Icons.inventory_2_outlined, Icons.inventory_2, "Stock", 3),
          const Divider(color: Colors.white24, height: 32, thickness: 1),
          _buildDrawerItem(context, Icons.two_wheeler_outlined, Icons.two_wheeler, "Fleet", 4, 
            onTapOverride: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PharmacistDeliveryManagementScreen())),
          ),
          _buildDrawerItem(context, Icons.history_edu_outlined, Icons.history_edu, "Audit Logs", 5,
            onTapOverride: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SystemAuditLogsScreen())),
          ),
          _buildDrawerItem(context, Icons.settings_outlined, Icons.settings, "Settings", 6,
            onTapOverride: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PharmacySettingsScreen())),
          ),
          const Spacer(),
          _buildDrawerItem(context, Icons.logout, Icons.logout, "Logout", 7,
            onTapOverride: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AuthScreen())),
          ),
          if (!_isSidebarCollapsed)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: TextButton(
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen()));
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
    );
  }

  Widget _buildDrawerItem(BuildContext context, IconData iconUnselected, IconData iconSelected, String label, int index, {VoidCallback? onTapOverride}) {
    final selected = _selectedIndex == index && onTapOverride == null;
    final collapsed = _isSidebarCollapsed;
    final icon = selected ? iconSelected : iconUnselected;
    return Padding(
      padding: EdgeInsets.fromLTRB(collapsed ? 8 : 10, 6, collapsed ? 8 : 10, 0),
      child: Tooltip(
        message: label,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onTapOverride ?? () => setState(() => _selectedIndex = index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: EdgeInsets.symmetric(horizontal: collapsed ? 0 : 10, vertical: 9),
              decoration: BoxDecoration(
                color: selected ? const Color(0x3347D196) : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: collapsed ? MainAxisAlignment.center : MainAxisAlignment.start,
                children: [
                  Icon(icon, color: selected ? Colors.white : const Color(0xFFD2E8DE), size: 28),
                  if (!collapsed) ...[
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        label,
                        style: TextStyle(
                          color: selected ? Colors.white : const Color(0xFFD2E8DE),
                          fontSize: 16,
                          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
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
'''

if '_buildDesktopShellHeader' not in text:
    insert_pos = text.find('  Widget _buildHeader() {')
    text = text[:insert_pos] + desktop_methods + '\n' + text[insert_pos:]

with open(file, 'w', encoding='utf-8') as f:
    f.write(text)

print("Restored Desktop Layout perfectly")
