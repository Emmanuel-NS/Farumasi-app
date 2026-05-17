// lib/screens/rider/rider_delivery_success_screen.dart
// Delivery success confirmation screen for FARUMASI riders.
// Shown after QR scan is confirmed.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../models/rider_models.dart';
import '../../providers/rider_provider.dart';

class RiderDeliverySuccessScreen extends ConsumerWidget {
  final RiderDeliveryOrder order;

  const RiderDeliverySuccessScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(riderProvider);
    final isPerTrip = state.profile.riderType == RiderType.perTrip;
    final completedToday = state.earnings.todayTrips;

    final elapsed = order.deliveredAt != null && order.acceptedAt != null
        ? order.deliveredAt!.difference(
            order.acceptedAt ?? order.createdAt)
        : null;

    String elapsedLabel = '-';
    if (elapsed != null) {
      final m = elapsed.inMinutes.remainder(60);
      final s = elapsed.inSeconds.remainder(60);
      elapsedLabel = elapsed.inMinutes > 0 ? '${m}m ${s}s' : '${s}s';
    }

    return Scaffold(
      backgroundColor: const Color(0xFF1E9E68),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // ── Animated checkmark ───────────────────────────
                      TweenAnimationBuilder<double>(
                        tween: Tween(begin: 0.0, end: 1.0),
                        duration: const Duration(milliseconds: 600),
                        curve: Curves.elasticOut,
                        builder: (_, v, child) =>
                            Transform.scale(scale: v, child: child),
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.15),
                                blurRadius: 24,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.check_rounded,
                            size: 64,
                            color: Color(0xFF1E9E68),
                          ),
                        ),
                      ),

                      const SizedBox(height: 28),

                      const Text(
                        'Delivery Completed!',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 30,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Great job! The patient received their medicine.',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontSize: 15,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 32),

                      // ── Stats card ───────────────────────────────────
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.08),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            _statRow(
                              Icons.tag_rounded,
                              'Order Code',
                              order.orderCode,
                              Colors.grey.shade700,
                            ),
                            const Divider(height: 24),
                            _statRow(
                              Icons.timer_outlined,
                              'Time Taken',
                              elapsedLabel,
                              Colors.grey.shade700,
                            ),
                            if (isPerTrip) ...[
                              const Divider(height: 24),
                              _statRow(
                                Icons.account_balance_wallet_rounded,
                                'You Earned',
                                '+${order.riderEarning.toInt()} RWF',
                                const Color(0xFF1E9E68),
                                valueWeight: FontWeight.bold,
                                valueFontSize: 18,
                              ),
                            ],
                            const Divider(height: 24),
                            _statRow(
                              Icons.check_circle_outlined,
                              'Completed Today',
                              '$completedToday trip${completedToday == 1 ? '' : 's'}',
                              Colors.blue.shade600,
                            ),
                            const Divider(height: 24),
                            _statRow(
                              Icons.calendar_today_outlined,
                              'Delivered At',
                              order.deliveredAt != null
                                  ? DateFormat('d MMM, h:mm a')
                                      .format(order.deliveredAt!)
                                  : '-',
                              Colors.grey.shade700,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // ── Back to home button ──────────────────────────────────
            Container(
              padding: EdgeInsets.fromLTRB(
                  24, 16, 24, MediaQuery.of(context).padding.bottom + 16),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF1E9E68),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  onPressed: () => Navigator.popUntil(
                      context, (route) => route.isFirst),
                  child: const Text(
                    'Back to Home',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statRow(
    IconData icon,
    String label,
    String value,
    Color valueColor, {
    FontWeight valueWeight = FontWeight.w600,
    double valueFontSize = 15,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFE8F5EE),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: const Color(0xFF1E9E68), size: 16),
        ),
        const SizedBox(width: 14),
        Text(
          label,
          style: TextStyle(
            color: Colors.grey.shade500,
            fontSize: 13,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            color: valueColor,
            fontWeight: valueWeight,
            fontSize: valueFontSize,
          ),
        ),
      ],
    );
  }
}
