import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'(\s*_buildDrawerItem\(context, Icons\.shopping_bag_outlined, Icons\.shopping_bag, "Orders", 2\),)'

match = re.search(pattern, text)
if match:
    new_item = match.group(1) + '''
            _buildDrawerItem(context, Icons.account_balance_wallet_outlined, Icons.account_balance_wallet, "Revenue", 8,
              onTapOverride: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RevenueDetailsScreen())),
            ),'''
    
    text = text[:match.start()] + new_item + text[match.end():]
    with open(file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Revenue added successfully!")
else:
    print("Failed to find Orders item")
