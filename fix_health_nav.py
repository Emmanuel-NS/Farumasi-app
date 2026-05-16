import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix bottom nav items
old_bnav = """                      BottomNavigationBarItem(
                        icon: Icon(Icons.shopping_bag_outlined),
                        activeIcon: Icon(Icons.shopping_bag),
                        label: "Orders",
                      ),
                      BottomNavigationBarItem(
                        icon: Icon(Icons.inventory_2_outlined),
                        activeIcon: Icon(Icons.inventory_2),
                        label: "Stock",
                      ),"""
new_bnav = """                      BottomNavigationBarItem(
                        icon: Icon(Icons.shopping_bag_outlined),
                        activeIcon: Icon(Icons.shopping_bag),
                        label: "Orders",
                      ),
                      BottomNavigationBarItem(
                        icon: Icon(Icons.monitor_heart_outlined),
                        activeIcon: Icon(Icons.monitor_heart),
                        label: "Health",
                      ),
                      BottomNavigationBarItem(
                        icon: Icon(Icons.inventory_2_outlined),
                        activeIcon: Icon(Icons.inventory_2),
                        label: "Stock",
                      ),"""
text = text.replace(old_bnav, new_bnav)

# Fix IndexedStack
old_stack = """                              IndexedStack(
                                index: _selectedIndex,
                                children: [
                                  _buildOverviewTab(),
                                  _buildRequestsTab(),
                                  _buildOrdersTab(),
                                  _buildInventoryTab(),
                                  _buildMoreTab(),
                                  PharmacistDeliveryManagementScreen(),
                                  SystemAuditLogsScreen(),
                                  PharmacySettingsScreen(),
                                ],
                              ),"""
new_stack = """                              IndexedStack(
                                index: _selectedIndex,
                                children: [
                                  _buildOverviewTab(),
                                  _buildRequestsTab(),
                                  _buildOrdersTab(),
                                  _buildHealthPostsTab(), // New Health Posts Tab
                                  _buildInventoryTab(),
                                  _buildMoreTab(),
                                  PharmacistDeliveryManagementScreen(),
                                  SystemAuditLogsScreen(),
                                  PharmacySettingsScreen(),
                                ],
                              ),"""
text = text.replace(old_stack, new_stack)

# Fix bottom nav currentIndex overflow check
old_idx_check = "currentIndex: _selectedIndex > 4 ? 4 : _selectedIndex,"
new_idx_check = "currentIndex: _selectedIndex > 5 ? 5 : _selectedIndex,"
text = text.replace(old_idx_check, new_idx_check)
text = text.replace("currentIndex: _selectedIndex,", new_idx_check) # Fallback

# Add dummy method for _buildHealthPostsTab
dummy_tab = """  Widget _buildMoreTab() {"""
impl_tab = """  Widget _buildHealthPostsTab() {
    return const PharmacistHealthPostsScreen();
  }

  Widget _buildMoreTab() {"""
text = text.replace(dummy_tab, impl_tab)

# Also fix the floating action button to match index 4 for stock
old_fab = """              final fab = (_selectedIndex == 3 && !_isEditingInventoryItem)
                  ? FloatingActionButton.extended("""
new_fab = """              final fab = (_selectedIndex == 4 && !_isEditingInventoryItem)
                  ? FloatingActionButton.extended("""
text = text.replace(old_fab, new_fab)

old_stat = """              _buildStatCard(
                title: "Active Orders",
                value: "\$1,245",
                trend: "+8% today",
                isPositive: true,
                onTap: () {
                  setState(() {
                    _selectedIndex = 2; // Go to Orders tab
                    _ordersFilterIndex = 2; // Auto-filter to 'Processing'
                  });
                },
              ),
              _buildStatCard(
                title: "Low Stock Items",
                value: "12",
                trend: "Needs attention",
                isPositive: false,
                isWarning: true,
                onTap: () {
                  setState(() => _selectedIndex = 3); // Go to Stock tab
                },
              ),"""
new_stat = """              _buildStatCard(
                title: "Active Orders",
                value: "\$1,245",
                trend: "+8% today",
                isPositive: true,
                onTap: () {
                  setState(() {
                    _selectedIndex = 2; // Go to Orders tab
                    _ordersFilterIndex = 2; // Auto-filter to 'Processing'
                  });
                },
              ),
              _buildStatCard(
                title: "Low Stock Items",
                value: "12",
                trend: "Needs attention",
                isPositive: false,
                isWarning: true,
                onTap: () {
                  setState(() => _selectedIndex = 4); // Go to Stock tab
                },
              ),"""
text = text.replace(old_stat, new_stat)


with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print("Started dash nav patch")
