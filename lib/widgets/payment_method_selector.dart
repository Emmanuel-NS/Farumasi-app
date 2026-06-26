import 'package:flutter/material.dart';

/// Patient checkout via Flutterwave (card + Rwanda mobile money).
enum PaymentChannel {
  flutterwave,
}

extension PaymentChannelX on PaymentChannel {
  String get apiValue => 'flutterwave';

  String get label => 'Flutterwave';

  String get subtitle =>
      'MTN MoMo (default), Airtel, or card — processing fee added to your total';

  IconData get icon => Icons.payments_rounded;

  Color get accent => const Color(0xFFF5A623);

  bool get requiresPhone => true;
}

/// Must match API `PAYMENT_PROCESSING_FEE_PERCENT`.
const paymentProcessingFeePercent = 3.8;

const paymentProcessingFeeNote =
    'Payment processing fee ($paymentProcessingFeePercent% of the order amount) — paid by you, not FARUMASI.';

int paymentProcessingFeeRwf(int amountRwf) {
  if (amountRwf <= 0 || paymentProcessingFeePercent <= 0) return 0;
  return (amountRwf * paymentProcessingFeePercent / 100).round();
}

/// Order amount (medicines + delivery unless deferred) plus processing fee.
int estimatedCheckoutTotalRwf({
  required int medicinesRwf,
  int deliveryRwf = 0,
  bool deferDeliveryFee = false,
}) {
  final orderAmount = medicinesRwf + (deferDeliveryFee ? 0 : deliveryRwf);
  return orderAmount + paymentProcessingFeeRwf(orderAmount);
}

class PaymentMethodSelector extends StatelessWidget {
  const PaymentMethodSelector({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final PaymentChannel selected;
  final ValueChanged<PaymentChannel> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFBBF7D0)),
          ),
          child: Row(
            children: [
              Icon(selected.icon, color: const Color(0xFF0F5132), size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Payment',
                      style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                    ),
                    Text(
                      selected.label,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: Color(0xFF0F5132),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.check_circle, color: selected.accent, size: 22),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => onChanged(PaymentChannel.flutterwave),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF9),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1E9E68), width: 2),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: PaymentChannel.flutterwave.accent.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      PaymentChannel.flutterwave.icon,
                      color: PaymentChannel.flutterwave.accent,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Flutterwave',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: Color(0xFF0F5132),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          PaymentChannel.flutterwave.subtitle,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF475569),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.radio_button_checked_rounded,
                    color: Color(0xFF1E9E68),
                    size: 24,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class PaymentFeeBreakdown extends StatelessWidget {
  const PaymentFeeBreakdown({
    super.key,
    required this.subtotalRwf,
    this.deliveryFeeRwf = 0,
    this.deferDeliveryFee = false,
  });

  final int subtotalRwf;
  final int deliveryFeeRwf;
  final bool deferDeliveryFee;

  int get _orderAmount {
    final base = subtotalRwf + (deferDeliveryFee ? 0 : deliveryFeeRwf);
    return base;
  }

  int get _fee => paymentProcessingFeeRwf(_orderAmount);

  int get total => _orderAmount + _fee;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Payment summary',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 14,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 10),
          _row('Medicines', '$subtotalRwf RWF'),
          if (deliveryFeeRwf > 0 && !deferDeliveryFee)
            _row('Delivery', '$deliveryFeeRwf RWF'),
          if (deferDeliveryFee && deliveryFeeRwf > 0)
            _row('Delivery', 'Pay on delivery ($deliveryFeeRwf RWF)', muted: true),
          if (_fee > 0) ...[
            const SizedBox(height: 4),
            _row(
              'Processing fee ($paymentProcessingFeePercent%)',
              '$_fee RWF',
              muted: true,
            ),
            const SizedBox(height: 6),
            Text(
              paymentProcessingFeeNote,
              style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8), height: 1.35),
            ),
          ],
          const Divider(height: 22),
          _row('Total to pay now', '$total RWF', bold: true),
        ],
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false, bool muted = false}) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: bold ? 14 : 12,
              fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
              color: muted ? const Color(0xFF64748B) : const Color(0xFF334155),
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: bold ? 16 : 12,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            color: bold ? const Color(0xFF1E9E68) : const Color(0xFF1E293B),
          ),
        ),
      ],
    );
  }
}

/// Clear access-code input — patient chooses their own code (not auto-filled).
class AccessCodeInputField extends StatelessWidget {
  const AccessCodeInputField({
    super.key,
    required this.controller,
    required this.onChanged,
    this.isPickup = false,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final bool isPickup;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: controller,
          onChanged: (v) {
            final upper = v.toUpperCase();
            if (upper != v) {
              controller.value = TextEditingValue(
                text: upper,
                selection: TextSelection.collapsed(offset: upper.length),
              );
            }
            onChanged(upper);
          },
          textCapitalization: TextCapitalization.characters,
          autocorrect: false,
          enableSuggestions: false,
          decoration: InputDecoration(
            hintText: 'Type your own code (min. 4 characters)',
            helperText: isPickup
                ? 'You choose this code — share it at the pharmacy counter to collect your order.'
                : 'You choose this code — share it with the rider to confirm delivery.',
            helperMaxLines: 2,
            prefixIcon: const Icon(Icons.pin_outlined, color: Color(0xFF1E9E68)),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Color(0xFF1E9E68), width: 2),
            ),
          ),
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            color: Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFFDE68A)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline, size: 18, color: Color(0xFFD97706)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'This is not generated for you. Pick something you will remember and can tell the ${isPickup ? 'pharmacist' : 'rider'}.',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF92400E), height: 1.4),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class AccessCodeSummaryCard extends StatelessWidget {
  const AccessCodeSummaryCard({
    super.key,
    required this.code,
    required this.isPickup,
    this.onEdit,
  });

  final String code;
  final bool isPickup;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified_user_outlined, size: 20, color: Color(0xFFD97706)),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Your verification code',
                  style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF92400E)),
                ),
              ),
              if (onEdit != null)
                TextButton(
                  onPressed: onEdit,
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFFB45309),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text('Change'),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            code,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: 3,
              color: Color(0xFF78350F),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            isPickup
                ? 'Show this code at the pharmacy when you collect your order.'
                : 'Give this code to the rider to mark the delivery as complete.',
            style: const TextStyle(fontSize: 12, color: Color(0xFFB45309), height: 1.35),
          ),
        ],
      ),
    );
  }
}
