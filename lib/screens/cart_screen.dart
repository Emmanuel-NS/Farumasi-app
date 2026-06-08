import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/sell_mode.dart';
import '../services/state_service.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../core/router.dart';
import 'checkout_wizard_screen.dart';
import '../widgets/gated_navigation.dart';
import 'prescriptions_screen.dart';

class CartScreen extends ConsumerWidget {
  final bool isEmbedded;
  const CartScreen({super.key, this.isEmbedded = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isLoggedIn = ref.watch(authProvider).status == AuthStatus.authenticated;
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: isEmbedded ? null : AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        title: Text('My Cart', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(Icons.delete_outline, color: Colors.grey),
            tooltip: "Clear Cart",
            onPressed: () {
              if (StateService().cartItems.isNotEmpty) {
                _showClearCartDialog(context);
              }
            },
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: 1000.0),
          child: ListenableBuilder(
            listenable: StateService(),
            builder: (context, _) {
              final cartItems = StateService().cartItems;
              final total = StateService().totalAmount;

              if (cartItems.isEmpty) {
                return _buildEmptyState(context, ref, isLoggedIn);
              }

              return Column(
                children: [
                  Expanded(
                    child: ListView.separated(
                      padding: EdgeInsets.all(16),
                      itemCount: cartItems.length,
                      separatorBuilder: (ctx, i) => SizedBox(height: 16),
                      itemBuilder: (ctx, i) {
                        return _CartItemCard(item: cartItems[i]);
                      },
                    ),
                  ),
                  _buildSummarySection(context, ref, total, isLoggedIn),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(
    BuildContext context,
    WidgetRef ref,
    bool isLoggedIn,
  ) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF1E9E68),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.shopping_cart_outlined,
              size: 64,
              color: Colors.white,
            ),
          ),
          SizedBox(height: 24),
          Text(
            "Your cart is empty",
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: 8),
          Text(
            "Looks like you haven't added anything yet.",
            style: TextStyle(color: Colors.grey.shade600),
          ),
          SizedBox(height: 32),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 48),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ElevatedButton(
                  onPressed: () {
                    if (!isLoggedIn) {
                      context.go(AppRoutes.auth);
                      return;
                    }
                    pushGatedRoute(
                      context,
                      feature: 'prescriptions',
                      requirePin: true,
                      child: const PrescriptionsScreen(),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E9E68),
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text("Upload Prescription"),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildSummarySection(
    BuildContext context,
    WidgetRef ref,
    double subtotal,
    bool isLoggedIn,
  ) {
    const double deliveryFee = 1500;
    final double total = subtotal + deliveryFee;

    return Container(
      padding: EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(30),
          topRight: Radius.circular(30),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: Offset(0, -5),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildSummaryRow("Subtotal", subtotal),
          if (StateService().partialSubtotal > 0)
            _buildSummaryRow("Partial items", StateService().partialSubtotal),
          if (StateService().packSubtotal > 0 &&
              StateService().partialSubtotal > 0)
            _buildSummaryRow("Pack items", StateService().packSubtotal),
          SizedBox(height: 12),
          _buildSummaryRow("Delivery Fee", deliveryFee),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16.0),
            child: Divider(color: Colors.grey.shade200),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Total",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              Text(
                "${total.toStringAsFixed(0)} RWF",
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1E9E68),
                ),
              ),
            ],
          ),
          SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                if (!isLoggedIn) {
                  context.go(AppRoutes.auth);
                  return;
                }
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const CheckoutWizardScreen(),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E9E68),
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 4,
                shadowColor: const Color(0xFF1E9E68).withOpacity(0.4),
              ),
              child: Text(
                isLoggedIn ? "Proceed to Checkout" : "Sign In to Checkout",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, double amount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.grey.shade600, fontSize: 15),
        ),
        Text(
          "${amount.toStringAsFixed(0)} RWF",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ],
    );
  }

  void _showClearCartDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text("Clear Cart"),
        content: Text(
          "Are you sure you want to remove all items from your cart?",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text("Cancel", style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () {
              StateService().clearCart();
              Navigator.pop(context);
            },
            child: Text("Clear", style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _CartItemCard extends StatelessWidget {
  final CartItem item;

  const _CartItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      padding: EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              image: DecorationImage(
                image: NetworkImage(item.medicine.imageUrl),
                fit: BoxFit.cover,
                onError: (_, __) => {},
              ),
            ),
            child: item.medicine.imageUrl.isEmpty
                ? Icon(Icons.medication, color: const Color(0xFF1E9E68))
                : null,
          ),
          SizedBox(width: 16),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.medicine.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (item.sellMode == SellMode.partial)
                            Container(
                              margin: const EdgeInsets.only(top: 4),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEDE9FE),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                'Partial · ${item.medicine.partialUnitName ?? 'unit'}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF6D28D9),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    InkWell(
                      onTap: () => _confirmRemove(context),
                      child: Icon(Icons.close, size: 18, color: Colors.grey),
                    ),
                  ],
                ),
                SizedBox(height: 4),
                Text(
                  "Manufactured by ${item.medicine.manufacturer}",
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
                SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                Text(
                  "${item.unitPrice.toStringAsFixed(0)} RWF",
                  style: TextStyle(
                    color: const Color(0xFF1E9E68),
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                    Row(
                      children: [
                        _buildQtyBtn(
                          Icons.remove,
                          () => StateService().decrementQuantity(item.lineKey),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12.0),
                          child: Text(
                            "${item.quantity}",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        _buildQtyBtn(
                          Icons.add,
                          () => StateService().incrementQuantity(item.lineKey),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQtyBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 16, color: Colors.black87),
      ),
    );
  }

  void _confirmRemove(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text("Remove Item"),
        content: Text("Remove ${item.medicine.name} from cart?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text("Cancel", style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () {
              StateService().removeFromCart(item.lineKey);
              Navigator.pop(context);
            },
            child: Text("Remove", style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
