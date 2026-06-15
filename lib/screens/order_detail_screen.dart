import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/repositories/patient_repository.dart';
import '../providers/auth_provider.dart';
import '../utils/order_payment_retry.dart';
import '../widgets/delivery_tracking_map.dart';
import '../widgets/portal/portal_ui.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  PatientOrder? _order;
  PatientDelivery? _delivery;
  PatientDeliveryQr? _deliveryQr;
  bool _loading = true;
  bool _qrLoading = false;
  String? _error;
  bool _cancelling = false;
  bool _retryingPayment = false;
  Timer? _pollTimer;

  static const _deliverySteps = [
    ('pending_review', 'Order Placed', 'Waiting for pharmacy to confirm'),
    ('pharmacy_accepted', 'Pharmacy Confirmed', 'Pharmacy is preparing your order'),
    ('ready_for_pickup', 'Ready for Collection', 'Your items are packed and waiting'),
    ('out_for_delivery', 'On the Way', 'Rider is heading to your address'),
    ('delivered', 'Delivered', 'Order complete'),
  ];

  static const _pickupSteps = [
    ('pending_review', 'Order Placed', 'Waiting for pharmacy confirmation'),
    ('pharmacy_accepted', 'Confirmed', 'Pharmacy is preparing your order'),
    ('ready_for_pickup', 'Ready for Pickup', 'Head to the pharmacy counter'),
    ('delivered', 'Collected', 'Thank you for your order'),
  ];

  static const _statusWeight = {
    'pending_review': 0,
    'pharmacy_accepted': 1,
    'ready_for_pickup': 2,
    'out_for_delivery': 3,
    'delivered': 4,
  };

  static const _trackableStatuses = {'out_for_delivery', 'delivered'};

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  bool _isDeliveryOrder(PatientOrder order) =>
      (order.deliveryMethod ?? 'delivery').toLowerCase() == 'delivery';

  void _syncPolling() {
    _pollTimer?.cancel();
    final order = _order;
    if (order == null || !_isDeliveryOrder(order) || order.status != 'out_for_delivery') {
      return;
    }
    _pollTimer = Timer.periodic(const Duration(seconds: 12), (_) => _refreshLiveDelivery());
  }

  Future<void> _refreshLiveDelivery() async {
    if (!mounted) return;
    try {
      final results = await Future.wait([
        PatientRepository.instance.fetchOrder(widget.orderId),
        PatientRepository.instance.fetchDeliveryForOrder(widget.orderId),
      ]);
      if (!mounted) return;
      final order = results[0] as PatientOrder;
      setState(() {
        _order = order;
        _delivery = results[1] as PatientDelivery?;
      });
      if (order.status != 'out_for_delivery') {
        _pollTimer?.cancel();
      }
    } catch (_) {}
  }

  Future<void> _load({bool quiet = false}) async {
    if (!quiet) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final order = await PatientRepository.instance.fetchOrder(widget.orderId);
      PatientDelivery? delivery;
      PatientDeliveryQr? qr;

      final isDelivery = _isDeliveryOrder(order);
      final isCancelled = order.status == 'cancelled';

      if (isDelivery && !isCancelled) {
        if (!quiet) setState(() => _qrLoading = true);
        qr = await PatientRepository.instance.fetchDeliveryQr(widget.orderId);
        if (_trackableStatuses.contains(order.status)) {
          delivery = await PatientRepository.instance.fetchDeliveryForOrder(widget.orderId);
        }
      }

      if (!mounted) return;
      setState(() {
        _order = order;
        _delivery = delivery;
        _deliveryQr = qr;
        _loading = false;
        _qrLoading = false;
      });
      _syncPolling();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load order';
        _loading = false;
        _qrLoading = false;
      });
    }
  }

  bool _canCancel(PatientOrder order) {
    if (['pending_review', 'pharmacy_accepted'].contains(order.status)) return true;
    if (order.status == 'ready_for_pickup' && order.paymentStatus != 'paid') return true;
    return false;
  }

  Future<void> _retryPayment(PatientOrder order) async {
    final user = ref.read(authProvider).user;
    final input = await OrderPaymentRetry.showPaymentSheet(
      context,
      initialPhone: user?.phone,
      orderAmountRwf: order.totalAmount.round(),
    );
    if (input == null || !mounted) return;

    setState(() => _retryingPayment = true);
    try {
      await OrderPaymentRetry.retry(
        context: context,
        order: order,
        channel: input.channel,
        phone: input.phone,
        name: user?.name,
        email: user?.email,
        onPaid: () => _load(quiet: true),
      );
      await _load(quiet: true);
    } finally {
      if (mounted) setState(() => _retryingPayment = false);
    }
  }

  Future<void> _cancelOrder() async {
    final order = _order;
    if (order == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Cancel this order?'),
        content: const Text('This action cannot be undone once the pharmacy starts preparing.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep order')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Yes, cancel'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _cancelling = true);
    try {
      await PatientRepository.instance.cancelOrder(order.id);
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not cancel. The order may already be in progress.')),
        );
      }
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  Future<void> _callRider(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  String _riderInitials(String? name) {
    if (name == null || name.trim().isEmpty) return 'DR';
    return name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .map((p) => p[0])
        .take(2)
        .join()
        .toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PortalColors.pageBg,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: PortalColors.green))
            : _error != null || _order == null
                ? PortalEmptyState(
                    icon: Icons.inventory_2_outlined,
                    message: _error ?? 'Order not found',
                    actionLabel: 'Back to orders',
                    onAction: () => Navigator.pop(context),
                  )
                : RefreshIndicator(
                    color: PortalColors.green,
                    onRefresh: () => _load(quiet: true),
                    child: _buildContent(_order!),
                  ),
      ),
    );
  }

  Widget _buildContent(PatientOrder order) {
    final isPickup = !_isDeliveryOrder(order);
    final isCancelled = order.status == 'cancelled';
    final isDelivered = order.status == 'delivered';
    final isOutForDelivery = order.status == 'out_for_delivery';
    final steps = isPickup ? _pickupSteps : _deliverySteps;
    final activeWeight = _statusWeight[order.status] ?? -1;
    final subtotal = order.subtotal > 0 ? order.subtotal : order.totalAmount - order.deliveryFee;
    final delivery = _delivery;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 48),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        PortalBackLink(label: 'Back to Orders', onTap: () => Navigator.pop(context)),
        _headerCard(order, isPickup),
        if (OrderPaymentRetry.canRetry(order)) _paymentRetryBanner(order),
        if (isOutForDelivery && delivery != null && delivery.hasMapCoords)
          DeliveryTrackingMap(
            pharmacyName: order.pharmacyName ?? 'Pharmacy',
            pickup: LatLng(delivery.pickupLatitude!, delivery.pickupLongitude!),
            destination: LatLng(delivery.destinationLatitude!, delivery.destinationLongitude!),
            progress: delivery.progress,
            etaMinutes: delivery.etaMinutes,
          ),
        if (isOutForDelivery) _riderCard(order),
        if (isCancelled)
          _cancelledBanner()
        else
          _timelineCard(steps, activeWeight, isCancelled),
        if (order.patientAccessCode != null && !isCancelled && !isDelivered)
          _accessCodeCard(order.patientAccessCode!, isPickup),
        if (delivery != null && !isCancelled && !isDelivered && !isOutForDelivery)
          _deliveryTrackingCard(delivery),
        if (!isPickup && !isCancelled && order.patientAccessCode == null)
          _deliveryQrSection(),
        if (order.deliveryAddress != null && !isPickup)
          _infoCard(
            icon: Icons.location_on_outlined,
            title: 'Delivery address',
            body: order.deliveryAddress!,
          ),
        _summaryCard(order, subtotal),
        if (order.notes != null && order.notes!.trim().isNotEmpty)
          _infoCard(icon: Icons.note_outlined, title: 'Order notes', body: order.notes!),
        if (_canCancel(order))
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: OutlinedButton(
              onPressed: _cancelling ? null : _cancelOrder,
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Color(0xFFFECACA)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _cancelling
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Cancel Order'),
            ),
          ),
      ],
    );
  }

  Widget _riderCard(PatientOrder order) {
    final name = order.assignedRiderName ?? 'Your Rider';
    final phone = order.assignedRiderPhone;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: PortalColors.greenLight,
            child: Text(
              _riderInitials(order.assignedRiderName),
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: PortalColors.green,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(fontWeight: FontWeight.w700, color: PortalColors.slate900),
                ),
                const Text('Delivery rider', style: TextStyle(fontSize: 12, color: PortalColors.slate400)),
              ],
            ),
          ),
          IconButton(
            onPressed: phone != null ? () => _callRider(phone) : null,
            style: IconButton.styleFrom(
              backgroundColor: PortalColors.greenLight,
              disabledBackgroundColor: PortalColors.slate100,
            ),
            icon: Icon(Icons.phone, color: phone != null ? PortalColors.green : PortalColors.slate300),
          ),
        ],
      ),
    );
  }

  Widget _paymentRetryBanner(PatientOrder order) {
    final failed = order.paymentStatus.toLowerCase() == 'failed';
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: failed ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: failed ? const Color(0xFFFECACA) : const Color(0xFFFDE68A),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                failed ? Icons.error_outline : Icons.schedule,
                color: failed ? const Color(0xFFDC2626) : const Color(0xFFD97706),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  failed
                      ? 'Payment failed. Your order is saved — try paying again.'
                      : 'Payment pending. Complete checkout to confirm your order.',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: failed ? const Color(0xFFDC2626) : const Color(0xFFB45309),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _retryingPayment ? null : () => _retryPayment(order),
            style: FilledButton.styleFrom(
              backgroundColor: PortalColors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            icon: _retryingPayment
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.payment),
            label: Text(_retryingPayment ? 'Starting payment…' : 'Try payment again'),
          ),
        ],
      ),
    );
  }

  Widget _headerCard(PatientOrder order, bool isPickup) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: PortalColors.greenLight,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            order.orderCode ?? '#${order.id.substring(0, 8).toUpperCase()}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: PortalColors.green,
                            ),
                          ),
                        ),
                        PortalStatusBadge(
                          label: isPickup ? 'Pickup' : 'Delivery',
                          tone: isPickup ? PortalStatusTone.neutral : PortalStatusTone.info,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      order.pharmacyName ?? 'Pharmacy',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: PortalColors.slate900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      portalRelativeTime(order.createdAt),
                      style: const TextStyle(fontSize: 12, color: PortalColors.slate400),
                    ),
                  ],
                ),
              ),
              PortalStatusBadge(
                label: order.displayStatus,
                tone: portalOrderStatusTone(order.status),
              ),
            ],
          ),
          const SizedBox(height: 12),
          PortalStatusBadge(
            label: 'Payment: ${order.paymentStatus}',
            tone: order.paymentStatus == 'paid'
                ? PortalStatusTone.success
                : order.paymentStatus == 'failed'
                    ? PortalStatusTone.danger
                    : PortalStatusTone.warning,
          ),
        ],
      ),
    );
  }

  Widget _cancelledBanner() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEE2E2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: const Row(
        children: [
          Icon(Icons.cancel_outlined, color: Color(0xFFDC2626)),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Order Cancelled',
              style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFDC2626)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _timelineCard(List<(String, String, String)> steps, int activeWeight, bool cancelled) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Order progress',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: PortalColors.slate900),
          ),
          const SizedBox(height: 16),
          ...List.generate(steps.length, (i) {
            final (key, label, hint) = steps[i];
            final weight = _statusWeight[key] ?? i;
            final done = activeWeight >= weight;
            final active = activeWeight == weight;
            return Padding(
              padding: EdgeInsets.only(bottom: i < steps.length - 1 ? 16 : 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: done ? PortalColors.green : PortalColors.slate200,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          done ? Icons.check : Icons.circle,
                          size: 14,
                          color: done ? Colors.white : PortalColors.slate400,
                        ),
                      ),
                      if (i < steps.length - 1)
                        Container(width: 2, height: 24, color: done ? PortalColors.green : PortalColors.slate200),
                    ],
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: TextStyle(
                            fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                            color: done ? PortalColors.slate900 : PortalColors.slate500,
                          ),
                        ),
                        Text(hint, style: const TextStyle(fontSize: 12, color: PortalColors.slate400)),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _accessCodeCard(String code, bool isPickup) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Your access code', style: TextStyle(fontWeight: FontWeight.w700, color: PortalColors.slate800)),
          const SizedBox(height: 8),
          Text(
            code,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: 4, color: PortalColors.slate900),
          ),
          const SizedBox(height: 4),
          Text(
            isPickup
                ? 'Show this code at the pharmacy to collect your order.'
                : 'Give this code to the rider to verify and complete delivery.',
            style: const TextStyle(fontSize: 12, color: PortalColors.slate500),
          ),
        ],
      ),
    );
  }

  Widget _infoCard({required IconData icon, required String title, required String body}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: PortalColors.green),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: PortalColors.slate800)),
                const SizedBox(height: 4),
                Text(body, style: const TextStyle(color: PortalColors.slate600, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryCard(PatientOrder order, double subtotal) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Order summary',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: PortalColors.slate900),
          ),
          const SizedBox(height: 16),
          ...order.items.map((item) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: PortalColors.greenLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: item.imageUrl != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              PatientRepository.resolveMediaUrl(item.imageUrl),
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) =>
                                  const Icon(Icons.medication_outlined, color: PortalColors.green),
                            ),
                          )
                        : const Icon(Icons.medication_outlined, color: PortalColors.green),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.productName, style: const TextStyle(fontWeight: FontWeight.w600)),
                        Text(
                          '×${item.quantity}${item.sellMode == 'partial' ? ' units' : ''} · ${item.unitPrice.toStringAsFixed(0)} RWF',
                          style: const TextStyle(fontSize: 12, color: PortalColors.slate500),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${(item.totalPrice > 0 ? item.totalPrice : item.unitPrice * item.quantity).toStringAsFixed(0)} RWF',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: PortalColors.green),
                  ),
                ],
              ),
            );
          }),
          const Divider(color: PortalColors.slate200),
          _priceRow('Subtotal', subtotal),
          if (order.deliveryFee > 0)
            _priceRow(
              order.deferDeliveryFee ? 'Delivery fee (pay rider)' : 'Delivery fee',
              order.deliveryFee,
            ),
          if (order.deferDeliveryFee)
            const Padding(
              padding: EdgeInsets.only(top: 4),
              child: Text(
                'Delivery fee will be collected by the rider on arrival.',
                style: TextStyle(fontSize: 11, color: PortalColors.slate500),
              ),
            ),
          const SizedBox(height: 8),
          _priceRow('Total', order.totalAmount, bold: true),
        ],
      ),
    );
  }

  Widget _priceRow(String label, double amount, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(
            label,
            style: TextStyle(
              color: PortalColors.slate600,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
          const Spacer(),
          Text(
            '${amount.toStringAsFixed(0)} RWF',
            style: TextStyle(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
              color: bold ? PortalColors.green : PortalColors.slate800,
              fontSize: bold ? 18 : 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _deliveryTrackingCard(PatientDelivery delivery) {
    final progress = delivery.progress;
    final eta = delivery.etaMinutes;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Delivery status', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: PortalColors.slate100,
              color: PortalColors.green,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            delivery.status.replaceAll('_', ' ').toUpperCase(),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PortalColors.slate500),
          ),
          if (eta != null) ...[
            const SizedBox(height: 4),
            Text('Est. $eta min', style: const TextStyle(color: PortalColors.green, fontWeight: FontWeight.w600)),
          ],
          if (delivery.destinationAddress != null) ...[
            const SizedBox(height: 8),
            Text(delivery.destinationAddress!, style: const TextStyle(color: PortalColors.slate600, fontSize: 13)),
          ],
        ],
      ),
    );
  }

  Widget _deliveryQrSection() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.qr_code_2, size: 18, color: PortalColors.green),
              SizedBox(width: 8),
              Text(
                'Delivery verification',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_qrLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(color: PortalColors.green, strokeWidth: 2),
              ),
            )
          else if (_deliveryQr != null && (_deliveryQr!.hasImage || _deliveryQr!.displayToken.isNotEmpty))
            _qrCard(_deliveryQr!)
          else
            const Text(
              'Your delivery QR will appear once a rider is assigned.',
              style: TextStyle(fontSize: 13, color: PortalColors.slate500),
            ),
        ],
      ),
    );
  }

  Widget _qrCard(PatientDeliveryQr qr) {
    final imageUrl = qr.hasImage ? PatientRepository.resolveMediaUrl(qr.qrCode) : null;
    return Column(
      children: [
        if (imageUrl != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.network(
              imageUrl,
              width: 176,
              height: 176,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => _qrTokenBox(qr.displayToken),
            ),
          )
        else
          _qrTokenBox(qr.displayToken),
        const SizedBox(height: 12),
        const Text(
          'Show this to the rider to confirm you are the correct recipient.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: PortalColors.slate500),
        ),
        if (qr.accessCode != null) ...[
          const SizedBox(height: 8),
          Text('Code: ${qr.accessCode}', style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ],
    );
  }

  Widget _qrTokenBox(String token) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PortalColors.slate100,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: SelectableText(
        token,
        style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
      ),
    );
  }
}
