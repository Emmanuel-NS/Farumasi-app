import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/repositories/patient_repository.dart';
import '../providers/auth_provider.dart';
import '../utils/order_payment_retry.dart';
import '../widgets/app_refresh.dart';
import '../widgets/portal/portal_ui.dart';
import 'order_detail_screen.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key, this.onBrowseStore});

  final VoidCallback? onBrowseStore;

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  static const _activeStatuses = {
    'pending',
    'pending_review',
    'accepted',
    'preparing',
    'pharmacy_accepted',
    'ready_for_pickup',
    'out_for_delivery',
  };
  static const _cancelledStatuses = {'cancelled', 'rejected', 'failed'};
  static const _pastStatuses = {'delivered', 'completed'};

  int _tab = 0;
  List<PatientOrder> _orders = [];
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  String? _retryingOrderId;

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders({bool quiet = false}) async {
    if (ref.read(authProvider).status != AuthStatus.authenticated) {
      setState(() {
        _loading = false;
        _orders = [];
      });
      return;
    }
    setState(() {
      if (quiet) {
        _refreshing = true;
      } else {
        _loading = true;
      }
      _error = null;
    });
    try {
      final page = await PatientRepository.instance.fetchMyOrders(limit: 50);
      if (!mounted) return;
      setState(() {
        _orders = page.items;
        _loading = false;
        _refreshing = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load orders. Check your connection and try again.';
        _loading = false;
        _refreshing = false;
      });
    }
  }

  List<PatientOrder> get _active =>
      _orders.where((o) => _activeStatuses.contains(o.status.toLowerCase())).toList();

  List<PatientOrder> get _cancelled =>
      _orders.where((o) => _cancelledStatuses.contains(o.status.toLowerCase())).toList();

  List<PatientOrder> get _past => _orders.where((o) {
        final s = o.status.toLowerCase();
        return _pastStatuses.contains(s) ||
            (!_activeStatuses.contains(s) && !_cancelledStatuses.contains(s));
      }).toList();

  Future<void> _promptCancel(PatientOrder order) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Cancel order?'),
        content: Text(
          'Cancel ${order.orderCode ?? order.id}? This is free until the pharmacy starts preparing your items.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep order')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Cancel order'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await PatientRepository.instance.cancelOrder(order.id);
      if (mounted) await _loadOrders(quiet: true);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not cancel. The order may already be processing.')),
        );
      }
    }
  }

  Future<void> _retryPayment(PatientOrder order) async {
    final user = ref.read(authProvider).user;
    final phone = await OrderPaymentRetry.promptPhone(
      context,
      initial: user?.phone,
    );
    if (phone == null || !mounted) return;

    setState(() => _retryingOrderId = order.id);
    try {
      await OrderPaymentRetry.retry(
        context: context,
        order: order,
        phone: phone,
        name: user?.name,
        email: user?.email,
      );
      if (mounted) await _loadOrders(quiet: true);
    } finally {
      if (mounted) setState(() => _retryingOrderId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      ('Active', _active.length),
      ('Past', _past.length),
      ('Cancelled', _cancelled.length),
    ];

    return ColoredBox(
      color: PortalColors.pageBg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'My Orders',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: PortalColors.slate900,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _refreshing ? null : () => _loadOrders(quiet: true),
                  icon: _refreshing
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh, color: PortalColors.slate400),
                ),
              ],
            ),
          ),
          Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: PortalColors.slate200)),
            ),
            child: Row(
              children: List.generate(tabs.length, (i) {
                final selected = _tab == i;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _tab = i),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: selected ? PortalColors.green : Colors.transparent,
                            width: 2,
                          ),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            tabs[i].$1,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: selected ? PortalColors.green : PortalColors.slate500,
                            ),
                          ),
                          if (tabs[i].$2 > 0) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: selected ? PortalColors.green : PortalColors.slate100,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '${tabs[i].$2}',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: selected ? Colors.white : PortalColors.slate500,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          Expanded(
            child: AppRefreshScroll(
              onRefresh: () => _loadOrders(quiet: true),
              child: _loading
                ? ListView.builder(
                    physics: AppRefreshScroll.scrollPhysics(const AlwaysScrollableScrollPhysics()),
                    padding: const EdgeInsets.all(16),
                    itemCount: 3,
                    itemBuilder: (_, __) => Container(
                      height: 140,
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                  )
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(_error!, textAlign: TextAlign.center),
                            TextButton(onPressed: _loadOrders, child: const Text('Retry')),
                          ],
                        ),
                      )
                    : _buildTabContent(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabContent() {
    final list = switch (_tab) {
      0 => _active,
      1 => _past,
      _ => _cancelled,
    };
    final emptyMsg = switch (_tab) {
      0 => 'No active orders',
      1 => 'No past orders yet',
      _ => 'No cancelled orders',
    };

    if (list.isEmpty) {
      return PortalEmptyState(
        icon: Icons.inventory_2_outlined,
        message: emptyMsg,
        actionLabel: _tab == 0 ? 'Browse medicines' : null,
        onAction: _tab == 0 ? widget.onBrowseStore : null,
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: AppRefreshScroll.scrollPhysics(const AlwaysScrollableScrollPhysics()),
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, i) {
        final order = list[i];
        return _tab == 0
            ? _ActiveOrderCard(
                order: order,
                onCancel: () => _promptCancel(order),
                onTrack: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => OrderDetailScreen(orderId: order.id),
                  ),
                ),
                onRetryPayment: OrderPaymentRetry.canRetry(order)
                    ? () => _retryPayment(order)
                    : null,
                retryingPayment: _retryingOrderId == order.id,
              )
            : _PastOrderCard(
                order: order,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => OrderDetailScreen(orderId: order.id),
                  ),
                ),
              );
      },
    );
  }
}

