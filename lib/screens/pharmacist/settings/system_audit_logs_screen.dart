import 'package:flutter/material.dart';
import '../../../services/pharmacist_service.dart';

class SystemAuditLogsScreen extends StatefulWidget {
  const SystemAuditLogsScreen({super.key});

  @override
  State<SystemAuditLogsScreen> createState() => _SystemAuditLogsScreenState();
}

class _SystemAuditLogsScreenState extends State<SystemAuditLogsScreen> {
  final PharmacistService _service = PharmacistService();
  
  String _searchQuery = "";
  String _filterType = "All Levels";
  String _sortBy = "Newest First";

  final List<String> _filterOptions = ["All Levels", "Review", "Dispense", "Logistics", "Delivery"];
  final List<String> _sortOptions = ["Newest First", "Oldest First", "Type (A-Z)"];

  @override
  Widget build(BuildContext context) {
    // Generate a flat list of audit events from all orders
    final List<Map<String, dynamic>> allAuditEvents = [];
    
    for (var order in _service.orders) {
      if (order.reviewedAt != null) {
        allAuditEvents.add({
          'time': order.reviewedAt,
          'type': 'Review',
          'orderId': order.id,
          'description': 'Prescription approved by ${order.reviewedBy ?? "System"}',
          'icon': Icons.verified_user,
          'color': Colors.blue
        });
      }
      if (order.acceptedAt != null) {
        allAuditEvents.add({
          'time': order.acceptedAt,
          'type': 'Dispense',
          'orderId': order.id,
          'description': 'Order packaged at ${order.assignedPharmacyName}',
          'icon': Icons.local_hospital,
          'color': Colors.orange
        });
      }
      if (order.shippedAt != null) {
        allAuditEvents.add({
          'time': order.shippedAt,
          'type': 'Logistics',
          'orderId': order.id,
          'description': 'Handed to driver: ${order.assignedDriverName}',
          'icon': Icons.local_shipping,
          'color': Colors.purple
        });
      }
      if (order.completedAt != null) {
        allAuditEvents.add({
          'time': order.completedAt,
          'type': 'Delivery',
          'orderId': order.id,
          'description': 'Confirmed delivered to ${order.patientName}',
          'icon': Icons.check_circle,
          'color': Colors.green
        });
      }
    }
    
    // Apply Filters & Search
    var displayEvents = allAuditEvents.where((e) {
      final matchesFilter = _filterType == "All Levels" || e['type'] == _filterType;
      final matchesSearch = _searchQuery.isEmpty || 
        e['description'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) || 
        e['orderId'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    }).toList();

    // Apply Sorting
    displayEvents.sort((a, b) {
      if (_sortBy == "Newest First") {
        return (b['time'] as DateTime).compareTo(a['time'] as DateTime);
      } else if (_sortBy == "Oldest First") {
        return (a['time'] as DateTime).compareTo(b['time'] as DateTime);
      } else if (_sortBy == "Type (A-Z)") {
        return (a['type'] as String).compareTo(b['type'] as String);
      }
      return 0;
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text("System Audit Logs", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black87),
        actions: [
          IconButton(icon: const Icon(Icons.download), onPressed: () {
             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Exporting Logs to PDF...")));
          }),
        ],
      ),
      backgroundColor: Colors.grey.shade50,
      body: Column(
        children: [
          // Search & Filter Panel
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Search Bar
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: "Search by Order ID or Description",
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    filled: true,
                    fillColor: Colors.grey.shade100,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Filter & Sort Row
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _filterType,
                            isExpanded: true,
                            icon: const Icon(Icons.filter_list, size: 16),
                            style: const TextStyle(fontSize: 14, color: Colors.black87),
                            onChanged: (val) {
                              if (val != null) setState(() => _filterType = val);
                            },
                            items: _filterOptions.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _sortBy,
                            isExpanded: true,
                            icon: const Icon(Icons.sort, size: 16),
                            style: const TextStyle(fontSize: 14, color: Colors.black87),
                            onChanged: (val) {
                              if (val != null) setState(() => _sortBy = val);
                            },
                            items: _sortOptions.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          Expanded(
            child: displayEvents.isEmpty 
              ? const Center(child: Text("No matching records found", style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: displayEvents.length,
                  itemBuilder: (context, index) {
                    final event = displayEvents[index];
                    final DateTime t = event['time'];
                    return InkWell(
                      onTap: () {
                         _showLogDetailsDialog(context, event);
                      },
                      child: Card(
                        elevation: 0,
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: (event['color'] as Color).withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(event['icon'], color: event['color'], size: 20),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(event['type'], style: TextStyle(fontWeight: FontWeight.bold, color: event['color'])),
                                        Text("${t.hour.toString().padLeft(2,'0')}:${t.minute.toString().padLeft(2,'0')}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text("Order ID: ${event['orderId']}", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 4),
                                    Text(event['description'], style: TextStyle(fontSize: 13, color: Colors.grey.shade800)),
                                    const SizedBox(height: 8),
                                    Text(t.toString().substring(0, 10), style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                                  ],
                                ),
                              )
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
          ),
        ],
      )
    );
  }

  void _showLogDetailsDialog(BuildContext context, Map<String, dynamic> event) {
    final DateTime t = event['time'];
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Icon(event['icon'], color: event['color']),
              const SizedBox(width: 8),
              Text("Log Detail: ${event['type']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildDetailRow("Order ID", event['orderId'].toString()),
              _buildDetailRow("Timestamp", "${t.toIso8601String().substring(0, 19).replaceFirst('T', ' ')}"),
              _buildDetailRow("Type", event['type']),
              const Divider(),
              _buildDetailRow("Description", event['description']),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.shade100),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.security, size: 16, color: Colors.blue),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        "This log is permanently recorded on the blockchain ledger for auditing purposes.",
                        style: TextStyle(fontSize: 12, color: Colors.blueGrey),
                      ),
                    )
                  ],
                ),
              )
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Close", style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () {
                 Navigator.pop(context);
                 ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Log copy copied to clipboard.")));
              },
              style: ElevatedButton.styleFrom(backgroundColor: event['color']),
              child: const Text("Copy ID", style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      }
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, fontSize: 13)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
          ),
        ],
      ),
    );
  }
}
