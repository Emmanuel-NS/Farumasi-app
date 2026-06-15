import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/repositories/patient_repository.dart';

/// Retry Pesapal checkout for orders with failed or pending payment.
class OrderPaymentRetry {
  OrderPaymentRetry._();

  static bool canRetry(PatientOrder order) {
    if (order.status == 'cancelled') return false;
    final status = order.paymentStatus.toLowerCase();
    return status == 'failed' || status == 'pending';
  }

  static Future<String?> promptPhone(
    BuildContext context, {
    String? initial,
  }) async {
    final controller = TextEditingController(text: initial?.trim() ?? '');
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Payment phone number'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.phone,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Mobile money number',
            hintText: '07XXXXXXXX',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final phone = controller.text.trim();
              if (phone.isEmpty) return;
              Navigator.pop(ctx, phone);
            },
            child: const Text('Continue to pay'),
          ),
        ],
      ),
    );
  }

  static Future<bool> retry({
    required BuildContext context,
    required PatientOrder order,
    required String phone,
    String? name,
    String? email,
    VoidCallback? onPaid,
  }) async {
    try {
      final init = await PatientRepository.instance.initiatePesapal(
        order.id,
        phone: phone,
        name: name,
        email: email,
        redirectUrl:
            '${PatientRepository.apiOrigin}/payment-return?order_id=${order.id}',
      );

      if (init.checkoutUrl != null && init.checkoutUrl!.isNotEmpty) {
        final uri = Uri.parse(init.checkoutUrl!);
        if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
          throw Exception('Could not open Pesapal checkout.');
        }
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Complete payment in your browser, then pull to refresh this order.',
              ),
              duration: Duration(seconds: 6),
            ),
          );
        }
        return true;
      }

      if (init.paymentStatus == 'paid') {
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
