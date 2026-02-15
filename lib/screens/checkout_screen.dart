import 'package:flutter/material.dart';
import '../services/state_service.dart';
import 'auth_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _addressController = TextEditingController();
  String? _locationCoordinates;
  bool _isLoadingLocation = false;

  void _pickLocation() async {
    setState(() => _isLoadingLocation = true);
    // Simulate fetching location
    await Future.delayed(Duration(seconds: 2));
    if (mounted) {
      setState(() {
        _isLoadingLocation = false;
        _locationCoordinates = "-1.9706, 30.1044"; // Mock Kigali coordinates
        _addressController.text = "Kigali, Rwanda (Pinned Location)";
      });
    }
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

    if (_addressController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Please provide a delivery address.")),
      );
      return;
    }

    StateService().clearCart();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Column(
          children: [
            Icon(Icons.check_circle, size: 50, color: Colors.green),
            SizedBox(height: 8),
            Text('Order Placed!'),
          ],
        ),
        content: Text(
          'Thank you ${StateService().userName ?? 'Guest'}! Your order will be delivered to:\n${_addressController.text}',
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
            TextField(
              controller: _addressController,
              decoration: InputDecoration(
                labelText: 'Delivery Address',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.location_on),
              ),
              maxLines: 2,
            ),
            SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _isLoadingLocation ? null : _pickLocation,
              icon: _isLoadingLocation
                  ? SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(Icons.my_location),
              label: Text(
                _locationCoordinates == null
                    ? 'Auto Pick My Location'
                    : 'Location Picked! ($_locationCoordinates)',
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.green,
                side: BorderSide(color: Colors.green),
                padding: EdgeInsets.all(16),
              ),
            ),

            SizedBox(height: 32),
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
                  return Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Subtotal',
                            style: TextStyle(color: Colors.grey.shade700),
                          ),
                          Text(
                            '${total.toStringAsFixed(0)} RWF',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Delivery Fee',
                            style: TextStyle(color: Colors.grey.shade700),
                          ),
                          Text(
                            '1500 RWF',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Divider(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'TOTAL',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.green.shade900,
                            ),
                          ),
                          Text(
                            '${(total + 1500).toStringAsFixed(0)} RWF',
                            style: TextStyle(
                              fontSize: 20,
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
