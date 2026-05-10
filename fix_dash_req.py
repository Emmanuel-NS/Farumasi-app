import sys
import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Add boolean state variable
text = text.replace('PrescriptionOrder? _selectedRequest;', 'PrescriptionOrder? _selectedRequest;\n  bool _isQuotingRequest = false;')

# Update ` Expanded(...) ` around line 2400 to show quoting panel
old_right_panel = '''        Expanded(
          child: Container(
            color: Colors.grey.shade50,
            child: _selectedRequest == null
                ? const SizedBox.shrink()
                : _buildRequestPreviewPanel(_selectedRequest!),
          ),
        ),'''

new_right_panel = '''        Expanded(
          child: Container(
            color: Colors.grey.shade50,
            child: _selectedRequest == null
                ? const SizedBox.shrink()
                : _isQuotingRequest
                    ? PrescriptionReviewScreen(
                        order: _selectedRequest!,
                        onCancel: () => setState(() => _isQuotingRequest = false),
                        onComplete: () => setState(() {
                          _isQuotingRequest = false;
                          _service.incomingRequests.remove(_selectedRequest);
                          _selectedRequest = null;
                        }),
                      )
                    : _buildRequestPreviewPanel(_selectedRequest!),
          ),
        ),'''

text = text.replace(old_right_panel, new_right_panel)

# Override _handleAcceptRequest
old_handle = '''  void _handleAcceptRequest(PrescriptionOrder order) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PrescriptionReviewScreen(order: order)),    ).then((_) => setState(() {}));
  }'''

new_handle = '''  void _handleAcceptRequest(PrescriptionOrder order) {
    setState(() {
      _selectedRequest = order;
      _isQuotingRequest = true;
    });
  }'''

text = text.replace(old_handle, new_handle)

# Also let's fix selecting a new request so it resets the _isQuotingRequest
old_tap = r"onTap: \(\) => setState\(\(\) => _selectedRequest = req\),"
new_tap = r"onTap: () => setState(() { _selectedRequest = req; _isQuotingRequest = false; }),"
text = re.sub(old_tap, new_tap, text)

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated dashboard requests viewer!')
