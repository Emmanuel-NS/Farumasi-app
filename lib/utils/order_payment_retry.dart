import 'package:flutter/material.dart';

import '../api/repositories/patient_repository.dart';
import '../screens/flutterwave_checkout_screen.dart';
import '../widgets/payment_method_selector.dart';

/// Retry Flutterwave checkout for orders with failed or pending payment.
class OrderPaymentRetry {
  OrderPaymentRetry._();

  static bool canRetry(PatientOrder order) {
    if (order.status == 'cancelled') return false;
    final status = order.paymentStatus.toLowerCase();
    return status == 'failed' || status == 'pending';
  }

  static Future<PaymentRetryInput?> showPaymentSheet(
    BuildContext context, {
    String? initialPhone,
    int orderAmountRwf = 0,
  }) async {
    var channel = PaymentChannel.mtnMomo;
    final phoneController = TextEditingController(text: initialPhone?.trim() ?? '');

    return showModalBottomSheet<PaymentRetryInput>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            final phoneReady = !channel.requiresPhone || phoneController.text.trim().length >= 9;

            return Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                16,
                20,
                20 + MediaQuery.of(ctx).viewInsets.bottom,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Try payment again',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 14),
                    PaymentMethodSelector(
                      selected: channel,
                      onChanged: (m) => setModalState(() => channel = m),
                    ),
                    if (channel.requiresPhone) ...[
                      const SizedBox(height: 14),
                      TextField(
                        controller: phoneController,
                        keyboardType: TextInputType.phone,
                        onChanged: (_) => setModalState(() {}),
                        decoration: InputDecoration(
                          labelText: channel == PaymentChannel.airtelMoney
                              ? 'Airtel Money number'
                              : 'MTN MoMo number',
                          hintText: '078XXXXXXX',
                          border: const OutlineInputBorder(),
                        ),
                      ),
                    ],
                    if (orderAmountRwf > 0) ...[
                      const SizedBox(height: 12),
                      PaymentFeeBreakdown(subtotalRwf: orderAmountRwf),
                    ],
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: phoneReady
                          ? () {
                              Navigator.pop(
                                ctx,
                                PaymentRetryInput(
                                  channel: channel,
                                  phone: phoneController.text.trim(),
                                ),
                              );
                            }
                          : null,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF1E9E68),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('Continue to Flutterwave'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  static Future<bool> retry({
    required BuildContext context,
    required PatientOrder order,
    required PaymentChannel channel,
    required String phone,
    String? name,
    String? email,
    VoidCallback? onPaid,
  }) async {
    try {
      final init = await PatientRepository.instance.initiateFlutterwave(
        order.id,
        phone: phone,
        name: name,
        email: email,
        redirectUrl:
            '${PatientRepository.apiOrigin}/payment-return?order_id=${order.id}',
        paymentMethod: channel.apiValue,
      );

      if (init.checkoutUrl != null && init.checkoutUrl!.isNotEmpty) {
        if (context.mounted) {
          await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) =>
                  FlutterwaveCheckoutScreen(checkoutUrl: init.checkoutUrl!),
            ),
          );
        }
      } else if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              init.message.isNotEmpty
                  ? init.message
                  : 'Complete payment on Flutterwave, then pull to refresh.',
            ),
            duration: const Duration(seconds: 8),
          ),
        );
      }

      if (init.paymentStatus != 'paid') {
        await PatientRepository.instance.waitUntilPaid(order.id);
      }

      onPaid?.call();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment confirmed.'),
            backgroundColor: Color(0xFF1E9E68),
          ),
        );
      }
      return true;
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
      return false;
    }
  }
}

class PaymentRetryInput {
  const PaymentRetryInput({required this.channel, required this.phone});

  final PaymentChannel channel;
  final String phone;
}
