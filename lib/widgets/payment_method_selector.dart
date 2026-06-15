import 'package:flutter/material.dart';

/// Patient-facing payment channels (Pesapal hosted checkout).
enum PaymentChannel {
  mtnMomo,
  airtelMoney,
  card,
}

extension PaymentChannelX on PaymentChannel {
  String get apiValue => switch (this) {
        PaymentChannel.mtnMomo => 'mtn_momo',
        PaymentChannel.airtelMoney => 'airtel_money',
        PaymentChannel.card => 'card',
      };

  String get label => switch (this) {
        PaymentChannel.mtnMomo => 'MTN MoMo',
        PaymentChannel.airtelMoney => 'Airtel Money',
        PaymentChannel.card => 'Card',
      };

  String get subtitle => switch (this) {
        PaymentChannel.mtnMomo => 'Pay with MTN Mobile Money',
        PaymentChannel.airtelMoney => 'Pay with Airtel Money',
        PaymentChannel.card => 'Visa or Mastercard via Pesapal',
      };

  IconData get icon => switch (this) {
        PaymentChannel.mtnMomo => Icons.phone_android_rounded,
        PaymentChannel.airtelMoney => Icons.sim_card_rounded,
        PaymentChannel.card => Icons.credit_card_rounded,
      };

  Color get accent => switch (this) {
        PaymentChannel.mtnMomo => const Color(0xFFF5B800),
        PaymentChannel.airtelMoney => const Color(0xFFE4002B),
        PaymentChannel.card => const Color(0xFF2563EB),
      };

  bool get requiresPhone => this != PaymentChannel.card;
}

/// Must match API `PAYMENT_PROCESSING_FEE_PERCENT`.
const paymentProcessingFeePercent = 3.5;

const paymentProcessingFeeNote =
    'Includes a small Pesapal processing fee (${paymentProcessingFeePercent}% of the order amount).';

int paymentProcessingFeeRwf(int amountRwf) {
  if (amountRwf <= 0 || paymentProcessingFeePercent <= 0) return 0;
  return (amountRwf * paymentProcessingFeePercent / 100).round();
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
                      'Selected',
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
        ...PaymentChannel.values.map((method) {
          final isSelected = method == selected;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => onChanged(method),
                borderRadius: BorderRadius.circular(16),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeOutCubic,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFF0FDF9) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFF1E9E68)
                          : const Color(0xFFE2E8F0),
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: isSelected
                        ? const [
                            BoxShadow(
                              color: Color(0x141E9E68),
                              blurRadius: 10,
                              offset: Offset(0, 3),
                            ),
                          ]
                        : null,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: method.accent.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(method.icon, color: method.accent, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  method.label,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                    color: isSelected
                                        ? const Color(0xFF0F5132)
                                        : const Color(0xFF1E293B),
                                  ),
                                ),
                                if (method == PaymentChannel.mtnMomo) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 7,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF1E9E68),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: const Text(
                                      'Default',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              method.subtitle,
                              style: TextStyle(
                                fontSize: 11,
                                color: isSelected
                                    ? const Color(0xFF475569)
                                    : const Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 180),
                        child: Icon(
                          isSelected
                              ? Icons.radio_button_checked_rounded
                              : Icons.radio_button_off_rounded,
                          key: ValueKey(isSelected),
                          color: isSelected
                              ? const Color(0xFF1E9E68)
                              : const Color(0xFFCBD5E1),
                          size: 24,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }),
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
          _row('Medicines & items', '$_orderAmount RWF'),
          if (_fee > 0) ...[
            const SizedBox(height: 8),
            _row(
              'Pesapal fee ($paymentProcessingFeePercent%)',
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
