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
        PaymentChannel.card => 'Card (Visa / Mastercard)',
      };

  String get subtitle => switch (this) {
        PaymentChannel.mtnMomo => 'Pay with MTN Mobile Money',
        PaymentChannel.airtelMoney => 'Pay with Airtel Money',
        PaymentChannel.card => 'Debit or credit card on Pesapal',
      };

  IconData get icon => switch (this) {
        PaymentChannel.mtnMomo => Icons.phone_android,
        PaymentChannel.airtelMoney => Icons.sim_card_outlined,
        PaymentChannel.card => Icons.credit_card,
      };

  bool get requiresPhone => this != PaymentChannel.card;
}

/// Must match API `PAYMENT_PROCESSING_FEE_PERCENT` — fee is charged to the patient.
const paymentProcessingFeePercent = 3.5;

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
      children: PaymentChannel.values.map((method) {
        final isSelected = method == selected;
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Material(
            color: isSelected ? const Color(0xFFECFDF5) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            child: InkWell(
              onTap: () => onChanged(method),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isSelected
                        ? const Color(0xFF1E9E68)
                        : const Color(0xFFE2E8F0),
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      method.icon,
                      color: isSelected
                          ? const Color(0xFF1E9E68)
                          : const Color(0xFF64748B),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            method.label,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: isSelected
                                  ? const Color(0xFF0F5132)
                                  : const Color(0xFF1E293B),
                            ),
                          ),
                          Text(
                            method.subtitle,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (method == PaymentChannel.mtnMomo)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E9E68),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'Default',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    const SizedBox(width: 8),
                    Icon(
                      isSelected
                          ? Icons.radio_button_checked
                          : Icons.radio_button_off,
                      color: isSelected
                          ? const Color(0xFF1E9E68)
                          : const Color(0xFFCBD5E1),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          _row('Order amount', '$_orderAmount RWF'),
          if (_fee > 0) ...[
            const SizedBox(height: 6),
            _row(
              'Processing fee ($paymentProcessingFeePercent%)',
              '$_fee RWF',
              muted: true,
            ),
            const Padding(
              padding: EdgeInsets.only(top: 4),
              child: Text(
                'Payment processing fee is charged to you, not FARUMASI.',
                style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
              ),
            ),
          ],
          const Divider(height: 20),
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
            fontSize: bold ? 15 : 12,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            color: bold ? const Color(0xFF1E9E68) : const Color(0xFF1E293B),
          ),
        ),
      ],
    );
  }
}
