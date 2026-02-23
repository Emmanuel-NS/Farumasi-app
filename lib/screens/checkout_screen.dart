import 'package:flutter/material.dart';
import '../services/state_service.dart';
import 'auth_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  // Address Fields
  String _selectedCity = 'Kigali';
  late TextEditingController _neighborhoodController;
  late TextEditingController _descriptionController;
  late TextEditingController _phoneController;
  bool _addressError = false;
  

  final List<String> _cities = ['Kigali', 'Musanze', 'Rubavu', 'Huye', 'Rusizi', 'Other'];
  
  final List<String> _kigaliNeighborhoods = [
    'Gisozi', 'Kacyiru', 'Kimironko', 'Remera', 'Nyamirambo', 'Kicukiro', 
    'Nyarutarama', 'Kanombe', 'Gikondo', 'Kagugu'
  ];

  @override
  void initState() {
    super.initState();
    _neighborhoodController = TextEditingController();
    _descriptionController = TextEditingController();
    _phoneController = TextEditingController();
    
    // Pre-fill logic if needed
    // In a real app, you might reverse geocode StateService().userCoordinates here
    // For now, we assume Kigali default.
  }

  @override
  void dispose() {
    _neighborhoodController.dispose();
    _descriptionController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _showLocationEditor() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            return SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Delivery Address", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // City Dropdown
                  DropdownButtonFormField<String>(
                    value: _selectedCity,
                    decoration: const InputDecoration(
                      labelText: 'City',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.location_city),
                    ),
                    items: _cities.map((String city) {
                      return DropdownMenuItem<String>(
                        value: city,
                        child: Text(city),
                      );
                    }).toList(),
                    onChanged: (String? newValue) {
                      if (newValue != null) {
                        setModalState(() {
                          _selectedCity = newValue;
                        });
                        // Also update parent state
                        setState(() {}); 
                      }
                    },
                  ),
                  const SizedBox(height: 16),

                  // Neighborhood Autocomplete
                  Autocomplete<String>(
                    initialValue: TextEditingValue(text: _neighborhoodController.text),
                    optionsBuilder: (TextEditingValue textEditingValue) {
                      if (textEditingValue.text == '') {
                        return const Iterable<String>.empty();
                      }
                      return _kigaliNeighborhoods.where((String option) {
                        return option.toLowerCase().contains(textEditingValue.text.toLowerCase());
                      });
                    },
                    onSelected: (String selection) {
                      _neighborhoodController.text = selection;
                      setState(() {});
                    },
                    fieldViewBuilder: (BuildContext context, TextEditingController fieldTextEditingController, FocusNode fieldFocusNode, VoidCallback onFieldSubmitted) {
                      // Initial sync
                      if (_neighborhoodController.text.isNotEmpty && fieldTextEditingController.text.isEmpty) {
                         fieldTextEditingController.text = _neighborhoodController.text;
                      }
                       fieldTextEditingController.addListener(() {
                          _neighborhoodController.text = fieldTextEditingController.text;
                          // Don't call setState here aggressively, maybe on submit or focus loss?
                          // Actually for TextField listeners inside modal, we probably don't need to rebuild parent every char.
                       });

                      return TextField(
                        controller: fieldTextEditingController,
                        focusNode: fieldFocusNode,
                        decoration: const InputDecoration(
                          labelText: 'Neighborhood / Area',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.map),
                          hintText: "Select or type location",
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),

                  // Exact Description
                  TextField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Exact Location Description',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.home),
                      hintText: "Street name, house number, landmarks...",
                    ),
                    maxLines: 2,
                    onChanged: (_) => setState((){}), 
                  ),
                  const SizedBox(height: 16),

                  // Contact Phone
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Contact Phone Number',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.phone),
                      hintText: "07...",
                    ),
                    onChanged: (_) => setState((){}), 
                  ),
                  
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                         setState(() {}); // Ensure parent rebuilds with new values
                         Navigator.pop(ctx);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text("Use This Location", style: TextStyle(color: Colors.white, fontSize: 16)),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  void _placeOrder() {
    if (!StateService().isLoggedIn) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Login Required'),
          content: Text('You must be logged in to complete payment.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (c) => const AuthScreen()),
                );
              },
              child: Text('Login Now'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
          ],
        ),
      );
      return;
    }

    List<String> missingFields = [];
    if (_neighborhoodController.text.isEmpty) missingFields.add("Neighborhood");
    if (_descriptionController.text.isEmpty) missingFields.add("Exact Location");
    if (_phoneController.text.isEmpty) missingFields.add("Phone Number");

    if (missingFields.isNotEmpty) {
      setState(() {
        _addressError = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Please provide the following: ${missingFields.join(', ')}"),
          backgroundColor: Colors.red,
        ),
      );
      // Automatically redirect to fill the form
      _showLocationEditor();
      return;
    }

    setState(() {
      _addressError = false;
    });

    final fullAddress = "$_selectedCity, ${_neighborhoodController.text}, ${_descriptionController.text}\nPhone: ${_phoneController.text}";

    StateService().clearCart();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Column(
          children: [
            Icon(Icons.payment, size: 50, color: Colors.blue),
            SizedBox(height: 8),
            Text("Proceed to Payment"),
          ],
        ),
        content: Text(
          "You are now being redirected to the secure payment gateway to complete your purchase of ${StateService().totalAmount} RWF.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
             child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              // Simulate success after "payment"
              showDialog(
                context: context,
                builder: (c) => AlertDialog(
                  title: const Column(
                    children: [
                     Icon(Icons.check_circle, size: 50, color: Colors.green),
                     SizedBox(height: 8),
                     Text("Payment Successful"),
                    ],
                  ),
                  content: Text("Your order has been placed successfully!\n\nDelivering to:\n$fullAddress"),
                  actions: [
                    TextButton(
                      onPressed: () {
                        Navigator.pop(c);
                        Navigator.of(context).popUntil((route) => route.isFirst);
                      },
                      child: const Text("Done"),
                    )
                  ],
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
            child: const Text('Pay Now'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Checkout'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Delivery Details',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            

            // Single "Add Location" Option with Overlay
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _addressError ? Colors.red.shade50 : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _addressError ? Colors.red : Colors.grey.shade300, width: _addressError ? 2 : 1),
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.shade100,
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.location_on, color: Colors.green),
                          SizedBox(width: 8),
                          Text(
                            "Delivery Location",
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      TextButton(
                        onPressed: _showLocationEditor,
                        child: Text(
                          _neighborhoodController.text.isEmpty ? "Add Location" : "Edit",
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const Divider(),
                  if (_neighborhoodController.text.isNotEmpty) ...[
                    Text(
                      "$_selectedCity, ${_neighborhoodController.text}",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _descriptionController.text,
                      style: TextStyle(color: Colors.grey.shade700),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.phone, size: 14, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(
                          _phoneController.text,
                          style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                  ] else 
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8.0),
                      child: Text(
                        "Please add your delivery address.",
                        style: TextStyle(color: Colors.red),
                      ),
                    ),
                  
                  // GPS Info (Moved inside)
                  ListenableBuilder(
                    listenable: StateService(),
                    builder: (context, child) {
                      if (StateService().userCoordinates != null) {
                        return Padding(
                          padding: const EdgeInsets.only(top: 8.0),
                          child: Row(
                            children: [
                              const Icon(Icons.gps_fixed, size: 14, color: Colors.blue),
                              const SizedBox(width: 4),
                              Text(
                                "GPS: ${StateService().userCoordinates}",
                                style: const TextStyle(fontSize: 11, color: Colors.blue),
                              ),
                            ],
                          ),
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),
                ],
              ),
            ),


            const SizedBox(height: 32),
            Container(
              padding: EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: ListenableBuilder(
                listenable: StateService(),
                builder: (context, _) {
                  final total = StateService().totalAmount;
                  final discount = total * 0.12; // 12% Reduction logic
                  final discountedTotal = total - discount;
                  final deliveryFee = 1500.0;
                  final grandTotal = discountedTotal + deliveryFee;
                  
                  return Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Pharmacy Subtotal', style: TextStyle(fontWeight: FontWeight.bold)),
                          Text('${discountedTotal.toStringAsFixed(0)} RWF', style: TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                      SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Delivery Fee', style: TextStyle(color: Colors.grey.shade700)),
                          Text('${deliveryFee.toStringAsFixed(0)} RWF', style: TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Divider(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'TOTAL TO PAY',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.green.shade900,
                            ),
                          ),
                          Text(
                            '${grandTotal.toStringAsFixed(0)} RWF',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Colors.green.shade900,
                            ),
                          ),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
            SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _placeOrder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 4,
                ),
                child: Text(
                  'PROCEED TO PAYMENT',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
            ),
            if (!StateService().isLoggedIn)
              Padding(
                padding: const EdgeInsets.only(top: 12.0),
                child: Center(
                  child: Text(
                    "Login required to finish order",
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
