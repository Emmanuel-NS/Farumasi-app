import 'package:flutter/material.dart';
import '../services/state_service.dart';

class CheckoutScreen extends StatelessWidget {
  const CheckoutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Checkout')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text('Payment & Delivery', style: Theme.of(context).textTheme.headlineMedium),
            SizedBox(height: 20),
            TextFormField(
              decoration: InputDecoration(labelText: 'Delivery Address'),
            ),
            SizedBox(height: 10),
            TextFormField(
              decoration: InputDecoration(labelText: 'Card Number'),
            ),
            Spacer(),
            ListenableBuilder(
              listenable: StateService(),
              builder: (context, _) {
                 final total = StateService().totalAmount;
                 return Text('Total to Pay: ${total.toStringAsFixed(0)} RWF', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18));
              }
            ),
            SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  StateService().clearCart();
                  showDialog(
                    context: context, 
                    builder: (ctx) => AlertDialog(
                      title: Text('Order Placed!'),
                      content: Text('Thank you for your order.'),
                      actions: [
                        TextButton(onPressed: () {
                           Navigator.pop(ctx); // close dialog
                           Navigator.pop(context); // close checkout
                        }, child: Text('OK'))
                      ],
                    )
                  );
                },
                child: Text('Pay Now'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
