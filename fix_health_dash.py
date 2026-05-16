import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update _titles
old_titles = """  final List<String> _titles = [
    "Overview",
    "Requests",
    "Orders",
    "Inventory",
    "More",
    "Fleet Management",
    "Audit Logs",
    "Settings",
  ];"""
new_titles = """  final List<String> _titles = [
    "Overview",
    "Requests",
    "Orders",
    "Health Posts",
    "Inventory",
    "More",
    "Fleet Management",
    "Audit Logs",
    "Settings",
  ];"""
text = text.replace(old_titles, new_titles)

# 2. Update sidebar indices
# Orders: 2, Inventory: 3 -> 4, Fleet: 5 -> 6, Audit: 6 -> 7, Settings: 7 -> 8
text = text.replace('setState(() => _selectedIndex = 5)', 'setState(() => _selectedIndex = 6)')
text = text.replace('setState(() => _selectedIndex = 6);', 'setState(() => _selectedIndex = 7);')
text = text.replace('setState(() => _selectedIndex = 7)', 'setState(() => _selectedIndex = 8)')

# 3. Add to sidebar Items
old_sidebar = """                _buildDrawerItem(
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
                ),"""
new_sidebar = """                _buildDrawerItem(
                  context,
                  Icons.shopping_bag_outlined,
                  Icons.shopping_bag,
                  "Orders",
                  2,
                ),
                _buildDrawerItem(
                  context,
                  Icons.monitor_heart_outlined,
                  Icons.monitor_heart,
                  "Health",
                  3,
                ),
                _buildDrawerItem(
                  context,
                  Icons.inventory_2_outlined,
                  Icons.inventory_2,
                  "Stock",
                  4,
                ),"""
text = text.replace(old_sidebar, new_sidebar)

# Fix drawer More icon in sidebar which is not using _buildDrawerItem but might be there? No, More is Bottom nav only. Fleet is 5 in sidebar.
old_fleet = """                _buildDrawerItem(
                  context,
                  Icons.two_wheeler_outlined,
                  Icons.two_wheeler,
                  "Fleet",
                  5,
                ),"""
new_fleet = """                _buildDrawerItem(
                  context,
                  Icons.two_wheeler_outlined,
                  Icons.two_wheeler,
                  "Fleet",
                  6,
                ),"""
text = text.replace(old_fleet, new_fleet)

old_audit = """                _buildDrawerItem(
                  context,
                  Icons.history_edu_outlined, // Wait let me regex replace
"""

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print("Started dashboard patch")
