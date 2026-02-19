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
  
  String? _selectedRider;

  final List<String> _cities = ['Kigali', 'Musanze', 'Rubavu', 'Huye', 'Rusizi', 'Other'];
  
  final List<String> _kigaliNeighborhoods = [
    'Gisozi', 'Kacyiru', 'Kimironko', 'Remera', 'Nyamirambo', 'Kicukiro', 
    'Nyarutarama', 'Kanombe', 'Gikondo', 'Kagugu'
  ];

  // Mock list of favorite riders
  final List<Map<String, dynamic>> _favoriteRiders = [
    {"name": "Jean-Pierre M.", "rating": 4.8, "trips": 124, "image": "https://randomuser.me/api/portraits/men/24.jpg"}, 
    {"name": "Grace Uwase", "rating": 4.9, "trips": 89, "image": "https://randomuser.me/api/portraits/women/57.jpg"}, 
    {"name": "Emmanuel N.", "rating": 4.7, "trips": 210, "image": "https://randomuser.me/api/portraits/men/26.jpg"},
  ];

  @override
  void initState() {
    super.initState();
    _neighborhoodController = TextEditingController();
    _descriptionController = TextEditingController();
    
    // Pre-fill logic if needed
    // In a real app, you might reverse geocode StateService().userCoordinates here
    // For now, we assume Kigali default.
  }

  @override
  void dispose() {
    _neighborhoodController.dispose();
    _descriptionController.dispose();
    super.dispose();
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

    if (_neighborhoodController.text.isEmpty || _descriptionController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Please provide neighborhood and exact location.")),
      );
      return;
    }

    final fullAddress = "$_selectedCity, ${_neighborhoodController.text}, ${_descriptionController.text}";

    StateService().clearCart();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Column(
          children: [
            Icon(Icons.check_circle, size: 50, color: Colors.green),
            SizedBox(height: 8),
            Text(
              "Order Placed with ${_selectedRider ?? 'Any Rider'}!",
            ),
          ],
        ),
        content: Text(
          'Thank you ${StateService().userName ?? 'Guest'}! Your order will be delivered to:\n$fullAddress\n(GPS Confirmed)',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx); // close dialog
              Navigator.of(
                context,
              ).popUntil((route) => route.isFirst); // Go home
            },
            child: Text('OK'),
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
            
            // City Dropdown
             DropdownButtonFormField<String>(
              initialValue: _selectedCity,
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
                  setState(() {
                    _selectedCity = newValue;
                  });
                }
              },
            ),
            const SizedBox(height: 16),

            // Neighborhood Autocomplete
            Autocomplete<String>(
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
              },
              fieldViewBuilder: (BuildContext context, TextEditingController fieldTextEditingController, FocusNode fieldFocusNode, VoidCallback onFieldSubmitted) {
                // Sync controllers
                if (_neighborhoodController.text.isNotEmpty && fieldTextEditingController.text.isEmpty) {
                   fieldTextEditingController.text = _neighborhoodController.text;
                }
                
                // Allow direct editing
                 fieldTextEditingController.addListener(() {
                    _neighborhoodController.text = fieldTextEditingController.text;
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
            ),
            
            ListenableBuilder(
              listenable: StateService(),
              builder: (context, child) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (StateService().userCoordinates != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0, left: 4),
                        child: Row(
                          children: [
                            const Icon(Icons.gps_fixed, size: 16, color: Colors.blue),
                            const SizedBox(width: 4),
                            Text(
                              "GPS: ${StateService().userCoordinates}",
                              style: const TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              "• Nearest Pharmacy Found (1.2km)",
                              style: TextStyle(fontSize: 12, color: Colors.green),
                            ),
                          ],
                        ),
                      ),
                  ],
                );
              },
            ),

            const SizedBox(height: 32),
            Tooltip(
              message: "We will prioritize assigning your order to this rider if they are available nearby.",
              triggerMode: TooltipTriggerMode.tap,
              showDuration: const Duration(seconds: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Pick a Favorite Rider',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.info_outline, size: 20, color: Colors.grey),
                ],
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              "Support your trusted local drivers",
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _selectedRider,
              decoration: InputDecoration(
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                labelText: "Select Rider (Optional)",
                prefixIcon: const Icon(Icons.person_pin_circle_outlined),
                suffixIcon: _selectedRider != null 
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => setState(() => _selectedRider = null),
                    )
                  : null,
              ),
              isExpanded: true, // Allow dropdown to fill width
              // Fix overflow by providing a selectedItemBuilder
              selectedItemBuilder: (BuildContext context) {
                return _favoriteRiders.map<Widget>((rider) {
                  return Row(
                    children: [
                      // No image in selected view to save space, or keep it small
                       CircleAvatar(
                        radius: 10,
                        backgroundImage: NetworkImage(rider['image']),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          rider['name'],
                          style: const TextStyle(fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  );
                }).toList();
              },
              items: _favoriteRiders.map((rider) {
                return DropdownMenuItem<String>(
                  value: rider['name'],
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 12,
                        backgroundImage: NetworkImage(rider['image']),
                        backgroundColor: Colors.grey.shade300,
                      ),
                      const SizedBox(width: 12),
                      Expanded( // Use Expanded to take up remaining space
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              rider['name'], 
                              style: const TextStyle(fontWeight: FontWeight.bold), 
                              overflow: TextOverflow.ellipsis
                            ),
                            Row(
                              children: [
                                const Icon(Icons.star, size: 10, color: Colors.amber),
                                const SizedBox(width: 2),
                                Expanded(
                                  child: Text(
                                    "${rider['rating']} (${rider['trips']} trips)",
                                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            )
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedRider = value;
                });
              },
            ),

            const SizedBox(height: 32),
            Text(
              'Payment Method',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            Card(
              elevation: 0,
              color: Colors.grey.shade100,
              child: ListTile(
                leading: Icon(Icons.credit_card, color: Colors.blue),
                title: Text('Credit / Debit Card'),
                trailing: Radio(
                  value: true,
                  groupValue: true,
                  onChanged: (v) {},
                  activeColor: Colors.green,
                ),
              ),
            ),
            Card(
              elevation: 0,
              color: Colors.grey.shade100,
              child: ListTile(
                leading: Icon(Icons.phone_android, color: Colors.orange),
                title: Text('Mobile Money (Momo)'),
                trailing: Radio(
                  value: false,
                  groupValue: true,
                  onChanged: (v) {},
                ),
              ),
            ),

            SizedBox(height: 40),
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
                          Text('Standard Price', style: TextStyle(color: Colors.grey.shade700)),
                          Text('${total.toStringAsFixed(0)} RWF', style: TextStyle(decoration: TextDecoration.lineThrough, color: Colors.grey)),
                        ],
                      ),
                      SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.flash_on, size: 16, color: Colors.orange.shade800),
                              SizedBox(width: 4),
                              Text('Smart Pharmacy Deal', style: TextStyle(color: Colors.orange.shade800, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          Text('-${discount.toStringAsFixed(0)} RWF', style: TextStyle(color: Colors.orange.shade800, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton(
                          onPressed: () {
                             // Using a simple dialog for immediate context, could also nav to HelpScreen
                             showDialog(
                               context: context,
                               builder: (ctx) => AlertDialog(
                                 title: Text("Why the price drop?"),
                                 content: Text(
                                   "Medicines are listed at maximum retail price for consistency.\n\n"
                                   "When you checkout, we automatically route your order to the partner pharmacy with the best available price for your entire basket.\n\n"
                                   "The discount shown reflects the difference between the standard list price and the actual pharmacy price."
                                 ),
                                 actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: Text("Got it"))],
                               ),
                             );
                          },
                          style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size(50, 20), tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                          child: Text("Need to know why price reduced?", style: TextStyle(fontSize: 12, decoration: TextDecoration.underline, color: Colors.blue)),
                        ),
                      ),
                      Divider(height: 24),
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
                  'COMPLETE PAYMENT',
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
