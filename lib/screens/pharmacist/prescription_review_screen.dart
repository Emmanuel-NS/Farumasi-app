import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import 'dart:math';
import '../../models/models.dart';
import '../../data/dummy_data.dart'; // import dummy data for medicine list

class PrescriptionReviewScreen extends StatefulWidget {
  final PrescriptionOrder order;

  const PrescriptionReviewScreen({Key? key, required this.order}) : super(key: key);

  @override
  State<PrescriptionReviewScreen> createState() => _PrescriptionReviewScreenState();
}

class _PrescriptionReviewScreenState extends State<PrescriptionReviewScreen> {
  // Use a map to track selected medicines and their quantities
  final Map<Medicine, int> _selectedMedicines = {};
  double _deliveryFee = 1500.0; // Default delivery fee

  // -- Insurance & Form State --
  bool _isInsuranceApplicable = false;
  String? _selectedInsuranceProvider;
  final TextEditingController _insuranceNumberController = TextEditingController();
  final List<String> _insuranceProviders = ["RSSB (RAMA)", "MMI", "Radiant", "UAP", "Britam"];

  // -- Network Simulation State --
  // Steps: 0=Draft, 1=Broadcasting, 2=Monitoring(Real-time), 3=Completed/InvoiceSent
  int _workflowStep = 0; 
  List<Map<String, dynamic>> _networkPharmacies = [];
  Timer? _simulationTimer;
  String? _finalfulfillmentPharmacy;

  double get _pharmacySubtotal {
    double total = 0.0;
    _selectedMedicines.forEach((medicine, quantity) {
      total += medicine.price * quantity;
    });
    return total;
  }

  double get _totalPrice => _pharmacySubtotal + _deliveryFee;

  @override
  void dispose() {
    _insuranceNumberController.dispose();
    _simulationTimer?.cancel();
    super.dispose();
  }

  void _addMedicine(Medicine medicine) {
    setState(() {
      if (_selectedMedicines.containsKey(medicine)) {
        _selectedMedicines[medicine] = _selectedMedicines[medicine]! + 1;
      } else {
        _selectedMedicines[medicine] = 1;
      }
    });
  }

  void _removeMedicine(Medicine medicine) {
    setState(() {
      if (_selectedMedicines.containsKey(medicine)) {
        if (_selectedMedicines[medicine]! > 1) {
          _selectedMedicines[medicine] = _selectedMedicines[medicine]! - 1;
        } else {
          _selectedMedicines.remove(medicine);
        }
      }
    });
  }

  // --- Actions ---

