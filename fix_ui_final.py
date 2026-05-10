import re

with open('lib/screens/pharmacist/prescription_review_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Add onCancel and onComplete properties
text = text.replace('''class PrescriptionReviewScreen extends StatefulWidget {
  final PrescriptionOrder order;

  const PrescriptionReviewScreen({super.key, required this.order});''',
'''class PrescriptionReviewScreen extends StatefulWidget {
  final PrescriptionOrder order;
  final VoidCallback? onCancel;
  final VoidCallback? onComplete;

  const PrescriptionReviewScreen({super.key, required this.order, this.onCancel, this.onComplete});''')

# Replace Scaffold with Container, and add Header
text = text.replace('''    return Scaffold(
      appBar: AppBar(
        title: Text('$typeLabel #${widget.order.id}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Patient Info''',
'''    return Container(
      color: Colors.grey.shade50,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 16,
              runSpacing: 16,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Price Quoting', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text('Request ID: ${widget.order.id}', style: TextStyle(color: Colors.grey.shade600)),
                  ],
                ),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    OutlinedButton.icon(
                      onPressed: widget.onCancel ?? () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                      label: const Text('Cancel / Back'),
                    ),
                    if (_workflowStep == 0)
                      ElevatedButton.icon(
                        onPressed: _startBroadcastSimulation,
                        icon: const Icon(Icons.send),
                        label: const Text('Send Quote & Complete'),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12)),
                      ),
                    if (_workflowStep == 3)
                      ElevatedButton.icon(
                        onPressed: widget.onComplete ?? () => Navigator.pop(context),
                        icon: const Icon(Icons.check),
                        label: const Text('Close'),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12)),
                      ),
                  ],
                )
              ],
            ),
            const SizedBox(height: 32),
            // 1. Patient Info''')

# Remove PopupMenu
t_start = text.find('if (_workflowStep == 0)\n                  PopupMenuButton<String>')
t_end = text.find('                  ),', t_start) + 20
if t_start != -1 and t_end != -1:
    text = text[:t_start] + text[t_end:]

# Remove Action buttons but leave structural closing tags for `_buildPrescriptionForm`
b_start = text.find('        // Action Button')
b_end = text.find('        // Reject Button at the bottom')
b_end = text.find('        ),', b_end + 30) + 11

if b_start != -1 and b_end != -1:
    text = text[:b_start] + text[b_end:]

with open('lib/screens/pharmacist/prescription_review_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)
