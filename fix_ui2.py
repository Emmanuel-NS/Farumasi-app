import re

with open('lib/screens/pharmacist/prescription_review_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove old action button at bottom
old_action_section = '''              const SizedBox(height: 32),
              // Complete / Send Invoice Action
              SizedBox(
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _workflowStep == 0 ? _startBroadcastSimulation : null,
                  icon: const Icon(Icons.send),
                  label: const Text('Broadcast Quote & Complete', style: TextStyle(fontSize: 16)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _workflowStep == 0 ? Colors.green.shade700 : Colors.grey,
                  ),
                ),
              ),'''
text = text.replace(old_action_section, '')

# Add new clean header above Patient Info
patient_info_start = '''            // 1. Patient Info'''
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
          
          '''

text = text.replace(patient_info_start, header_new + patient_info_start)

# Remove the ugly vertical popup button inside the Patient row 
text = re.sub(r'if \(_workflowStep == 0\)[\s\n]*PopupMenuButton<String>\(.*?\)[\s\n]*\],', '],', text, flags=re.DOTALL)

with open('lib/screens/pharmacist/prescription_review_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated Review Screen UI')
