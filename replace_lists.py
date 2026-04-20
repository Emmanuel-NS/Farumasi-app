import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace ListView.builder in _buildRequestsTab
req_pattern = r"(Widget _buildRequestsTab\(\) \{[\s\S]*?)(return ListView\.builder\([\s\S]*?)(itemBuilder:\s*\(context, index\)\s*\{)"
req_replacement = r\"\1return GridView.builder(padding: const EdgeInsets.all(24), gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: MediaQuery.of(context).size.width > 900 ? 3 : 1, mainAxisExtent: 260, crossAxisSpacing: 24, mainAxisSpacing: 16,), itemCount: list.length, \3\"

text = re.sub(req_pattern, req_replacement, text)

# Replace ListView.builder in _buildOrdersTab
ord_pattern = r"(ListView\.builder\([\s\S]*?padding: const EdgeInsets\.all\(24\),.*?)(itemCount: list\.length,)[\s\S]*?(itemBuilder:\s*\(context, index\)\s*\{)"
ord_replacement = r\"GridView.builder(padding: const EdgeInsets.all(24), gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: MediaQuery.of(context).size.width > 900 ? 2 : 1, mainAxisExtent: 220, crossAxisSpacing: 24, mainAxisSpacing: 16,), \2 \3\"
text = re.sub(ord_pattern, ord_replacement, text)

# Inventory List
inv_pattern = r"(ListView\.separated\([\s\S]*?padding: const EdgeInsets\.all\(24\),.*?)(itemCount: _inventoryList\.length,)[\s\S]*?separatorBuilder:.*?[\s\S]*?(itemBuilder: \(context, index\) \{)"
inv_replacement = r\"GridView.builder(padding: const EdgeInsets.all(24), gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: MediaQuery.of(context).size.width > 900 ? 3 : 1, mainAxisExtent: 180, crossAxisSpacing: 24, mainAxisSpacing: 16,), \2 \3\"
text = re.sub(inv_pattern, inv_replacement, text)

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done")
