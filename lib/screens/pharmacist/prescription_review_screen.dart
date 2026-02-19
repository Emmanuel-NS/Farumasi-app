import 'package:flutter/material.dart';
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

  double get _pharmacySubtotal {
    double total = 0.0;
    _selectedMedicines.forEach((medicine, quantity) {
      total += medicine.price * quantity;
    });
    return total;
  }

  double get _totalPrice => _pharmacySubtotal + _deliveryFee;

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

  void _sendInvoice() {
    // In a real app, update the order via a service
    // widget.order.items = _selectedMedicines.keys.map((m) {
    //   // Note: Medicine model doesn't have quantity, we might need a wrapper or CartItem
    //   // For now, assume simple list
    //   return m;
    // }).toList();
    
    // Simulating updating the order
    widget.order.status = OrderStatus.paymentPending;
    widget.order.pharmacyPrice = _pharmacySubtotal;
    // Assuming delivery fee is handled elsewhere or is part of the order details,
    // but the model has `deliveryFee`
    widget.order.deliveryFee = _deliveryFee;

    // We can't easily add quantity to List<Medicine> items directly without a wrapper in the model,
    // but the prompt says 'Add to list with Quantity and Price'.
    // The model `PrescriptionOrder` has `List<Medicine> items`.
    // I'll just add the medicines repeated for now or assume quantity handled elsewhere.
    // However, the `Medicine` class is immutable and doesn't hold quantity. 
    // Usually there's a `CartItem` or `OrderItem`.
    // The `CartItem` model exists in `models.dart`. Ideally `PrescriptionOrder` should use `CartItem` or similar.
    // Looking at `PrescriptionOrder` definition: `List<Medicine> items;`
    // So distinct items are stored as list of Medicine. So if quantity 2, maybe add twice?
    // Or just ignore quantity persistence for this mock.
    
    // For this mock, I'll just rebuild the list.
    List<Medicine> newItems = [];
    _selectedMedicines.forEach((medicine, quantity) {
      for(int i=0; i<quantity; i++) {
        newItems.add(medicine);
      }
    });
    widget.order.items = newItems;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Invoice sent to patient! Order status updated.')),
    );
    Navigator.pop(context);
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
    return Scaffold(
      appBar: AppBar(
        title: Text('Review Prediction #${widget.order.id}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Patient Info
            Card(
              child: ListTile(
                leading: const Icon(Icons.person),
                title: Text(widget.order.patientName),
                subtitle: Text(widget.order.patientLocationName),
              ),
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

            // 3. Build Invoice
            Text('Build Invoice', style: Theme.of(context).textTheme.titleLarge),
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
                child: Text('No medicines added yet.', style: TextStyle(color: Colors.grey)),
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
            _buildSummaryRow("Subtotal", "${_pharmacySubtotal.toStringAsFixed(0)} RWF"),
            _buildSummaryRow("Delivery Fee", "${_deliveryFee.toStringAsFixed(0)} RWF"),
            const Divider(),
            _buildSummaryRow("Total", "${_totalPrice.toStringAsFixed(0)} RWF", isTotal: true),

            const SizedBox(height: 24),

            // Action Button
            ElevatedButton.icon(
              onPressed: _selectedMedicines.isEmpty ? null : _sendInvoice,
              icon: const Icon(Icons.send),
              label: const Text("SEND INVOICE TO PATIENT"),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: isTotal ? 18 : 16, fontWeight: isTotal ? FontWeight.bold : FontWeight.normal)),
          Text(value, style: TextStyle(fontSize: isTotal ? 18 : 16, fontWeight: isTotal ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}
