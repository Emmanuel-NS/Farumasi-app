import re

with open('lib/screens/pharmacist/prescription_review_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Switch Scaffold to Container
text = text.replace('''    return Scaffold(
      appBar: AppBar(
        title: Text('$typeLabel #${widget.order.id}'),
      ),
      body: SingleChildScrollView(''', '''    return Container(
      color: Colors.grey.shade50,
      child: SingleChildScrollView(''')

# 2. Inject the header
header_new = '''          Wrap(
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
                    onPressed: widget.onCancel,
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
                      onPressed: widget.onComplete,
                      icon: const Icon(Icons.check),
                      label: const Text('Close'),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12)),
                    ),
                ],
              )
            ],
          ),
          const SizedBox(height: 32),
          // 1. Patient Info'''

text = text.replace('            // 1. Patient Info', header_new, 1)

# 3. Remove PopupMenuButton
popup_menu_regex = r'(\s*)if \(_workflowStep == 0\)\s*PopupMenuButton<String>\([\s\S]*?itemBuilder:\s*\(ctx\)\s*=>\s*\[.*?],\s*\),'
text = re.sub(popup_menu_regex, '', text)

# 4. Remove all the bottom buttons!
# Wait, let's look at the bottom of the original file.