  void _showRejectOrderDialog() {
    final TextEditingController reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Reject Prescription Order"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("This will notify the patient that their prescription could not be fulfilled."),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: "Reason for Rejection",
                hintText: "e.g., Illegible prescription, Out of stock",
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () {
              if (reasonController.text.isNotEmpty) {
                // In a real app, update status and save reason
                widget.order.status = OrderStatus.cancelled;
                widget.order.cancelledAt = DateTime.now();
                widget.order.cancelledBy = "Pharmacist (You)";
                widget.order.cancellationReason = reasonController.text;
                
                Navigator.pop(ctx);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text("Order Rejected: ${reasonController.text}"),
                  backgroundColor: Colors.red,
                ));
              }
            }, 
            child: const Text("Reject Order")
          ),
        ],
      ),
    );
  }

  // --- Network Logic ---
  
  void _submitForFulfillment() {
    if (_isInsuranceApplicable && (_selectedInsuranceProvider == null || _insuranceNumberController.text.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please fill all insurance details")));
      return;
    }

    // Update review audit fields
    widget.order.reviewedBy = "Pharmacist (You)";
    widget.order.reviewedAt = DateTime.now();
    widget.order.insuranceProvider = _isInsuranceApplicable ? _selectedInsuranceProvider : "None";

    setState(() {
      _workflowStep = 1; // Broadcasting...
    });
    
    // Simulate finding pharmacies that accept insurance + have items
    Future.delayed(const Duration(seconds: 2), () {
      setState(() {
        _workflowStep = 2; // Monitoring...    
        _networkPharmacies = [
          {"id": "p1", "name": "Kigali City Pharmacy", "status": "pending", "statusText": "Waiting..."},
          {"id": "p2", "name": "HealthFirst Pharma", "status": "pending", "statusText": "Reviewing..."},
          {"id": "p3", "name": "LifeCare Pharmacy", "status": "pending", "statusText": "Checking Stock..."},
        ];
      });

      // Simulate a random one accepting within 3-8 seconds
      final random = Random();
      int delay = 3 + random.nextInt(5);
      
      _simulationTimer = Timer(Duration(seconds: delay), () {
        if (!mounted) return;
        
        // Pick one winner OR simulate rejection from network
        if (random.nextBool()) { // 50/50 Chance some pharmacy accepts or all reject
             final winnerIndex = random.nextInt(_networkPharmacies.length);
             final winnerName = _networkPharmacies[winnerIndex]["name"];
             
             setState(() {
                // Update winner
                _networkPharmacies[winnerIndex]["status"] = "accepted";
                _networkPharmacies[winnerIndex]["statusText"] = "ACCEPTED";
                
                // Others get marked as "Served by Other"
                for (int i = 0; i < _networkPharmacies.length; i++) {
                  if (i != winnerIndex) {
                    _networkPharmacies[i]["status"] = "served_other";
                    _networkPharmacies[i]["statusText"] = "Taken by $winnerName";
                  }
                }
                
                _finalfulfillmentPharmacy = winnerName;
             });

             // Trigger Invoice Step after short delay
             Future.delayed(const Duration(seconds: 2), () {
               if(!mounted) return;
               _finalizeOrder(winnerName);
             });
        } else {
             // Simulate ALL pharmacies rejecting
             setState(() {
               for (int i = 0; i < _networkPharmacies.length; i++) {
                 _networkPharmacies[i]["status"] = "rejected";
                 final reasons = ["Out of Stock", "Invalid Insurance", "Requires Clarification"];
                 _networkPharmacies[i]["statusText"] = "Rejection: ${reasons[random.nextInt(reasons.length)]}";
               }
             });
             
             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
               content: Text("All nearby pharmacies rejected/unavailable. Please try again later or contact support."),
               backgroundColor: Colors.orange,
               duration: Duration(seconds: 4),
             ));
        }
      });

    });
  }

  void _finalizeOrder(String pharmacyName) {
     setState(() {
       _workflowStep = 3; // Completed
     });
     widget.order.assignedPharmacyName = pharmacyName;
     widget.order.acceptedAt = DateTime.now();
     
     // Update logical order state
     widget.order.status = OrderStatus.paymentPending;
     widget.order.pharmacyPrice = _pharmacySubtotal;
     widget.order.deliveryFee = _deliveryFee;
     
     // Here in a real app, backend would send invoice
     
     showDialog(
       context: context,
       barrierDismissible: false,
       builder: (ctx) => AlertDialog(
         title: const Text("Order Accepted!"),
         content: Column(
           mainAxisSize: MainAxisSize.min,
           children: [
             Icon(Icons.check_circle, color: Colors.green, size: 60),
             const SizedBox(height: 16),
             Text("$pharmacyName has accepted the request."),
             const SizedBox(height: 8),
             const Text("Invoice has been sent to the patient for payment. Once paid, delivery will commence.", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
           ],
         ),
         actions: [
           TextButton(
             onPressed: () { 
               Navigator.pop(ctx); // Close dialog
               Navigator.pop(context); // Close screen
             }, 
             child: const Text("Done")
           ),
         ],
       ),
     );
  }

  void _rejectRequest(int index) {
      final TextEditingController reasonController = TextEditingController();
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text("Add Rejection Note"),
          content: TextField(
            controller: reasonController,
            decoration: const InputDecoration(hintText: "Reason for rejection (e.g. Out of stock)"),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx), 
              child: const Text("Cancel")
            ),
            TextButton(
              onPressed: () {
                if (reasonController.text.isNotEmpty) {
                  setState(() {
                    _networkPharmacies[index]["status"] = "rejected";
                    _networkPharmacies[index]["statusText"] = "Rejected: ${reasonController.text}";
                  });
                  Navigator.pop(ctx);
                }
              }, 
              child: const Text("Submit Rejection", style: TextStyle(color: Colors.red))
            ),
          ],
        )
      );
  }

  @override
  void initState() {
    super.initState();
    // If order already has items, pre-populate
    for (var item in widget.order.items) {
      // Logic to count if multiple same items exist
      // Since `Medicine` uses `id`, we can match
      // But `dummyMedicines` are instances.
      // We'll just try to find based on ID
      try {
         // This simple check assumes items in order are from dummyData or similar
         _addMedicine(item); 
      } catch (e) {
        // ignore
      }
    }
    // If it's a fresh review, items might be empty.
  }

  @override
  Widget build(BuildContext context) {
    String typeLabel = widget.order.prescriptionImageUrl != null ? "Request" : "Order";
    return Scaffold(
      appBar: AppBar(
        title: Text('$typeLabel #${widget.order.id}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Patient Info
            Row(
              children: [
                Expanded(
                  child: Card(
                    child: ListTile(
                      leading: const Icon(Icons.person),
                      title: Text(widget.order.patientName),
                      subtitle: Text(widget.order.patientLocationName),
                    ),
                  ),
                ),
                if (_workflowStep == 0)
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (val) {
                      if (val == 'reject') {
                        _showRejectOrderDialog();
                      }
                    },
                    itemBuilder: (ctx) => [
                      const PopupMenuItem(value: 'reject', child: Text('Reject Order', style: TextStyle(color: Colors.red))),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 16),

            // 2. Prescription Image
            Text('Prescription Image', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () {
                // Show zoomable dialog
                showDialog(
                  context: context,
                  builder: (_) => Dialog(
                    child: InteractiveViewer(
                      panEnabled: true,
                      minScale: 0.5,
                      maxScale: 4,
                      child: widget.order.prescriptionImageUrl != null
                        ? Image.network(
                            widget.order.prescriptionImageUrl!, // Assuming network or asset
                            errorBuilder: (c, e, s) => Image.asset(widget.order.prescriptionImageUrl ?? 'assets/placeholder.png', errorBuilder: (c,e,s) => const Icon(Icons.broken_image, size: 100)),
                          )
                        : const SizedBox(height:200, child: Center(child: Text("No Image"))),
                    ),
                  ),
                );
              },
              child: Container(
                height: 250,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.grey.shade100,
                ),
                child: widget.order.prescriptionImageUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          widget.order.prescriptionImageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                             // Fallback for asset if network fails or it is a local asset path
                             return Image.asset(
                                widget.order.prescriptionImageUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (c, e, s) => const Center(child: Icon(Icons.image, size: 50, color: Colors.grey)),
                             );
                          },
                        ),
                      )
                    : const Center(child: Text('No Image Provided')),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8.0),
              child: Text("Tap image to zoom", textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.grey)),
            ),

            const Divider(height: 32),
            
            // 4. Workflow Area (Form or Network Status)
            if (_workflowStep == 0) _buildPrescriptionForm(context)
            else _buildNetworkMonitoringView(context),

          ],
        ),
      ),
    );
  }

  // --- STEP 0: Form ---
  Widget _buildPrescriptionForm(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Insurance Section
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.blue.shade100),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                   const Icon(Icons.security, color: Colors.blue),
                   const SizedBox(width: 8),
                   const Text("Insurance Details", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                   const Spacer(),
                   Switch(
                     value: _isInsuranceApplicable, 
                     onChanged: (val) => setState(() => _isInsuranceApplicable = val),
                   )
                ],
              ),
              if (_isInsuranceApplicable) ...[
                 const SizedBox(height: 12),
                 DropdownButtonFormField<String>(
                   value: _selectedInsuranceProvider,
                   items: _insuranceProviders.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                   onChanged: (val) => setState(() => _selectedInsuranceProvider = val),
                   decoration: const InputDecoration(
                     labelText: "Select Insurance Provider",
                     border: OutlineInputBorder(),
                     contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)
                   ),
                 ),
                 const SizedBox(height: 12),
                 TextField(
                   controller: _insuranceNumberController,
                   decoration: const InputDecoration(
                     labelText: "Member / Card Number",
                     border: OutlineInputBorder(),
                     contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)
                   ),
                 )
              ]
            ],
          ),
        ),
      
        const SizedBox(height: 24),

        // 3. Build Invoice
        Text('Prescription Details', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        
        // Search/Add
        Autocomplete<Medicine>(
          optionsBuilder: (TextEditingValue textEditingValue) {
            if (textEditingValue.text == '') {
              return const Iterable<Medicine>.empty();
            }
            return dummyMedicines.where((Medicine option) {
              return option.name.toLowerCase().contains(textEditingValue.text.toLowerCase());
            });
          },
          displayStringForOption: (Medicine option) => "${option.name} (${option.price} RWF)",
          onSelected: (Medicine selection) {
            _addMedicine(selection);
          },
          fieldViewBuilder: (context, textEditingController, focusNode, onFieldSubmitted) {
            return TextField(
              controller: textEditingController,
              focusNode: focusNode,
              decoration: const InputDecoration(
                labelText: 'Search Medicine to Add',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
            );
          },
        ),

        const SizedBox(height: 16),

        // List of items
        if (_selectedMedicines.isEmpty)
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text('Add medicines from the prescription image above.', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
          ),
        
        ..._selectedMedicines.entries.map((entry) {
          final medicine = entry.key;
          final quantity = entry.value;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 12.0),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(medicine.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        Text("${medicine.price} RWF x $quantity"),
                      ],
                    ),
                  ),
                  Text("${medicine.price * quantity} RWF", style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
                    onPressed: () => _removeMedicine(medicine),
                  ),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, color: Colors.green),
                    onPressed: () => _addMedicine(medicine),
                  ),
                ],
              ),
            ),
          );
        }).toList(),

        const Divider(),

        // Totals
        const SizedBox(height: 24),

        // Action Button
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton.icon(
            onPressed: _selectedMedicines.isEmpty ? null : _submitForFulfillment,
            icon: const Icon(Icons.broadcast_on_personal),
            label: const Text("BROADCAST TO PHARMACY NETWORK"), // Updated Label
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.teal,
              foregroundColor: Colors.white,
              textStyle: const TextStyle(fontWeight: FontWeight.bold)
            ),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Reject Button at the bottom
         SizedBox(
          width: double.infinity,
          height: 50,
          child: OutlinedButton.icon(
            onPressed: () => _showRejectOrderDialog(),
            icon: const Icon(Icons.cancel_outlined, color: Colors.red),
            label: const Text("REJECT PRESCRIPTION", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.red),
            ),
          ),
        ),
      ],
    );
  }

  // --- STEP 1-3: Network Monitoring ---
  Widget _buildNetworkMonitoringView(BuildContext context) {
    if (_workflowStep == 1) {
      return Center(
        child: Column(
          children: const [
             CircularProgressIndicator(),
             SizedBox(height: 16),
             Text("Broadcasting to nearby partner pharmacies..."),
             Text("Checking stock & insurance compatibility...", style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      );
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
          child: Row(
             children: const [
               Icon(Icons.radar, color: Colors.orange),
               SizedBox(width: 8),
               Expanded(child: Text("Waiting for partner acceptances. First to accept will fulfill the order.", style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold))),
             ],
          ),
        ),
        const SizedBox(height: 16),
        const Text("Nearby Partners (Stock Available)", style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _networkPharmacies.length,
          itemBuilder: (context, index) {
            final p = _networkPharmacies[index];
            final status = p['status'];
            Color statusColor = Colors.grey;
            IconData statusIcon = Icons.hourglass_empty;
            
            if (status == 'accepted') {
              statusColor = Colors.green;
              statusIcon = Icons.check_circle;
            } else if (status == 'rejected') {
              statusColor = Colors.red;
              statusIcon = Icons.cancel;
            } else if (status == 'served_other') {
              statusColor = Colors.grey.shade400;
              statusIcon = Icons.block;
            }
            
            return Card(
              color: status == 'accepted' ? Colors.green.shade50 : Colors.white,
              child: ListTile(
                leading: CircleAvatar(backgroundColor: statusColor.withOpacity(0.1), child: Icon(statusIcon, color: statusColor, size: 20)),
                title: Text(p['name'], style: TextStyle(fontWeight: FontWeight.bold, color: status == 'served_other' ? Colors.grey : Colors.black)),
                subtitle: Text(p['statusText'], style: TextStyle(color: statusColor, fontWeight: FontWeight.bold)),
                trailing: status == "pending" 
                   ? TextButton(
                       onPressed: () => _rejectRequest(index), 
                       child: const Text("Reject", style: TextStyle(color: Colors.red))
                     ) 
                   : null,
              ),
            );
          }
        ),
        
        const SizedBox(height: 24),
        if (_finalfulfillmentPharmacy != null)
           Center(
             child: Column(
               children: [
                 const Icon(Icons.check_circle_outline, size: 48, color: Colors.green),
                 const SizedBox(height: 8),
                 Text("Order served by $_finalfulfillmentPharmacy", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
               ],
             ),
           )
      ],
    );
  }

  /* 
  Widget _buildSummaryRow removed as it was for direct invoice. 
  Logic replaced by _finalizeOrder dialog 
  */
}

