import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the router navigation so it opens in the split pane inline instead of the full screen Navigator.push
regex = r'void _handleAcceptRequest\(PrescriptionOrder order\) \{\s*Navigator\.push\([\s\S]*?\}\s*\)\s*;\s*\}'
replacement = '''void _handleAcceptRequest(PrescriptionOrder order) {
    setState(() {
      _selectedRequest = order;
      _isQuotingRequest = true;
    });
  }'''

text = re.sub(regex, replacement, text)

# I should also ensure that when the status is quoting, the detail pane shows PrescriptionReviewScreen
with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print("Router updated!")
