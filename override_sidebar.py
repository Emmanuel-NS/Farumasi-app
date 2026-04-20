import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    code = f.read()

sidebar_new = '''  Widget _buildPersistentSidebar(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      width: _isSidebarCollapsed ? 92 : _sidebarWidth,
      clipBehavior: Clip.antiAlias,
      decoration: const BoxDecoration(color: _shellGreen, borderRadius: BorderRadius.zero),
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 16),
                _buildDrawerItem(context, Icons.dashboard_outlined, Icons.dashboard, "Overview", 0),
                _buildDrawerItem(context, Icons.assignment_outlined, Icons.assignment, "Requests", 1),
                _buildDrawerItem(context, Icons.shopping_bag_outlined, Icons.shopping_bag, "Orders", 2),
                _buildDrawerItem(context, Icons.inventory_2_outlined, Icons.inventory_2, "Stock", 3),
                _buildDrawerItem(context, Icons.monetization_on_outlined, Icons.monetization_on, "Revenue", 4),
                const Divider(color: Colors.white24, height: 32, thickness: 1),
                _buildDrawerItem(context, Icons.two_wheeler_outlined, Icons.two_wheeler, "Fleet", 5, 
                  onTapOverride: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PharmacistDeliveryManagementScreen())),
                ),
                _buildDrawerItem(context, Icons.history_edu_outlined, Icons.history_edu, "Audit Logs", 6,
                  onTapOverride: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SystemAuditLogsScreen())),
                ),
                _buildDrawerItem(context, Icons.settings_outlined, Icons.settings, "Settings", 7,
                  onTapOverride: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PharmacySettingsScreen())),
                ),
              ],
            ),
          ),
          SliverFillRemaining(
            hasScrollBody: false,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                _buildDrawerItem(context, Icons.logout, Icons.logout, "Logout", 8,
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
          ),
        ],
      ),
    );
  }'''

pattern = r"  Widget _buildPersistentSidebar\(BuildContext context\) \{.*?\};\s+\}"
res = re.sub(pattern, sidebar_new, code, flags=re.DOTALL)

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(res)
