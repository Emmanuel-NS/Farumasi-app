// lib/screens/rider/rider_active_delivery_screen.dart
// Step-by-step active delivery screen for FARUMASI riders.
// Shows exactly what to do next at every stage of the delivery.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/rider_models.dart';
import '../../providers/rider_provider.dart';
import 'rider_qr_scanner_screen.dart';

class RiderActiveDeliveryScreen extends ConsumerStatefulWidget {
  const RiderActiveDeliveryScreen({super.key});

  @override
  ConsumerState<RiderActiveDeliveryScreen> createState() =>
      _RiderActiveDeliveryScreenState();
}

class _RiderActiveDeliveryScreenState
    extends ConsumerState<RiderActiveDeliveryScreen> {
  late Timer _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(
        const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _ticker.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final order = ref.watch(riderProvider).activeDelivery;

    if (order == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF6F8F7),
        appBar: AppBar(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
          elevation: 0,
          leading: const BackButton(),
          title: const Text('Active Delivery'),
        ),
        body: const Center(
          child: Text('No active delivery.'),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8F7),
      body: Stack(
        children: [
          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // ── App bar ────────────────────────────────────────────────
              SliverAppBar(
                backgroundColor: Colors.white,
                foregroundColor: Colors.black87,
                pinned: true,
                elevation: 0,
                leading: const BackButton(),
                title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.orderCode,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      order.statusLabel,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF1E9E68),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                actions: [
                  Padding(
                    padding: const EdgeInsets.only(right: 16),
                    child: _TimerBadge(
                        acceptedAt: order.acceptedAt ?? order.createdAt),
                  ),
                ],
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(1),
                  child: Container(height: 1, color: Colors.grey.shade100),
                ),
              ),

              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 140),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    // ── Step progress ──────────────────────────────────
                    _StepProgressBar(activeStep: order.activeStep),
                    const SizedBox(height: 24),

                    // ── Current step card ──────────────────────────────
                    _CurrentStepCard(order: order),
                    const SizedBox(height: 20),

                    // ── Order summary card ─────────────────────────────
                    _OrderSummaryCard(order: order),
                    const SizedBox(height: 20),

                    // ── Map navigation button ──────────────────────────
                    _NavigateButton(order: order),
                    const SizedBox(height: 20),

                    // ── Delivery timeline ─────────────────────────────
                    _DeliveryTimeline(order: order),
                  ]),
                ),
              ),
            ],
          ),

          // ── Bottom action bar (always visible) ───────────────────────
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _BottomActionBar(order: order),
          ),
        ],
      ),
    );
  }
}

// ─── Timer badge ──────────────────────────────────────────────────────────────

class _TimerBadge extends StatelessWidget {
  final DateTime acceptedAt;

  const _TimerBadge({required this.acceptedAt});

  @override
  Widget build(BuildContext context) {
    final elapsed = DateTime.now().difference(acceptedAt);
    final m = elapsed.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = elapsed.inSeconds.remainder(60).toString().padLeft(2, '0');
    final h = elapsed.inHours;
    final label = h > 0 ? '${h}h ${m}m' : '${m}:${s}';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5EE),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.timer_outlined,
              size: 13, color: Color(0xFF1E9E68)),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF1E9E68),
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Step progress bar ────────────────────────────────────────────────────────

class _StepProgressBar extends StatelessWidget {
  final DeliveryStep? activeStep;

  const _StepProgressBar({this.activeStep});

