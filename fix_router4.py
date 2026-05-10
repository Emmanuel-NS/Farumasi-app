with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('void _handleAcceptRequest(PrescriptionOrder order) {')
end = text.find('// --- TAB 2: ORDERS', start)

if start != -1 and end != -1:
    new_text = text[:start] + """void _handleAcceptRequest(PrescriptionOrder order) {
    setState(() {
      _selectedRequest = order;
      _isQuotingRequest = true;
    });
  }

  """ + text[end:]
    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Replaced safely!")
else:
    print("Could not find boundaries!")
