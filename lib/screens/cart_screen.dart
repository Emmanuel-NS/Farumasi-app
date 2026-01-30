import 'package:flutter/material.dart';
import '../services/state_service.dart';
import 'checkout_screen.dart';
import 'login_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Your Cart')),
      body: ListenableBuilder(
        listenable: StateService(),
        builder: (context, _) {
          final cartItems = StateService().cartItems;
          final total = StateService().totalAmount;

          if (cartItems.isEmpty) {
            return Center(child: Text('Your cart is empty.'));
          }

          return Column(
            children: [
              Expanded(
                child: ListView.builder(
                  itemCount: cartItems.length,
                  itemBuilder: (ctx, i) {
                    final item = cartItems[i];
                    return ListTile(
                      leading: Icon(Icons.medication),
                      title: Text(item.medicine.name),
                      subtitle: Text('${item.quantity} x ${item.medicine.price.toStringAsFixed(0)} RWF'),
                      trailing: IconButton(
                        icon: Icon(Icons.delete, color: Colors.red),
                        onPressed: () {
                          StateService().removeFromCart(item.medicine.id);
                        },
                      ),
                    );
                  },
                ),
              ),
              Container(
                padding: EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Total:', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        Text('${total.toStringAsFixed(0)} RWF', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.green)),
                      ],
                    ),
                    SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          if (StateService().isLoggedIn) {
                            Navigator.push(context, MaterialPageRoute(builder: (context) => CheckoutScreen()));
                          } else {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: Text('Login Required'),
                                content: Text('You need to login to proceed to checkout.'),
                                actions: [
                                  TextButton(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      Navigator.push(context, MaterialPageRoute(builder: (c) => LoginScreen()));
                                    },
                                    child: Text('Login'),
                                  )
                                ],
                              ),
                            );
                          }
                        },
                        child: Text('Proceed to Checkout'),
                      ),
                    )
                  ],
                ),
              )
            ],
          );
        },
      ),
    );
  }
}