  @override
  Widget build(BuildContext context) {
    final steps = [
      (DeliveryStep.goToPickup, Icons.store_rounded, 'Go to\nPharmacy'),
      (DeliveryStep.atPickup, Icons.inventory_2_rounded, 'Pick Up\nOrder'),
      (DeliveryStep.delivering, Icons.motorcycle_rounded, 'Deliver to\nPatient'),
      (DeliveryStep.atDestination, Icons.qr_code_scanner_rounded, 'Scan QR\nCode'),
    ];

    final currentIndex = activeStep?.index ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
          ),
        ],
      ),
      child: Row(
        children: List.generate(steps.length, (i) {
          final (step, icon, label) = steps[i];
          final isCompleted = i < currentIndex;
          final isCurrent = i == currentIndex;
          final isLast = i == steps.length - 1;

          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isCompleted
                              ? const Color(0xFF1E9E68)
                              : (isCurrent
                                  ? const Color(0xFFE8F5EE)
                                  : Colors.grey.shade100),
                          border: isCurrent
                              ? Border.all(
                                  color: const Color(0xFF1E9E68),
                                  width: 2)
                              : null,
                        ),
                        child: Icon(
                          isCompleted ? Icons.check_rounded : icon,
                          size: 18,
                          color: isCompleted
                              ? Colors.white
                              : (isCurrent
                                  ? const Color(0xFF1E9E68)
                                  : Colors.grey.shade400),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        label,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10,
                          color: isCurrent || isCompleted
                              ? const Color(0xFF1E9E68)
                              : Colors.grey.shade400,
                          fontWeight: isCurrent
                              ? FontWeight.bold
                              : FontWeight.normal,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      height: 2,
                      margin: const EdgeInsets.only(bottom: 28),
                      decoration: BoxDecoration(
                        color: i < currentIndex
                            ? const Color(0xFF1E9E68)
                            : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(1),
                      ),
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }
}

// ─── Current step card ────────────────────────────────────────────────────────

class _CurrentStepCard extends StatelessWidget {
  final RiderDeliveryOrder order;

  const _CurrentStepCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final step = order.activeStep ?? DeliveryStep.goToPickup;

    String stepTitle;
    String stepInstruction;
    String locationLabel;
    String locationValue;
    IconData locationIcon;
    Color stepColor;

    switch (step) {
      case DeliveryStep.goToPickup:
        stepTitle = 'Step 1 of 4';
        stepInstruction = 'Go to Pharmacy';
        locationLabel = 'Pickup location';
        locationValue = order.pickupName;
        locationIcon = Icons.store_rounded;
        stepColor = Colors.orange.shade600;
      case DeliveryStep.atPickup:
        stepTitle = 'Step 2 of 4';
        stepInstruction = 'Pick Up the Order';
        locationLabel = 'You are at';
        locationValue = order.pickupName;
        locationIcon = Icons.inventory_2_rounded;
        stepColor = Colors.blue.shade600;
      case DeliveryStep.delivering:
        stepTitle = 'Step 3 of 4';
        stepInstruction = 'Deliver to Patient';
        locationLabel = 'Destination';
        locationValue =
            order.destinationAddress.split(',').first;
        locationIcon = Icons.motorcycle_rounded;
        stepColor = Colors.purple.shade600;
      case DeliveryStep.atDestination:
        stepTitle = 'Step 4 of 4';
        stepInstruction = 'Scan QR to Confirm';
        locationLabel = 'You arrived at';
        locationValue =
            order.destinationAddress.split(',').first;
        locationIcon = Icons.qr_code_scanner_rounded;
        stepColor = const Color(0xFF1E9E68);
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            stepColor.withValues(alpha: 0.08),
            Colors.white,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
            color: stepColor.withValues(alpha: 0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            stepTitle,
            style: TextStyle(
              fontSize: 11,
              color: stepColor,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            stepInstruction,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: stepColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(locationIcon, color: stepColor, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      locationLabel,
                      style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 12),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      locationValue,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (step == DeliveryStep.goToPickup ||
              step == DeliveryStep.delivering) ...[
            const SizedBox(height: 14),
            Row(
              children: [
                Icon(Icons.route_outlined,
                    size: 14, color: Colors.grey.shade400),
                const SizedBox(width: 6),
                Text(
                  '${order.estimatedDistanceKm} km  •  ~${order.estimatedTimeMinutes} min away',
                  style: TextStyle(
                      color: Colors.grey.shade500, fontSize: 12),
                ),
              ],
            ),
          ],
          if (step == DeliveryStep.atDestination) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5EE),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.person_outline,
                      color: Color(0xFF1E9E68), size: 18),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Patient',
                        style: TextStyle(
                            color: Color(0xFF1E9E68), fontSize: 11),
                      ),
                      Text(
                        order.customerNameMasked,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Order summary card ───────────────────────────────────────────────────────

class _OrderSummaryCard extends StatelessWidget {
  final RiderDeliveryOrder order;

  const _OrderSummaryCard({required this.order});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Details',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 12),
          _detailRow('From', order.pickupAddress),
          const SizedBox(height: 8),
          _detailRow('To', order.destinationAddress),
          const SizedBox(height: 8),
          _detailRow('Patient', order.customerNameMasked),
          const SizedBox(height: 8),
          _detailRow('Contact',
              order.customerPhoneMasked),
          const SizedBox(height: 8),
          _detailRow(
              'Items', '${order.packageCount} package(s)'),
          if (order.specialNote != null) ...[
            const SizedBox(height: 8),
            _detailRow('Note', order.specialNote!,
                valueColor: Colors.orange.shade700),
          ],
        ],
      ),
    );
  }

  Widget _detailRow(String key, String value,
      {Color? valueColor}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 68,
          child: Text(
            key,
            style: TextStyle(
                color: Colors.grey.shade500,
                fontSize: 12,
                fontWeight: FontWeight.w500),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: valueColor ?? Colors.black87,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Navigate button ──────────────────────────────────────────────────────────

class _NavigateButton extends StatelessWidget {
  final RiderDeliveryOrder order;

  const _NavigateButton({required this.order});

  @override
  Widget build(BuildContext context) {
    final isGoingToPickup =
        order.activeStep == DeliveryStep.goToPickup ||
            order.activeStep == DeliveryStep.atPickup;
    final coords = isGoingToPickup
        ? order.pickupCoordinates
        : order.destinationCoordinates;

    return GestureDetector(
      onTap: () => _openMaps(coords[0], coords[1]),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.blue.shade50,
          borderRadius: BorderRadius.circular(16),
          border:
              Border.all(color: Colors.blue.shade200, width: 1),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.blue.shade600,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.map_rounded,
                  color: Colors.white, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isGoingToPickup
                        ? 'Navigate to Pharmacy'
                        : 'Navigate to Destination',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: Colors.blue.shade800,
                    ),
                  ),
                  Text(
                    'Opens Google Maps',
                    style: TextStyle(
                        color: Colors.blue.shade400,
                        fontSize: 12),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios_rounded,
                size: 16, color: Colors.blue.shade400),
          ],
        ),
      ),
    );
  }

  Future<void> _openMaps(double lat, double lng) async {
    final uri = Uri.parse(
        'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

// ─── Delivery timeline ────────────────────────────────────────────────────────

class _DeliveryTimeline extends StatelessWidget {
  final RiderDeliveryOrder order;

  const _DeliveryTimeline({required this.order});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Delivery Timeline',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 14),
          _timelineRow('Accepted',
              order.acceptedAt, true),
          _timelineRow('Arrived at Pharmacy',
              order.pickupArrivedAt,
              order.pickupArrivedAt != null),
          _timelineRow('Picked Up',
              order.pickedUpAt,
              order.pickedUpAt != null),
          _timelineRow('Started Delivery',
              order.deliveryStartedAt,
              order.deliveryStartedAt != null),
          _timelineRow('Arrived at Destination',
              order.destinationArrivedAt,
              order.destinationArrivedAt != null,
              isLast: true),
        ],
      ),
    );
  }

  Widget _timelineRow(
      String label, DateTime? time, bool isDone,
      {bool isLast = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isDone
                    ? const Color(0xFF1E9E68)
                    : Colors.grey.shade200,
              ),
              child: isDone
                  ? const Icon(Icons.check,
                      color: Colors.white, size: 10)
                  : null,
            ),
            if (!isLast)
              Container(
                  width: 2,
                  height: 24,
                  color: isDone
                      ? const Color(0xFF1E9E68)
                      : Colors.grey.shade200),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDone ? Colors.black87 : Colors.grey.shade400,
                    fontWeight: isDone
                        ? FontWeight.w500
                        : FontWeight.normal,
                  ),
                ),
                if (time != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    _formatTime(time),
                    style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 11),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final m = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour < 12 ? 'AM' : 'PM';
    return '$h:$m $period';
  }
}

