import 'package:flutter/material.dart';

/// Patient checkout methods — maps to API `payment_method`.
enum PaymentChannel {
  mtnMomo,
  airtelMoney,
  card,
}

extension PaymentChannelX on PaymentChannel {
  String get apiValue {
    switch (this) {
      case PaymentChannel.mtnMomo:
        return 'mtn_momo';
      case PaymentChannel.airtelMoney:
        return 'airtel_money';
      case PaymentChannel.card:
        return 'card';
    }
  }

  String get label {
    switch (this) {
      case PaymentChannel.mtnMomo:
        return 'MTN MoMo';
      case PaymentChannel.airtelMoney:
        return 'Airtel Money';
      case PaymentChannel.card:
        return 'Debit / Credit Card';
    }
  }

  String get network {
    switch (this) {
      case PaymentChannel.mtnMomo:
        return 'MTN Mobile Money';
      case PaymentChannel.airtelMoney:
        return 'Airtel Money';
      case PaymentChannel.card:
        return 'Visa · Mastercard';
    }
  }

  String get hint {
    switch (this) {
      case PaymentChannel.mtnMomo:
        return 'Pay from your MTN wallet';
      case PaymentChannel.airtelMoney:
        return 'Pay from your Airtel wallet';
      case PaymentChannel.card:
        return 'Secure card checkout via Flutterwave';
    }
  }

  Color get accent {
    switch (this) {
      case PaymentChannel.mtnMomo:
        return const Color(0xFFF59E0B);
      case PaymentChannel.airtelMoney:
        return const Color(0xFFEF4444);
      case PaymentChannel.card:
        return const Color(0xFF2563EB);
    }
  }

  IconData get icon {
    switch (this) {
      case PaymentChannel.card:
        return Icons.credit_card_rounded;
      default:
        return Icons.smartphone_rounded;
    }
  }

  bool get requiresPhone => this != PaymentChannel.card;

  bool get isDefault => this == PaymentChannel.mtnMomo;
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
        _SecureCheckoutHeader(feePercent: paymentProcessingFeePercent),
        const SizedBox(height: 16),
        ...PaymentChannel.values.map((channel) {
          final active = selected == channel;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _MethodCard(
              channel: channel,
              active: active,
              onTap: () => onChanged(channel),
            ),
          );
        }),
        const SizedBox(height: 4),
        _ActiveMethodPanel(channel: selected),
      ],
    );
  }
}

class _SecureCheckoutHeader extends StatelessWidget {
  const _SecureCheckoutHeader({required this.feePercent});

  final double feePercent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF064E3B)],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.lock_rounded, color: Color(0xFF6EE7B7), size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SECURE CHECKOUT',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color: const Color(0xFF6EE7B7).withValues(alpha: 0.9),
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Choose how to pay',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'MTN MoMo, Airtel Money, or card — processed by Flutterwave. A $feePercent% fee is added to your total.',
                  style: TextStyle(
                    fontSize: 11,
                    height: 1.4,
                    color: Colors.white.withValues(alpha: 0.72),
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.verified_user_outlined, color: Color(0xFF34D399), size: 24),
        ],
      ),
    );
  }
}

class _MethodCard extends StatelessWidget {
  const _MethodCard({
    required this.channel,
    required this.active,
    required this.onTap,
  });

  final PaymentChannel channel;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: active ? Colors.white : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: active ? channel.accent : const Color(0xFFE2E8F0),
              width: active ? 2 : 1,
            ),
            boxShadow: active
                ? [
                    BoxShadow(
                      color: channel.accent.withValues(alpha: 0.12),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
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
                  color: channel.accent,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(channel.icon, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          channel.label,
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: active ? const Color(0xFF0F172A) : const Color(0xFF334155),
                          ),
                        ),
                        if (channel.isDefault) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF059669),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Text(
                              'DEFAULT',
                              style: TextStyle(
                                fontSize: 8,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      channel.hint,
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              Icon(
                active ? Icons.check_circle_rounded : Icons.circle_outlined,
                color: active ? const Color(0xFF1E9E68) : const Color(0xFFCBD5E1),
                size: 24,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActiveMethodPanel extends StatelessWidget {
  const _ActiveMethodPanel({required this.channel});

  final PaymentChannel channel;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: channel.accent.withValues(alpha: 0.08),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: channel.accent,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(channel.icon, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PAY WITH',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF64748B),
                        letterSpacing: 0.8,
                      ),
                    ),
                    Text(
                      channel.network,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: channel.accent.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: channel.requiresPhone
                ? Text(
                    channel == PaymentChannel.mtnMomo
                        ? 'You will approve the payment on your MTN phone (MoMo PIN or USSD prompt).'
                        : 'Enter your Airtel number — you will confirm on your Airtel Money wallet.',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.4),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'You will be redirected to a secure Flutterwave page to enter your card details.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.4),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0), style: BorderStyle.solid),
                        ),
                        child: Row(
                          children: [
                            _Badge(label: 'VISA', color: const Color(0xFF1D4ED8)),
                            const SizedBox(width: 6),
                            _Badge(label: 'MC', color: const Color(0xFFEA580C)),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Text(
                                '256-bit encrypted · PCI compliant',
                                style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white),
      ),
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
