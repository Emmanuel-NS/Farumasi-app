import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix IndexedStack
search = """                              IndexedStack(
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
replacement = """                              IndexedStack(
                                index: _selectedIndex,
                                children: [
                                  _buildOverviewTab(),
                                  _buildRequestsTab(),
                                  _buildOrdersTab(),
                                  _buildHealthPostsTab(),
                                  _buildInventoryTab(),
                                  _buildMoreTab(),
                                  PharmacistDeliveryManagementScreen(),
                                  SystemAuditLogsScreen(),
                                  PharmacySettingsScreen(),
                                ],
                              ),"""

if search in text:
    text = text.replace(search, replacement)
else:
    print("IndexedStack not found natively!")
    
    # Try fuzzy
    pos = text.find('_buildOrdersTab(),')
    if pos != -1:
        text = text[:pos+18] + '\n                                  _buildHealthPostsTab(),' + text[pos+18:]
        print("Used fuzzy replace for IndexedStack!")


with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

with open('lib/screens/pharmacist/pharmacist_health_posts_screen.dart', 'r', encoding='utf-8') as f:
    health_text = f.read()

health_text = health_text.replace('OutlineBorder', 'OutlineInputBorder')

with open('lib/screens/pharmacist/pharmacist_health_posts_screen.dart', 'w', encoding='utf-8') as f:
    f.write(health_text)

print("Patched IndexedStack and OutlineBorder")
