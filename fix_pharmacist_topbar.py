import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

# Add import for store screen
text = text.replace("import '../auth_screen.dart';", "import '../auth_screen.dart';\nimport '../medicine_store_screen.dart' as store_screen;")

# Hide header conditionally
text = text.replace(
    '                    _buildHeader(),\n                    Expanded(',
    '                    if (!isWebWide) _buildHeader(),\n                    Expanded('
)

# Replace _buildDesktopShellHeader and _buildPersistentSidebar and _buildDrawerItem
new_methods = '''  Widget _buildDesktopShellHeader(BuildContext context) {
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
          TextButton.icon(
            icon: const Icon(Icons.help_outline, color: Colors.white70, size: 20),
            label: const Text('Help & Support', style: TextStyle(color: Colors.white70)),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpPrivacyScreen())),
          ),
          TextButton.icon(
            icon: const Icon(Icons.privacy_tip_outlined, color: Colors.white70, size: 20),
            label: const Text('Privacy & Terms', style: TextStyle(color: Colors.white70)),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpPrivacyScreen())),
          ),
          const SizedBox(width: 8),
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_none, color: Colors.white),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const PharmacistNotificationsScreen()),
                  );
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

pattern = r'  Widget _buildDesktopShellHeader.*?Widget _buildOverviewTab\(\) \{'
text = re.sub(pattern, new_methods + '  Widget _buildOverviewTab() {', text, flags=re.DOTALL)

with open(file, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updates applied")
