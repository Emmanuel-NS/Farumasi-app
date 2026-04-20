import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update IndexedStack Children
text = re.sub(
    r'_buildOrdersTab\(\),\s*_buildInventoryTab\(\),',
    r'_buildOrdersTab(),\n                          const RevenueDetailsScreen(), // 3: Revenue\n                          _buildInventoryTab(), /* 4: Stock */',
    text
)

# 2. FAB condition
text = re.sub(r'final fab = _selectedIndex == 3', r'final fab = _selectedIndex == 4', text)
text = re.sub(r'setState\(\(\) => _selectedIndex = 3\);\s*// Go to Stock tab', r'setState(() => _selectedIndex = 4); // Go to Stock tab', text)

# 3. BottomNavigationBar items (6 items)
text = re.sub(
    r'BottomNavigationBarItem\(icon: Icon\(Icons\.shopping_bag_outlined\), activeIcon: Icon\(Icons\.shopping_bag\), label: "Orders"\),',
    r'BottomNavigationBarItem(icon: Icon(Icons.shopping_bag_outlined), activeIcon: Icon(Icons.shopping_bag), label: "Orders"),\n                      BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), activeIcon: Icon(Icons.account_balance_wallet), label: "Revenue"),',
    text
)

# 4. Update the duplicate side bar revenues and reindex
pattern = r'_buildDrawerItem\(context,\s*Icons\.dashboard_outlined.*?if \(!_isSidebarCollapsed\)'
repl = '''_buildDrawerItem(context, Icons.dashboard_outlined, Icons.dashboard, "Overview", 0),
            _buildDrawerItem(context, Icons.assignment_outlined, Icons.assignment, "Requests", 1),
            _buildDrawerItem(context, Icons.shopping_bag_outlined, Icons.shopping_bag, "Orders", 2),
            _buildDrawerItem(context, Icons.account_balance_wallet_outlined, Icons.account_balance_wallet, "Revenue", 3),
            _buildDrawerItem(context, Icons.inventory_2_outlined, Icons.inventory_2, "Stock", 4),
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
            const Spacer(),
            _buildDrawerItem(context, Icons.logout, Icons.logout, "Logout", 8,
              onTapOverride: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AuthScreen())),
            ),
            if (!_isSidebarCollapsed)'''

text = re.sub(pattern, repl, text, flags=re.DOTALL)

with open(file, 'w', encoding='utf-8') as f:
    f.write(text)

print('Deeper refactor done.')