// ─── Bottom action bar ────────────────────────────────────────────────────────

class _BottomActionBar extends ConsumerWidget {
  final RiderDeliveryOrder order;

  const _BottomActionBar({required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final step = order.activeStep ?? DeliveryStep.goToPickup;

    String buttonLabel;
    IconData buttonIcon;
    VoidCallback onPressed;
    Color buttonColor = const Color(0xFF1E9E68);

    switch (step) {
      case DeliveryStep.goToPickup:
        buttonLabel = 'I Arrived at Pharmacy';
        buttonIcon = Icons.store_rounded;
        onPressed = () =>
            ref.read(riderProvider.notifier).advanceStep();
      case DeliveryStep.atPickup:
        buttonLabel = 'Confirm Pickup';
        buttonIcon = Icons.inventory_2_rounded;
        onPressed = () =>
            ref.read(riderProvider.notifier).advanceStep();
      case DeliveryStep.delivering:
        buttonLabel = 'I Arrived at Destination';
        buttonIcon = Icons.location_on_rounded;
        onPressed = () =>
            ref.read(riderProvider.notifier).advanceStep();
      case DeliveryStep.atDestination:
        buttonLabel = 'Scan QR to Deliver';
        buttonIcon = Icons.qr_code_scanner_rounded;
        buttonColor = const Color(0xFF1E9E68);
        onPressed = () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => RiderQRScannerScreen(order: order),
              ),
            );
    }

    return Container(
      padding: EdgeInsets.fromLTRB(
          20, 16, 20, MediaQuery.of(context).padding.bottom + 16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (step == DeliveryStep.goToPickup) ...[
            Text(
              'Navigate to pharmacy first, then tap when you arrive.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Colors.grey.shade500,
                  fontSize: 12),
            ),
            const SizedBox(height: 12),
          ],
          if (step == DeliveryStep.atDestination) ...[
            Text(
              'Ask the patient to show their QR code.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Colors.grey.shade500,
                  fontSize: 12),
            ),
            const SizedBox(height: 12),
          ],
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: buttonColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              icon: Icon(buttonIcon, size: 20),
              label: Text(
                buttonLabel,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              onPressed: onPressed,
            ),
          ),
        ],
      ),
    );
  }
}
