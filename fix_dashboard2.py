import re

def update_file():
    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
        text = f.read()

    # Expand Titles
    new_titles = '''  final List<String> _titles = [
    "Overview",
    "Requests",
    "Orders",
    "Inventory",
    "More",
    "Fleet Management",
    "Audit Logs",
    "Settings",
    "Help & Support",
    "Consulting",
    "Notifications",
  ];'''
    text = re.sub(r'  final List<String> _titles = \[.*?\];', new_titles, text, flags=re.DOTALL)

    # Expand indexed array
    old_children = '''                            children: [
                              _buildOverviewTab(),
                              _buildRequestsTab(),
                              _buildOrdersTab(),
                              _buildInventoryTab(),
                              _buildMoreTab(),
                            ],'''
    new_children = '''                            children: [
                              _buildOverviewTab(),
                              _buildRequestsTab(),
                              _buildOrdersTab(),
                              _buildInventoryTab(),
                              _buildMoreTab(),
                              const PharmacistDeliveryManagementScreen(),
                              const SystemAuditLogsScreen(),
                              const PharmacySettingsScreen(),
                              const HelpCenterScreen(),
                              const PharmacistChatScreen(),
                              const PharmacistNotificationsScreen(),
                            ],'''
    text = text.replace(old_children, new_children)

    # Replace _buildDesktopShellHeader block entirely
    pattern_shell_header = r'(  Widget _buildDesktopShellHeader\(BuildContext context\) \{)(.*?)(  Widget _buildPersistentSidebar\(BuildContext context\) \{)'
    new_shell_header = '''  Widget _buildDesktopShellHeader(BuildContext context) {
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
          const SizedBox(height: 8),
          /* Removed arbitrary pharmacy badge */
        ],
      ),
    );
  }

'''
    text = re.sub(pattern_shell_header, new_shell_header + r'\3', text, flags=re.DOTALL)

    # Replace _buildPersistentSidebar contents
    sidebar_pattern = r'(                  const Divider\(color: Colors\.white24, height: 32, thickness: 1\),)(.*?)(            SliverFillRemaining\()'
    new_sidebar = r'''                  const Divider(color: Colors.white24, height: 32, thickness: 1),
                  _buildDrawerItem(context, Icons.two_wheeler_outlined, Icons.two_wheeler, "Fleet", 5),
                  _buildDrawerItem(context, Icons.history_edu_outlined, Icons.history_edu, "Audit Logs", 6),
                  _buildDrawerItem(context, Icons.settings_outlined, Icons.settings, "Settings", 7),
                  _buildDrawerItem(context, Icons.help_outline, Icons.help, "Help & Support", 8),
                  _buildDrawerItem(context, Icons.chat_bubble_outline, Icons.chat_bubble, "Consulting", 9),
                  _buildDrawerItem(context, Icons.notifications_none_rounded, Icons.notifications, "Notifications", 10),
                ],
              ),
            ),
            SliverFillRemaining('''
    text = re.sub(sidebar_pattern, new_sidebar, text, flags=re.DOTALL)

    # We also need to remove these icons from `_buildHeader()` (the mobile header)
    # The Row contains icons like Icons.chat_bubble_outline and Icons.notifications_none_rounded
    # Actually, if we just map `_buildHeader` body all the way to `_buildRightContextSidebar`
    # Let's inspect that part again to avoid breaking bracket pairs.
    # The `_buildHeader` starts at `Widget _buildHeader() {` and ends before `Widget _buildRightContextSidebar`
    header_pattern = r'(Row\(\s*children: \[\s*Container\([^\]]*?Icons\.chat_bubble_outline.*?Icons\.notifications_none_rounded\s*.*?\],\s*\),\s*\),\s*\],\s*\))'
    
    # Or we can just strip the trailing "Row" inside `_buildHeader`.
    # Let's cleanly reconstruct _buildHeader! It only renders title, logo, and icons right now.
    mobile_header_new = r'''  Widget _buildHeader() {
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
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
              // Replaced right top bar menu with nothing, as we moved them.
            ],
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }'''
    
    pattern_mobile_header = r'(  Widget _buildHeader\(\) \{)(.*?)(  Widget _buildRightContextSidebar\(BuildContext context\) \{)'
    text = re.sub(pattern_mobile_header, mobile_header_new + '\n\n' + r'\3', text, flags=re.DOTALL)

    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
        f.write(text)

update_file()