class _ActiveOrderCard extends StatelessWidget {
  const _ActiveOrderCard({
    required this.order,
    required this.onCancel,
    required this.onTrack,
    this.onRetryPayment,
    this.retryingPayment = false,
  });

  final PatientOrder order;
  final VoidCallback onCancel;
  final VoidCallback onTrack;
  final VoidCallback? onRetryPayment;
  final bool retryingPayment;

  bool get _canCancel {
    final status = order.status.toLowerCase();
    if (status == 'pending_review' || status == 'pharmacy_accepted') return true;
    if (status == 'ready_for_pickup' && order.paymentStatus != 'paid') return true;
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final isDelivery = (order.deliveryMethod ?? 'delivery').toLowerCase() == 'delivery';
    final visibleItems = order.items.take(3).toList();
    final extraCount = order.items.length - visibleItems.length;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: PortalColors.greenLight,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  order.orderCode ?? '#${order.id.substring(0, 8)}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: PortalColors.green,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              PortalStatusBadge(
                label: isDelivery ? 'Delivery' : 'Pickup',
                tone: isDelivery ? PortalStatusTone.info : PortalStatusTone.neutral,
              ),
              const Spacer(),
              PortalStatusBadge(
                label: order.displayStatus,
                tone: portalOrderStatusTone(order.status),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            order.pharmacyName ?? 'Pharmacy',
            style: const TextStyle(fontWeight: FontWeight.w600, color: PortalColors.slate800),
          ),
          const SizedBox(height: 4),
          Text(
            portalRelativeTime(order.createdAt),
            style: const TextStyle(fontSize: 12, color: PortalColors.slate400),
          ),
          const SizedBox(height: 12),
          if (OrderPaymentRetry.canRetry(order)) ...[
            PortalStatusBadge(
              label: order.paymentStatus.toLowerCase() == 'failed'
                  ? 'Payment failed'
                  : 'Payment pending',
              tone: order.paymentStatus.toLowerCase() == 'failed'
                  ? PortalStatusTone.danger
                  : PortalStatusTone.warning,
            ),
            const SizedBox(height: 12),
          ],
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              ...visibleItems.map((item) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: PortalColors.slate100,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.medication_outlined, size: 12, color: PortalColors.green),
                      const SizedBox(width: 4),
                      Text(
                        item.productName,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                );
              }),
              if (extraCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: PortalColors.slate100,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '+$extraCount more',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: PortalColors.slate600),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (onRetryPayment != null) ...[
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: retryingPayment ? null : onRetryPayment,
                style: FilledButton.styleFrom(
                  backgroundColor: PortalColors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                icon: retryingPayment
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.payment, size: 18),
                label: Text(
                  retryingPayment ? 'Starting payment…' : 'Try payment again',
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
          Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Total', style: TextStyle(fontSize: 11, color: PortalColors.slate400)),
                  Text(
                    '${order.totalAmount.toStringAsFixed(0)} RWF',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      color: PortalColors.green,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              if (_canCancel) ...[
                OutlinedButton(
                  onPressed: onCancel,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Color(0xFFFECACA)),
                  ),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
              ],
              ElevatedButton(
                onPressed: onTrack,
                style: ElevatedButton.styleFrom(
                  backgroundColor: PortalColors.green,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Track'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PastOrderCard extends StatelessWidget {
  const _PastOrderCard({required this.order, required this.onTap});

  final PatientOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: PortalColors.cardBorder),
          ),
          padding: const EdgeInsets.all(14),
          child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: PortalColors.greenLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.check_circle_outline, color: PortalColors.green),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.orderCode ?? order.id,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                Text(
                  order.pharmacyName ?? 'Pharmacy',
                  style: const TextStyle(fontSize: 12, color: PortalColors.slate500),
                ),
                Text(
                  portalRelativeTime(order.createdAt),
                  style: const TextStyle(fontSize: 11, color: PortalColors.slate400),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${order.totalAmount.toStringAsFixed(0)} RWF',
                style: const TextStyle(fontWeight: FontWeight.w700, color: PortalColors.green),
              ),
              PortalStatusBadge(
                label: order.displayStatus,
                tone: portalOrderStatusTone(order.status),
              ),
            ],
          ),
        ],
          ),
        ),
      ),
    );
  }
}
