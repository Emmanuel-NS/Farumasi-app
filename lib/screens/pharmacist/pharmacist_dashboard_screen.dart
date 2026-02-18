import 'package:flutter/material.dart';
import '../../models/models.dart';
import '../../services/pharmacist_service.dart';
import '../../data/dummy_data.dart'; // To pick medicines (for demo)

class PharmacistDashboardScreen extends StatefulWidget {
  const PharmacistDashboardScreen({super.key});

  @override
  State<PharmacistDashboardScreen> createState() => _PharmacistDashboardScreenState();
}

class _PharmacistDashboardScreenState extends State<PharmacistDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final PharmacistService _service = PharmacistService(); 

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this); // Added 'Completed' tab
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _service,
      builder: (context, _) {
        return Scaffold(
          appBar: AppBar(
            title: const Text("Pharmacist Dashboard"),
            backgroundColor: Colors.teal, 
            foregroundColor: Colors.white,
            bottom: TabBar(
              controller: _tabController,
              isScrollable: true,
              indicatorColor: Colors.white,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white70,
              tabs: [
                Tab(text: "New ()"),
                Tab(text: "Process ()"),
                Tab(text: "Dispatch ()"),
                Tab(text: "Done ()"),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => setState(() {}),
              ),
              IconButton(
                icon: const Icon(Icons.logout),
                onPressed: () {
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
              ),
            ],
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildRequestsList(),
              _buildProcessingList(),
              _buildDispatchList(),
              _buildCompletedList(),
            ],
          ),
        );
      },
    );
  }

  // --- Tab 1: New Requests ---
  Widget _buildRequestsList() {
    final list = _service.incomingRequests;
    if (list.isEmpty) {
      return const Center(child: Text("No new prescription requests."));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final order = list[index];
        return Card(
          elevation: 3,
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            contentPadding: const EdgeInsets.all(12),
            leading: const CircleAvatar(
              backgroundColor: Colors.teal,
              child: Icon(Icons.description, color: Colors.white),
            ),
            title: Text(order.patientName, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Insurance: ${order.insuranceProvider ?? 'None'}"),
                Text("Loc: ${order.patientLocationName}", style: const TextStyle(fontSize: 12)),
                Text("Date: ${order.date.toString().substring(0, 16)}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
            trailing: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, foregroundColor: Colors.white),
              onPressed: () => _showReviewModal(context, order),
              child: const Text("Review"),
            ),
          ),
        );
      },
    );
  }

  // --- Tab 2: Processing ---
  Widget _buildProcessingList() {
    final list = _service.processingOrders;
    if (list.isEmpty) {
      return const Center(child: Text("No active orders in processing."));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final order = list[index];
        
        // Determine status text & color
        String chipText = "";
        Color chipColor = Colors.grey;
        
        if (order.status == OrderStatus.findingPharmacy) {
          chipText = "Waiting for Pharmacy";
          chipColor = Colors.orange;
        } else if (order.status == OrderStatus.pharmacyAccepted) {
          chipText = "Pharmacy Accepted";
          chipColor = Colors.green;
        } else if (order.status == OrderStatus.paymentPending) {
          chipText = "Awaiting Payment";
          chipColor = Colors.blue;
        }

        return Card(
          elevation: 3,
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(order.id, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Chip(
                      label: Text(chipText, style: const TextStyle(color: Colors.white, fontSize: 12)),
                      backgroundColor: chipColor,
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
                Text("Patient: ${order.patientName}"),
                Text("Assigned: ${order.assignedPharmacyName ?? '...'}"),
                const Divider(),
                
                // ACTION BUTTONS BASED ON STATUS
                if (order.status == OrderStatus.findingPharmacy)
                  const Center(child: Text("Waiting for pharmacy to accept...", style: TextStyle(fontStyle: FontStyle.italic, color: Colors.grey))),
                
                if (order.status == OrderStatus.pharmacyAccepted) ...[
                  Text("Pharmacy Price: ${order.pharmacyPrice?.toStringAsFixed(0)} RWF"),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.send),
                      label: const Text("Finalize & Send Invoice to Patient"),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, foregroundColor: Colors.white),
                      onPressed: () {
                        _service.sendToPatientForPayment(order);
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Invoice sent to patient.")));
                      },
                    ),
                  )
                ],

                if (order.status == OrderStatus.paymentPending)
                  const Center(child: Text("Waiting for patient payment...", style: TextStyle(fontStyle: FontStyle.italic, color: Colors.blue))),
              ],
            ),
          ),
        );
      },
    );
  }

  // --- Tab 3: Dispatch ---
  Widget _buildDispatchList() {
    final list = _service.deliveryQueue;
    if (list.isEmpty) {
      return const Center(child: Text("No orders ready for dispatch."));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final order = list[index];
        bool isAssigned = order.status != OrderStatus.readyForPickup;

        return Card(
          elevation: 3,
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: Icon(
              isAssigned ? Icons.delivery_dining : Icons.store, 
              color: isAssigned ? Colors.orange : Colors.green, 
              size: 40
            ),
            title: Text(order.patientName, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(isAssigned ? "Driver: ${order.assignedDriverName}" : "Ready for Pickup"),
                Text("To: ${order.patientLocationName}", style: const TextStyle(fontSize: 12)),
              ],
            ),
            trailing: isAssigned 
              ? const Chip(label: Text("In Transit"), backgroundColor: Colors.orangeAccent)
              : ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                  onPressed: () => _showDriverModal(context, order),
                  child: const Text("Assign Driver"),
                ),
          ),
        );
      },
    );
  }

  // --- Tab 4: Completed ---
  Widget _buildCompletedList() {
    final list = _service.completedOrders;
    if (list.isEmpty) {
      return const Center(child: Text("No history."));
    }
    return ListView.builder(
      itemCount: list.length,
      itemBuilder: (context, index) {
        final order = list[index];
        final isCancelled = order.status == OrderStatus.cancelled;
        return ListTile(
          leading: Icon(isCancelled ? Icons.cancel : Icons.check_circle, color: isCancelled ? Colors.red : Colors.green),
          title: Text(order.patientName),
          subtitle: Text("Status: ${isCancelled ? 'Cancelled' : 'Delivered'}"),
          trailing: Text(order.id, style: const TextStyle(color: Colors.grey)),
        );
      },
    );
  }

  // --- Modals ---
  
  void _showReviewModal(BuildContext context, PrescriptionOrder order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, controller) => _ReviewOrderSheet(order: order, scrollController: controller),
      ),
    );
  }

  void _showDriverModal(BuildContext context, PrescriptionOrder order) {
    showModalBottomSheet(
      context: context,
      builder: (context) => _AssignDriverSheet(order: order),
    );
  }
}

