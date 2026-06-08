import 'package:flutter/material.dart';

import '../api/repositories/patient_repository.dart';
import '../widgets/portal/portal_ui.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  PatientOrder? _order;
  PatientDelivery? _delivery;
  PatientDeliveryQr? _deliveryQr;
  bool _loading = true;
  String? _error;
  bool _cancelling = false;

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

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final order = await PatientRepository.instance.fetchOrder(widget.orderId);
      PatientDelivery? delivery;
      PatientDeliveryQr? qr;
      if (order.status != 'cancelled' && order.status != 'delivered') {
        delivery = await PatientRepository.instance.fetchDeliveryForOrder(widget.orderId);
        qr = await PatientRepository.instance.fetchDeliveryQr(widget.orderId);
      }
      if (!mounted) return;
      setState(() {
        _order = order;
        _delivery = delivery;
        _deliveryQr = qr;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load order';
        _loading = false;
      });
    }
  }

  bool _canCancel(PatientOrder order) {
    if (['pending_review', 'pharmacy_accepted'].contains(order.status)) return true;
    if (order.status == 'ready_for_pickup' && order.paymentStatus != 'paid') return true;
    return false;
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
                : _buildContent(_order!),
      ),
    );
  }

  Widget _buildContent(PatientOrder order) {
    final isPickup = (order.deliveryMethod ?? 'delivery').toLowerCase() == 'pickup';
    final isCancelled = order.status == 'cancelled';
    final isDelivered = order.status == 'delivered';
    final steps = isPickup ? _pickupSteps : _deliverySteps;
    final activeWeight = _statusWeight[order.status] ?? -1;
    final subtotal = order.subtotal > 0 ? order.subtotal : order.totalAmount - order.deliveryFee;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 48),
      children: [
        PortalBackLink(label: 'Back to Orders', onTap: () => Navigator.pop(context)),
        _headerCard(order, isPickup),
        if (isCancelled)
          _cancelledBanner()
        else
          _timelineCard(steps, activeWeight, isCancelled),
        if (order.patientAccessCode != null && !isCancelled && !isDelivered)
          _accessCodeCard(order.patientAccessCode!, isPickup),
        if (_delivery != null && !isCancelled && !isDelivered) _deliveryTrackingCard(_delivery!),
        if (_deliveryQr != null && _deliveryQr!.qrCode.isNotEmpty && !isCancelled && !isDelivered)
          _qrCard(_deliveryQr!),
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
            isPickup ? 'Show this code at the pharmacy counter.' : 'Share with the rider on delivery.',
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
          if (order.deliveryFee > 0) _priceRow('Delivery fee', order.deliveryFee),
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
          const Text('Live delivery', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
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

  Widget _qrCard(PatientDeliveryQr qr) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: PortalColors.greenLight,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: PortalColors.greenBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Delivery QR code', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          SelectableText(qr.qrCode, style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
          if (qr.accessCode != null) ...[
            const SizedBox(height: 8),
            Text('Code: ${qr.accessCode}', style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ],
      ),
    );
  }
}
