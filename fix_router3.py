with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Exact literal string substitution
old_str = """  void _handleAcceptRequest(PrescriptionOrder order) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PrescriptionReviewScreen(order: order)),    ).then((_) => setState(() {}));
  }"""
new_str = """  void _handleAcceptRequest(PrescriptionOrder order) {
    setState(() {
      _selectedRequest = order;
      _isQuotingRequest = true;
    });
  }"""

if old_str in text:
    text = text.replace(old_str, new_str)
    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced successfully!")
else:
    print("String not found! Oh no!")

