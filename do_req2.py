import sys

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

start_idx = text.find('Widget _buildRequestsTab() {')
end_idx = text.find('void _handleAcceptRequest', start_idx)

if start_idx == -1 or end_idx == -1:
    print('Failed to find bounds')
    sys.exit(1)

new_code = '''PrescriptionOrder? _selectedRequest;

  Widget _buildRequestsTab() {
    final list = _service.incomingRequests;

    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in_outlined, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No Pending Requests', style: TextStyle(color: Colors.grey.shade700, fontSize: 16)),
          ],
        ),
      );
    }

    // Auto-select first if none selected
    if (_selectedRequest == null && list.isNotEmpty) {
      _selectedRequest = list.first;
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left Column: Request Queue
        Container(
          width: 380,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(right: BorderSide(color: Colors.grey.shade300)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Pending Reviews', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Colors.orange.shade100, borderRadius: BorderRadius.circular(12)),
                      child: Text('${list.length} new', style: TextStyle(color: Colors.orange.shade800, fontWeight: FontWeight.bold, fontSize: 12)),
                    )
                  ],
                ),
              ),
              Divider(height: 1, color: Colors.grey.shade200),
              Expanded(
                child: ListView.separated(
                  itemCount: list.length,
                  separatorBuilder: (c, i) => Divider(height: 1, color: Colors.grey.shade100),
                  itemBuilder: (context, index) {
                    final req = list[index];
                    final isSelected = _selectedRequest?.id == req.id;
                    return InkWell(
                      onTap: () => setState(() => _selectedRequest = req),
                      child: Container(
                        color: isSelected ? _primaryGreen.withOpacity(0.05) : Colors.transparent,
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Container(
                              width: 48, height: 48,
                              decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
                              child: Icon(Icons.receipt_long, color: isSelected ? _primaryGreen : Colors.grey.shade600),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(req.patientName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                                  const SizedBox(height: 4),
                                  Text('Uploaded ${req.date.toString().substring(0, 16)}', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                                ],
                              ),
                            ),
                            if (isSelected)
                              Icon(Icons.chevron_right, color: _primaryGreen)
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        
        // Right Column: Preview & Action
        Expanded(
          child: Container(
            color: Colors.grey.shade50,
            child: _selectedRequest == null
                ? const SizedBox.shrink()
                : _buildRequestPreviewPanel(_selectedRequest!),
          ),
        ),
      ],
    );
  }

  Widget _buildRequestPreviewPanel(PrescriptionOrder req) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
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
                  const Text('Prescription Review', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Request ID: ${req.id}', style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.close),
                    label: const Text('Reject'),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                  ),
                  ElevatedButton.icon(
                    onPressed: () => _handleAcceptRequest(req),
                    icon: const Icon(Icons.price_check),
                    label: const Text('Provide Quote & Complete'),
                    style: ElevatedButton.styleFrom(backgroundColor: _primaryGreen, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12)),
                  ),
                ],
              )
            ],
          ),
          const SizedBox(height: 32),
          
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Image Viewer
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: const BorderRadius.vertical(top: Radius.circular(12))),
                      child: const Text('Prescription Document', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    const Divider(height: 1),
                    Container(
                      height: 400,
                      decoration: const BoxDecoration(
                        color: Colors.black87,
                        borderRadius: BorderRadius.vertical(bottom: Radius.circular(12))
                      ),
                      child: req.prescriptionImageUrl != null
                          ? const Center(child: Text('Image goes here', style: TextStyle(color: Colors.white)))
                          : Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.image_search, size: 64, color: Colors.grey.shade600),
                                  const SizedBox(height: 16),
                                  Text('Preview Generation Active', style: TextStyle(color: Colors.grey.shade400)),
                                ],
                              ),
                            ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Meta Data
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Patient Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 24),
                      _buildInfoRow(Icons.person, 'Name', req.patientName),
                      const SizedBox(height: 16),
                      _buildInfoRow(Icons.location_on, 'Delivery Address', req.patientLocationName),
                      const SizedBox(height: 16),
                      _buildInfoRow(Icons.health_and_safety, 'Insurance', req.insuranceProvider ?? 'None (Out of Pocket)'),
                      
                      const Divider(height: 48),
                      
                      const Text('Action Required', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      const Text(
                        'Review the attached prescription document, extract the required medication items, input your pharmacy\\'s pricing, and submit the proposal back to the patient for payment.',
                        style: TextStyle(color: Colors.black54, height: 1.5),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  '''

text = text[:start_idx] + new_code + text[end_idx:]
with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)
print('Patched Requests Tab!')
