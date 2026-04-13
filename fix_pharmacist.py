import re

out = []
file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'

with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

# Add missing state variables
state_vars = '''
  int _selectedIndex = 0;
  bool _isSidebarCollapsed = false;
  double _sidebarWidth = 200.0;
  static const Color _shellGreen = Color(0xFF1E9E68);
  static const Color _shellGreenDark = Color(0xFF167B51);
'''
text = re.sub(r'  int _selectedIndex = 0;', state_vars, text)

# Replace the isWebWide conditional block
is_web_wide_pattern = r'              if \(isWebWide\) \{.*?(?=\n                // Mobile Layout)'
web_wide_replacement = '''              if (isWebWide) {
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
                                  child: Scaffold(
                                    backgroundColor: _bgWhite,
                                    body: contentArea,
                                    floatingActionButton: fab,
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
              }'''

new_text = re.sub(is_web_wide_pattern, web_wide_replacement, text, flags=re.DOTALL)

# Delete existing _buildWebSidebarItem
build_web_sidebar_item_pattern = r'  Widget _buildWebSidebarItem.*?\}'
new_text = re.sub(build_web_sidebar_item_pattern, '', new_text, flags=re.DOTALL)

# Insert _buildDesktopShellHeader and _buildPersistentSidebar and _buildDrawerItem before _buildOverviewTab
# _buildOverviewTab is the first builder inside the children list
insert_pos = new_text.find('  Widget _buildOverviewTab() {')

drawer_methods = '''
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
          const Icon(Icons.local_pharmacy, color: Colors.white, size: 28),
          const SizedBox(width: 10),
          const Text('Farumasi Pharmacist', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w600, letterSpacing: 1.0)),
          const Spacer(),
          IconButton(icon: const Icon(Icons.notifications_none, color: Colors.white), onPressed: () {}),
          const SizedBox(width: 8),
          const CircleAvatar(radius: 18, backgroundColor: Colors.white24, child: Icon(Icons.person, color: Colors.white, size: 20)),
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
          _buildDrawerItem(context, Icons.more_horiz_outlined, Icons.more_horiz, "More", 4),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(BuildContext context, IconData iconUnselected, IconData iconSelected, String label, int index) {
    final selected = _selectedIndex == index;
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
            onTap: () => setState(() => _selectedIndex = index),
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

new_text = new_text[:insert_pos] + drawer_methods + new_text[insert_pos:]

with open(file, 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Pharmacist layout substituted")

