import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'checkout_wizard_screen.dart';

/// Patient-portal parity: cart is the 5-step checkout wizard (not a separate summary page).
class CartScreen extends ConsumerWidget {
  final bool isEmbedded;
  const CartScreen({super.key, this.isEmbedded = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CheckoutWizardScreen(isEmbedded: isEmbedded);
  }
}