// --- Specific Review Sheet ---
class _ReviewOrderSheet extends StatefulWidget {
  final PrescriptionOrder order;
  final ScrollController scrollController;
  const _ReviewOrderSheet({required this.order, required this.scrollController});

  @override
  State<_ReviewOrderSheet> createState() => _ReviewOrderSheetState();
}

class _ReviewOrderSheetState extends State<_ReviewOrderSheet> {
  Pharmacy? _selectedPharmacy;

  @override
  Widget build(BuildContext context) {
    // Filter pharmacies based on insurance
    final compatiblePharmacies = PharmacistService().partnerPharmacies.where((p) {
      if (widget.order.insuranceProvider == null) return true;
      return p.supportedInsurances.contains(widget.order.insuranceProvider);
    }).toList();

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: ListView(
        controller: widget.scrollController,
        children: [
          Text("Review Request #${widget.order.id}", style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          
          // Prescription Image Preview
          Container(
            height: 200,
            width: double.infinity,
            color: Colors.grey.shade200,
            child: const Center(child: Icon(Icons.image, size: 50, color: Colors.grey)), 
          ),
          const SizedBox(height: 16),
          
          const Text("Patient Details", style: TextStyle(fontWeight: FontWeight.bold)),
          Text("Name: ${widget.order.patientName}"),
          Text("Insurance: ${widget.order.insuranceProvider ?? 'N/A'}"),
          
          const SizedBox(height: 24),
          const Text("Select Partner Pharmacy", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 8),
          
          if (compatiblePharmacies.isEmpty)
             const Text("No partner pharmacies accept this insurance.", style: TextStyle(color: Colors.red)),
          
          ...compatiblePharmacies.map((pharmacy) => RadioListTile<Pharmacy>(
             title: Text(pharmacy.name),
             subtitle: Text("${pharmacy.locationName} • Insurance: ${pharmacy.supportedInsurances.join(', ')}"),
             value: pharmacy,
             groupValue: _selectedPharmacy,
             activeColor: Colors.teal,
             onChanged: (val) {
               setState(() => _selectedPharmacy = val);
             },
          )).toList(),
          
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _selectedPharmacy == null ? null : () {
                PharmacistService().sendToPharmacy(widget.order, _selectedPharmacy!);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Request sent to ${_selectedPharmacy!.name}")));
              },
              child: const Text("Send Request to Pharmacy"),
            ),
          ),
        ],
      ),
    );
  }
}

// --- Driver Assignment Sheet ---
class _AssignDriverSheet extends StatefulWidget {
  final PrescriptionOrder order;
  const _AssignDriverSheet({required this.order});

  @override
  State<_AssignDriverSheet> createState() => _AssignDriverSheetState();
}

class _AssignDriverSheetState extends State<_AssignDriverSheet> {
  final List<Driver> _sortedDrivers = PharmacistService().activeDrivers; 

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Assign Delivery Driver", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text("Drivers sorted by proximity & availability"),
          const SizedBox(height: 16),
          Expanded(
            child: ListView.builder(
              itemCount: _sortedDrivers.length,
              itemBuilder: (context, index) {
                final driver = _sortedDrivers[index];
                return ListTile(
                  leading: const CircleAvatar(backgroundColor: Colors.teal, child: Icon(Icons.motorcycle, color: Colors.white)),
                  title: Text(driver.name),
                  subtitle: Text("Near ${driver.currentCoordinates}"),
                  trailing: ElevatedButton(
                    onPressed: () {
                      PharmacistService().assignDriver(widget.order, driver);
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Driver ${driver.name} assigned!")));
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                    child: const Text("Assign"),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
