import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the router navigation so it opens in the split pane inline instead of the full screen Navigator.push
# Use non-greedy modifier for the inside to match only the function body
regex = r'void _handleAcceptRequest\(PrescriptionOrder order\) \{[\s\S]*?\}\s*\)\s*;\s*\}'
# Actually it's simpler to just do a direct string replace with the exact content since we printed it earlier
search_str = '''  void _handleAcceptRequest(PrescriptionOrder order) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PrescriptionReviewScreen(order: order)),    ).then((_) => setState(() {}));
  }'''
replacement = '''  void _handleAcceptRequest(PrescriptionOrder order) {
    setState(() {
      _selectedRequest = order;
      _isQuotingRequest = true;
    });
  }'''

text = text.replace(search_str, replacement)

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print("Router safely updated!")
