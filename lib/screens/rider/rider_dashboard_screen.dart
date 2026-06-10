// lib/screens/rider/rider_dashboard_screen.dart
// FARUMASI Rider Dashboard – main shell with 4 tabs.
// Designed for low-tech riders: large buttons, clear status, step-by-step flow.

import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../models/rider_models.dart';
import '../../providers/rider_provider.dart';
import '../../providers/auth_provider.dart';
import 'rider_active_delivery_screen.dart';
import 'rider_notifications_screen.dart';
import 'rider_payout_screen.dart';
import 'rider_help_screen.dart';

// ─── Shell ────────────────────────────────────────────────────────────────────

class RiderDashboardScreen extends ConsumerStatefulWidget {
  const RiderDashboardScreen({super.key});

  @override
  ConsumerState<RiderDashboardScreen> createState() =>
      _RiderDashboardScreenState();
}

class _RiderDashboardScreenState extends ConsumerState<RiderDashboardScreen> {
  int _tabIndex = 0;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(riderProvider.notifier).refreshFromApi());
    // Refresh data every 30 seconds to pick up new delivery requests
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      ref.read(riderProvider.notifier).refreshFromApi();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final unread = ref.watch(riderProvider).unreadNotificationCount;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8F7),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: Colors.white,
        elevation: 0,
        toolbarHeight: 48,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/images/app_logo.png',
              width: 28,
              height: 28,
              fit: BoxFit.contain,
            ),
            const SizedBox(width: 8),
            const Text(
              'FARUMASI',
              style: TextStyle(
                color: Color(0xFF1E9E68),
                fontSize: 18,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
        centerTitle: true,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: const Color(0xFFEEEEEE)),
        ),
      ),
      body: IndexedStack(
        index: _tabIndex,
        children: [
          _HomeTab(
            onSwitchToEarnings: () => setState(() => _tabIndex = 1),
          ),
          const _EarningsTab(),
          const _HistoryTab(),
          const _ProfileTab(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: BottomNavigationBar(
            currentIndex: _tabIndex,
            selectedItemColor: const Color(0xFF1E9E68),
            unselectedItemColor: Colors.grey.shade400,
            backgroundColor: Colors.transparent,
            type: BottomNavigationBarType.fixed,
            elevation: 0,
            selectedLabelStyle: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
            unselectedLabelStyle: const TextStyle(fontSize: 11),
            onTap: (i) => setState(() => _tabIndex = i),
            items: [
              const BottomNavigationBarItem(
                icon: Icon(Icons.home_rounded),
                label: 'Home',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.account_balance_wallet_rounded),
                label: 'Earnings',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.history_rounded),
                label: 'History',
              ),
              BottomNavigationBarItem(
                icon: Stack(
                  children: [
                    const Icon(Icons.person_rounded),
                    if (unread > 0)
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                  ],
                ),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Tab 0: Home ──────────────────────────────────────────────────────────────

class _HomeTab extends ConsumerWidget {
  final VoidCallback? onSwitchToEarnings;

  const _HomeTab({this.onSwitchToEarnings});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(riderProvider);

    return SafeArea(
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildHeader(context, ref, state),
                const SizedBox(height: 20),
                _OnlineToggleCard(
                  isOnline: state.isOnline,
                  onToggle: (v) =>
                      ref.read(riderProvider.notifier).setOnline(v),
                ),
                const SizedBox(height: 20),
                _TodayStatsRow(state: state),
                const SizedBox(height: 24),
                if (state.activeDelivery != null) ...[
                  _SectionHeader(
                    label: 'Active Delivery',
                    badge: 'Live',
                    badgeColor: Colors.green.shade600,
                  ),
                  const SizedBox(height: 12),
                  _ActiveDeliveryBanner(order: state.activeDelivery!),
                  const SizedBox(height: 24),
                ],
                if (state.isOnline) ...[
                  _SectionHeader(
                    label: 'New Requests',
                    badge: state.pendingRequests.isNotEmpty
                        ? '${state.pendingRequests.length}'
                        : null,
                    badgeColor: const Color(0xFF1E9E68),
                  ),
                  const SizedBox(height: 12),
                  if (state.pendingRequests.isEmpty)
                    const _EmptyRequestsState()
                  else
                    ...state.pendingRequests.map(
                      (req) => _DeliveryRequestCard(order: req),
                    ),
                ] else
                  const _OfflineState(),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(
      BuildContext context, WidgetRef ref, RiderState state) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 17
            ? 'Good afternoon'
            : 'Good evening';

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$greeting,',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
              ),
              const SizedBox(height: 2),
              Text(
                state.profile.name,
                style: const TextStyle(
                  color: Color(0xFF1E9E68),
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5EE),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  state.profile.riderTypeLabel,
                  style: const TextStyle(
                    color: Color(0xFF1E9E68),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        GestureDetector(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => RiderNotificationsScreen(
                // Delivery: already on Home, just pop — no extra action
                onDeliveryTapped: null,
                // Payment: switch to Earnings tab after popping
                onPaymentTapped: onSwitchToEarnings,
              ),
            ),
          ),
          child: Stack(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: const Icon(CupertinoIcons.bell,
                    size: 22, color: Colors.black87),
              ),
              if (state.unreadNotificationCount > 0)
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '${state.unreadNotificationCount}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Online toggle card ───────────────────────────────────────────────────────

class _OnlineToggleCard extends StatelessWidget {
  final bool isOnline;
  final ValueChanged<bool> onToggle;

  const _OnlineToggleCard(
      {required this.isOnline, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isOnline
                  ? const Color(0xFFE8F5EE)
                  : Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isOnline
                  ? Icons.motorcycle_rounded
                  : Icons.power_settings_new_rounded,
              color: isOnline
                  ? const Color(0xFF1E9E68)
                  : Colors.grey.shade500,
              size: 26,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isOnline ? "You're Online" : "You're Offline",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isOnline ? Colors.black87 : Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  isOnline
                      ? 'Ready to receive delivery requests'
                      : 'Go online to start receiving orders',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: isOnline,
            activeTrackColor: const Color(0xFF1E9E68),
            activeColor: Colors.white,
            inactiveThumbColor: Colors.white,
            inactiveTrackColor: Colors.grey.shade300,
            onChanged: onToggle,
          ),
        ],
      ),
    );
  }
}

// ─── Today stats row ──────────────────────────────────────────────────────────

class _TodayStatsRow extends StatelessWidget {
  final RiderState state;

  const _TodayStatsRow({required this.state});

  @override
  Widget build(BuildContext context) {
    final earnings = state.earnings;
    final riderType = state.profile.riderType;
    final isPerTrip = riderType == RiderType.perTrip;
    final hasTarget = earnings.tripTarget > 0;

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: isPerTrip
                ? Icons.account_balance_wallet_outlined
                : Icons.assignment_turned_in_outlined,
            color: const Color(0xFF1E9E68),
            label: isPerTrip ? "Today's Earnings" : 'Period Trips',
            value: isPerTrip
                ? '${earnings.todayEarnings.toInt()} RWF'
                : hasTarget
                    ? '${earnings.periodTripsCompleted} / ${earnings.tripTarget}'
                    : '${earnings.periodTripsCompleted}',
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Icons.check_circle_outline_rounded,
            color: Colors.blue.shade600,
            label: 'Completed Today',
            value: '${earnings.todayTrips} trips',
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;

  const _StatCard({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

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
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }
}

// ─── Active delivery banner ───────────────────────────────────────────────────

class _ActiveDeliveryBanner extends StatelessWidget {
  final RiderDeliveryOrder order;

  const _ActiveDeliveryBanner({required this.order});

  @override
  Widget build(BuildContext context) {
    final stepIndex = order.activeStep?.index ?? 0;
    final stepLabels = [
      'Going to Pharmacy',
      'At Pharmacy',
      'Delivering',
      'At Destination',
    ];
    final currentLabel =
        stepLabels[stepIndex.clamp(0, stepLabels.length - 1)];

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
            builder: (_) => const RiderActiveDeliveryScreen()),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFF1E9E68), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1E9E68).withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.circle,
                          size: 8, color: Colors.orange.shade600),
                      const SizedBox(width: 6),
                      Text(
                        currentLabel,
                        style: TextStyle(
                          color: Colors.orange.shade700,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  order.orderCode,
                  style: TextStyle(
                    color: Colors.grey.shade500,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _miniRow(Icons.store_rounded, Colors.orange.shade600,
                'Pickup: ${order.pickupName}',
                dim: stepIndex > 1),
            Padding(
              padding: const EdgeInsets.only(left: 9),
              child: Container(
                  width: 2,
                  height: 16,
                  color: stepIndex > 1
                      ? const Color(0xFF1E9E68)
                      : Colors.grey.shade200),
            ),
            _miniRow(Icons.location_on_rounded, Colors.blue.shade600,
                'Deliver: ${order.destinationAddress.split(',').first}'),
            const SizedBox(height: 14),
            _DeliveryTimer(
                acceptedAt: order.acceptedAt ?? order.createdAt),
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E9E68),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.play_arrow_rounded,
                      color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Continue Delivery',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _miniRow(IconData icon, Color color, String text,
      {bool dim = false}) {
    return Row(
      children: [
        Container(
          margin: const EdgeInsets.only(right: 10),
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 12, color: color),
        ),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 13,
              color: dim ? Colors.grey.shade400 : Colors.black87,
              fontWeight: dim ? FontWeight.normal : FontWeight.w500,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

// ─── Live delivery timer ──────────────────────────────────────────────────────

class _DeliveryTimer extends StatefulWidget {
  final DateTime acceptedAt;

  const _DeliveryTimer({required this.acceptedAt});

  @override
  State<_DeliveryTimer> createState() => _DeliveryTimerState();
}

class _DeliveryTimerState extends State<_DeliveryTimer> {
  late Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(
        const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final elapsed = DateTime.now().difference(widget.acceptedAt);
    final m = elapsed.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = elapsed.inSeconds.remainder(60).toString().padLeft(2, '0');
    final h = elapsed.inHours;
    final label = h > 0 ? '${h}h ${m}m ${s}s' : '${m}m ${s}s';

    return Row(
      children: [
        Icon(Icons.timer_outlined, color: Colors.grey.shade500, size: 15),
        const SizedBox(width: 6),
        Text(
          'Elapsed: $label',
          style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
        ),
      ],
    );
  }
}

// ─── Delivery request card ────────────────────────────────────────────────────

class _DeliveryRequestCard extends ConsumerWidget {
  final RiderDeliveryOrder order;

  const _DeliveryRequestCard({required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isPerTrip =
        ref.read(riderProvider).profile.riderType == RiderType.perTrip;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5EE),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.local_hospital_rounded,
                      color: Color(0xFF1E9E68), size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.orderCode,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: Colors.black87,
                        ),
                      ),
                      Text(
                        '${order.estimatedDistanceKm} km  •  ~${order.estimatedTimeMinutes} min',
                        style: TextStyle(
                            color: Colors.grey.shade500, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                if (isPerTrip)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5EE),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${order.riderEarning.toInt()} RWF',
                      style: const TextStyle(
                        color: Color(0xFF1E9E68),
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 14),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Divider(height: 1),
          ),
          const SizedBox(height: 14),

          // Locations
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                _locationRow(
                  Icons.store_rounded,
                  Colors.orange.shade600,
                  'Pickup',
                  order.pickupName,
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 10),
                  child: Container(
                    width: 2,
                    height: 14,
                    color: Colors.grey.shade200,
                  ),
                ),
                _locationRow(
                  Icons.location_on_rounded,
                  Colors.blue.shade600,
                  'Deliver to',
                  order.destinationAddress.split(',').first,
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Info chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _infoChip(Icons.inventory_2_outlined,
                    '${order.packageCount} ${order.packageCount == 1 ? 'item' : 'items'}'),
                const SizedBox(width: 8),
                if (order.specialNote != null)
                  _infoChip(Icons.info_outline, order.specialNote!,
                      color: Colors.orange.shade700),
              ],
            ),
          ),
          const SizedBox(height: 10),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(Icons.medical_services_outlined,
                    size: 13, color: Colors.grey.shade400),
                const SizedBox(width: 6),
                Text(
                  'Medical items – handle with care',
                  style:
                      TextStyle(color: Colors.grey.shade500, fontSize: 11),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Divider(height: 1),
          ),
          const SizedBox(height: 14),

          // Buttons
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => _showRejectionSheet(context, ref, order),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 22, vertical: 14),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Reject',
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: () => _onAccept(context, ref, order),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E9E68),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle_rounded,
                              color: Colors.white, size: 18),
                          SizedBox(width: 8),
                          Text(
                            'Accept Delivery',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _locationRow(
      IconData icon, Color color, String type, String name) {
    return Row(
      children: [
        Container(
          margin: const EdgeInsets.only(right: 10),
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 12, color: color),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(type,
                  style: TextStyle(
                      color: Colors.grey.shade500, fontSize: 11)),
              Text(
                name,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: Colors.black87,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _infoChip(IconData icon, String label, {Color? color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color ?? Colors.grey.shade500),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
                fontSize: 11, color: color ?? Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  void _onAccept(
      BuildContext context, WidgetRef ref, RiderDeliveryOrder order) {
    ref.read(riderProvider.notifier).acceptDelivery(order);
    Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => const RiderActiveDeliveryScreen()),
    );
  }

  void _showRejectionSheet(
      BuildContext context, WidgetRef ref, RiderDeliveryOrder order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RejectionReasonSheet(
        order: order,
        onConfirm: (reason, custom) {
          ref
              .read(riderProvider.notifier)
              .rejectDelivery(order.id, reason, customReason: custom);
          Navigator.pop(context);
        },
      ),
    );
  }
}

// ─── Rejection reason bottom sheet ───────────────────────────────────────────

class _RejectionReasonSheet extends StatefulWidget {
  final RiderDeliveryOrder order;
  final void Function(String reason, String? customReason) onConfirm;

  const _RejectionReasonSheet({
    required this.order,
    required this.onConfirm,
  });

  @override
  State<_RejectionReasonSheet> createState() =>
      _RejectionReasonSheetState();
}

class _RejectionReasonSheetState extends State<_RejectionReasonSheet> {
  String? _selected;
  final _otherCtrl = TextEditingController();

  static const _reasons = [
    'Too far',
    'Bike / vehicle issue',
    'Not available right now',
    'Bad weather',
    'Emergency',
    'Location problem',
    'Other',
  ];

  @override
  void dispose() {
    _otherCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      maxChildSize: 0.9,
      minChildSize: 0.5,
      builder: (_, scrollCtrl) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius:
                BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: ListView(
            controller: scrollCtrl,
            padding: const EdgeInsets.all(24),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Why are you rejecting?',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Order ${widget.order.orderCode} • Select a reason',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 20),
              ..._reasons.map(
                (r) => GestureDetector(
                  onTap: () => setState(() => _selected = r),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: _selected == r
                          ? const Color(0xFFE8F5EE)
                          : Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: _selected == r
                            ? const Color(0xFF1E9E68)
                            : Colors.grey.shade200,
                        width: _selected == r ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _selected == r
                                ? const Color(0xFF1E9E68)
                                : Colors.grey.shade200,
                          ),
                          child: _selected == r
                              ? const Icon(Icons.check,
                                  color: Colors.white, size: 14)
                              : null,
                        ),
                        const SizedBox(width: 14),
                        Text(
                          r,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: _selected == r
                                ? FontWeight.bold
                                : FontWeight.normal,
                            color: Colors.black87,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (_selected == 'Other') ...[
                const SizedBox(height: 8),
                TextField(
                  controller: _otherCtrl,
                  maxLines: 2,
                  maxLength: 100,
                  decoration: InputDecoration(
                    hintText: 'Describe the issue briefly...',
                    hintStyle:
                        TextStyle(color: Colors.grey.shade400),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          BorderSide(color: Colors.grey.shade300),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                          color: Color(0xFF1E9E68), width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.all(14),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _selected != null
                        ? Colors.red.shade600
                        : Colors.grey.shade300,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  onPressed: _selected == null
                      ? null
                      : () => widget.onConfirm(
                            _selected!,
                            _selected == 'Other' &&
                                    _otherCtrl.text.isNotEmpty
                                ? _otherCtrl.text.trim()
                                : null,
                          ),
                  child: const Text(
                    'Confirm Rejection',
                    style: TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ─── Empty / offline states ───────────────────────────────────────────────────

class _EmptyRequestsState extends StatelessWidget {
  const _EmptyRequestsState();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 48),
      alignment: Alignment.center,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: Color(0xFFE8F5EE),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_outline_rounded,
              size: 48,
              color: Color(0xFF1E9E68),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            "You're ready!",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'New delivery requests\nwill appear here.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
          ),
          const SizedBox(height: 20),
          const SizedBox(
            width: 28,
            height: 28,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              color: Color(0xFF1E9E68),
            ),
          ),
        ],
      ),
    );
  }
}

class _OfflineState extends StatelessWidget {
  const _OfflineState();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 56, horizontal: 16),
      alignment: Alignment.center,
      child: Column(
        children: [
          Icon(Icons.location_off_rounded,
              size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          const Text(
            'You are offline',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black54,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Toggle the switch above to\nstart receiving deliveries.',
            textAlign: TextAlign.center,
            style:
                TextStyle(fontSize: 14, color: Colors.grey.shade400),
          ),
        ],
      ),
    );
  }
}

// ─── Section header ───────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String label;
  final String? badge;
  final Color? badgeColor;

  const _SectionHeader(
      {required this.label, this.badge, this.badgeColor});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        if (badge != null) ...[
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              color: (badgeColor ?? const Color(0xFF1E9E68))
                  .withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              badge!,
              style: TextStyle(
                color: badgeColor ?? const Color(0xFF1E9E68),
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// ─── Tab 1: Earnings ──────────────────────────────────────────────────────────

class _EarningsTab extends ConsumerWidget {
  const _EarningsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(riderProvider);
    final isPerTrip = state.profile.riderType == RiderType.perTrip;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        physics: const BouncingScrollPhysics(),
        children: [
          const Text(
            'Earnings',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 20),
          if (isPerTrip)
            _PerTripEarningsView(state: state)
          else
            _SalaryEarningsView(state: state),
        ],
      ),
    );
  }
}

// ─── Per-Trip Earnings View ───────────────────────────────────────────────────

class _PerTripEarningsView extends StatelessWidget {
  final RiderState state;
  const _PerTripEarningsView({required this.state});

  @override
  Widget build(BuildContext context) {
    final earnings = state.earnings;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Pending payout card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1E9E68), Color(0xFF16875A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E9E68).withValues(alpha: 0.25),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const Icon(Icons.account_balance_wallet,
                    color: Colors.white70, size: 15),
                const SizedBox(width: 6),
                const Text('Pending Payout',
                    style: TextStyle(color: Colors.white70, fontSize: 13)),
              ]),
              const SizedBox(height: 8),
              Text(
                '${earnings.pendingPayout.toInt()} RWF',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Available for withdrawal',
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7), fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Request Payout button
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFF1E9E68),
              side: const BorderSide(color: Color(0xFF1E9E68)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              elevation: 0,
            ),
            icon: const Icon(Icons.account_balance_wallet_rounded, size: 18),
            label: const Text(
              'Request Payout',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const RiderPayoutScreen()),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: _EarningsStatCard(
                label: "Today's Earnings",
                value: '${earnings.todayEarnings.toInt()} RWF',
                subValue: '${earnings.todayTrips} trips',
                color: const Color(0xFF1E9E68),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _EarningsStatCard(
                label: 'This Week',
                value: '${earnings.weeklyEarnings.toInt()} RWF',
                subValue: '${earnings.weeklyTrips} trips',
                color: Colors.blue.shade600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        const Text(
          'Recent Deliveries',
          style: TextStyle(
              fontSize: 17, fontWeight: FontWeight.bold, color: Colors.black87),
        ),
        const SizedBox(height: 12),
        if (earnings.recentEntries.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Text('No completed deliveries yet.',
                  style: TextStyle(color: Colors.grey.shade500)),
            ),
          )
        else
          ...earnings.recentEntries
              .map((e) => _EarningEntryTile(entry: e, showAmount: true)),
      ],
    );
  }
}

// ─── Salary Earnings View (weekly / monthly) ──────────────────────────────────

class _SalaryEarningsView extends StatelessWidget {
  final RiderState state;
  const _SalaryEarningsView({required this.state});

  @override
  Widget build(BuildContext context) {
    final earnings = state.earnings;
    final isMonthly = state.profile.riderType == RiderType.monthly;
    final periodLabel = isMonthly ? 'Monthly' : 'Weekly';
    final bonus = earnings.bonusEarned;
    final hasTarget = earnings.tripTarget > 0;
    final tripsLeft = hasTarget
        ? (earnings.tripTarget - earnings.periodTripsCompleted).clamp(0, 999)
        : 0;
    final aboveTarget = hasTarget &&
        earnings.periodTripsCompleted > earnings.tripTarget;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Salary card ────────────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1E9E68), Color(0xFF16875A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E9E68).withValues(alpha: 0.25),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '$periodLabel Salary',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _statusColor(earnings.paymentStatus)
                          .withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      earnings.paymentStatus,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                '${_fmt(earnings.fixedSalary)} RWF',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 34,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
              if (bonus > 0) ...[
                const SizedBox(height: 4),
                Text(
                  '+ ${_fmt(bonus)} RWF bonus',
                  style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 13,
                      fontWeight: FontWeight.w600),
                ),
              ],
              const SizedBox(height: 14),
              const Divider(color: Colors.white24, height: 1),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Icon(Icons.calendar_today_rounded,
                      color: Colors.white70, size: 14),
                  const SizedBox(width: 6),
                  Text(
                    earnings.paymentPeriodLabel,
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const Spacer(),
                  if (earnings.nextPayDate != null) ...[
                    const Icon(Icons.payments_outlined,
                        color: Colors.white70, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      'Pay: ${DateFormat('d MMM').format(earnings.nextPayDate!)}',
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 13),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // ── Pay period progress ────────────────────────────────────────────
        if (earnings.nextPayDate != null) _PayPeriodProgress(earnings: earnings),
        const SizedBox(height: 16),

        // ── Trip target stats ──────────────────────────────────────────────
        Row(
          children: [
            Expanded(
              child: _EarningsStatCard(
                label: hasTarget ? 'Trips vs Target' : 'Trips This Period',
                value: hasTarget
                    ? '${earnings.periodTripsCompleted} / ${earnings.tripTarget}'
                    : '${earnings.periodTripsCompleted}',
                subValue: hasTarget
                    ? (aboveTarget
                        ? '${earnings.periodTripsCompleted - earnings.tripTarget} above target 🎯'
                        : '$tripsLeft more to hit target')
                    : 'completed',
                color: aboveTarget
                    ? Colors.orange.shade700
                    : const Color(0xFF1E9E68),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _EarningsStatCard(
                label: 'Bonus Earned',
                value: bonus > 0 ? '+${_fmt(bonus)} RWF' : '—',
                subValue: earnings.bonusPerExtraTrip > 0
                    ? '${_fmt(earnings.bonusPerExtraTrip)} RWF/extra trip'
                    : 'No bonus structure',
                color:
                    bonus > 0 ? Colors.orange.shade700 : Colors.grey.shade400,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // ── Today summary ──────────────────────────────────────────────────
        Row(
          children: [
            Expanded(
              child: _EarningsStatCard(
                label: "Today's Trips",
                value: '${earnings.todayTrips}',
                subValue: 'completed today',
                color: Colors.blue.shade600,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _EarningsStatCard(
                label: "Total + Bonus",
                value: '${_fmt(earnings.totalSalaryEarned)} RWF',
                subValue: 'projected this period',
                color: Colors.purple.shade600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // ── Delivery log ───────────────────────────────────────────────────
        const Text(
          'Delivery Log',
          style: TextStyle(
              fontSize: 17, fontWeight: FontWeight.bold, color: Colors.black87),
        ),
        const SizedBox(height: 12),
        if (earnings.recentEntries.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Text('No completed deliveries yet.',
                  style: TextStyle(color: Colors.grey.shade500)),
            ),
          )
        else
          ...earnings.recentEntries
              .map((e) => _EarningEntryTile(entry: e, showAmount: false)),
      ],
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'Paid':
        return Colors.greenAccent;
      case 'Processing':
        return Colors.orangeAccent;
      default:
        return Colors.white;
    }
  }

  String _fmt(double v) => NumberFormat('#,##0', 'en_US').format(v.toInt());
}

// ─── Pay Period Progress Bar ─────────────────────────────────────────────────

class _PayPeriodProgress extends StatelessWidget {
  final RiderEarnings earnings;
  const _PayPeriodProgress({required this.earnings});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final payDate = earnings.nextPayDate!;

    // Infer period start from the label (e.g. "May 1 – May 31, 2026")
    // Fall back to 30 days before payDate
    final periodStart = DateTime(payDate.year, payDate.month, 1);
    final totalDays = payDate.difference(periodStart).inDays + 1;
    final elapsedDays = now.difference(periodStart).inDays.clamp(0, totalDays);
    final progress = totalDays > 0 ? elapsedDays / totalDays : 0.0;
    final daysLeft = (payDate.difference(now).inDays).clamp(0, totalDays);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.03), blurRadius: 8),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Period Progress',
                style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 12,
                    fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              Text(
                '$daysLeft day${daysLeft == 1 ? '' : 's'} until pay',
                style: const TextStyle(
                    color: Color(0xFF1E9E68),
                    fontSize: 12,
                    fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress.toDouble(),
              minHeight: 8,
              backgroundColor: Colors.grey.shade100,
              valueColor: AlwaysStoppedAnimation<Color>(
                progress > 0.85
                    ? Colors.orange.shade500
                    : const Color(0xFF1E9E68),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Day $elapsedDays of $totalDays  •  ${(progress * 100).toStringAsFixed(0)}% complete',
            style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _EarningsStatCard extends StatelessWidget {
  final String label;
  final String value;
  final String subValue;
  final Color color;

  const _EarningsStatCard({
    required this.label,
    required this.value,
    required this.subValue,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(
                  color: Colors.grey.shade500,
                  fontSize: 12,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                  color: color,
                  fontSize: 18,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 3),
          Text(subValue,
              style:
                  TextStyle(color: Colors.grey.shade500, fontSize: 12)),
        ],
      ),
    );
  }
}

class _EarningEntryTile extends StatelessWidget {
  final EarningEntry entry;
  final bool showAmount;

  const _EarningEntryTile(
      {required this.entry, required this.showAmount});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5EE),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.check_circle_rounded,
                color: Color(0xFF1E9E68), size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.orderCode,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${entry.destinationArea}  •  ${DateFormat('d MMM, h:mm a').format(entry.date)}',
                  style: TextStyle(
                      color: Colors.grey.shade500, fontSize: 12),
                ),
              ],
            ),
          ),
          if (showAmount)
            Text(
              '+${entry.amount.toInt()} RWF',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E9E68),
                fontSize: 14,
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Tab 2: History ───────────────────────────────────────────────────────────

class _HistoryTab extends ConsumerStatefulWidget {
  const _HistoryTab();

  @override
  ConsumerState<_HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends ConsumerState<_HistoryTab> {
  int _filter = 0;

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(riderProvider).history;
    final now = DateTime.now();

    final filtered = history.where((o) {
      final date = o.deliveredAt ?? o.createdAt;
      switch (_filter) {
        case 0:
          return date.day == now.day &&
              date.month == now.month &&
              date.year == now.year;
        case 1:
          return now.difference(date).inDays < 7;
        case 2:
          return date.month == now.month &&
              date.year == now.year;
        default:
          return true;
      }
    }).toList();

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Row(
              children: [
                const Text(
                  'Delivery History',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const Spacer(),
                Text(
                  '${history.length} total',
                  style:
                      TextStyle(color: Colors.grey.shade500, fontSize: 13),
                ),
              ],
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                _FilterChip(
                  label: 'Today',
                  selected: _filter == 0,
                  onTap: () => setState(() => _filter = 0),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'This Week',
                  selected: _filter == 1,
                  onTap: () => setState(() => _filter = 1),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'This Month',
                  selected: _filter == 2,
                  onTap: () => setState(() => _filter = 2),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.history_rounded,
                            size: 56, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        Text(
                          'No deliveries for this period.',
                          style:
                              TextStyle(color: Colors.grey.shade500),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 20),
                    physics: const BouncingScrollPhysics(),
                    itemCount: filtered.length,
                    itemBuilder: (_, i) =>
                        _HistoryItemTile(order: filtered[i]),
                  ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip(
      {required this.label,
      required this.selected,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color:
              selected ? const Color(0xFF1E9E68) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? const Color(0xFF1E9E68)
                : Colors.grey.shade300,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color:
                selected ? Colors.white : Colors.grey.shade700,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

class _HistoryItemTile extends StatelessWidget {
  final RiderDeliveryOrder order;

  const _HistoryItemTile({required this.order});

  Color get _statusColor {
    switch (order.status) {
      case RiderDeliveryStatus.delivered:
        return const Color(0xFF1E9E68);
      case RiderDeliveryStatus.rejected:
        return Colors.orange.shade600;
      case RiderDeliveryStatus.cancelled:
        return Colors.red.shade600;
      default:
        return Colors.grey;
    }
  }

  IconData get _statusIcon {
    switch (order.status) {
      case RiderDeliveryStatus.delivered:
        return Icons.check_circle_rounded;
      case RiderDeliveryStatus.rejected:
        return Icons.cancel_rounded;
      case RiderDeliveryStatus.cancelled:
        return Icons.do_not_disturb_rounded;
      default:
        return Icons.circle_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final date = order.deliveredAt ?? order.createdAt;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_statusIcon, color: _statusColor, size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${order.orderCode}  •  ${order.pickupName}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '→ ${order.destinationAddress.split(',').first}',
                  style: TextStyle(
                      color: Colors.grey.shade500, fontSize: 12),
                ),
                const SizedBox(height: 3),
                Text(
                  DateFormat('d MMM yyyy, h:mm a').format(date),
                  style: TextStyle(
                      color: Colors.grey.shade400, fontSize: 11),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  order.statusLabel,
                  style: TextStyle(
                    color: _statusColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
              ),
              if (order.status == RiderDeliveryStatus.delivered) ...[
                const SizedBox(height: 4),
                Text(
                  '+${order.riderEarning.toInt()} RWF',
                  style: const TextStyle(
                    color: Color(0xFF1E9E68),
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Tab 3: Profile ───────────────────────────────────────────────────────────

class _ProfileTab extends ConsumerWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(riderProvider).profile;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        physics: const BouncingScrollPhysics(),
        children: [
          const Text(
            'My Profile',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 24),

          Center(
            child: Column(
              children: [
                Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    CircleAvatar(
                      radius: 48,
                      backgroundColor: const Color(0xFFE8F5EE),
                      child: Text(
                        profile.name.isNotEmpty
                            ? profile.name[0].toUpperCase()
                            : 'R',
                        style: const TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E9E68),
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Color(0xFF1E9E68),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.verified_rounded,
                          color: Colors.white, size: 16),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  profile.name,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  profile.phone,
                  style: TextStyle(
                      color: Colors.grey.shade500, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5EE),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    profile.riderTypeLabel,
                    style: const TextStyle(
                      color: Color(0xFF1E9E68),
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          _ProfileTile(
            icon: Icons.motorcycle_rounded,
            label: 'Vehicle',
            value: '${profile.vehicleType} – ${profile.vehiclePlate}',
          ),
          _ProfileTile(
            icon: Icons.location_on_rounded,
            label: 'Assigned Area',
            value: profile.assignedArea,
          ),
          _ProfileTile(
            icon: Icons.verified_user_rounded,
            label: 'Verification',
            value: profile.isVerified ? 'Verified' : 'Pending',
            valueColor: profile.isVerified
                ? const Color(0xFF1E9E68)
                : Colors.orange,
          ),
          _ProfileTile(
            icon: Icons.payment_rounded,
            label: 'Payout Method',
            value: profile.payoutMethod,
          ),

          const SizedBox(height: 16),

          _ActionTile(
            icon: Icons.notifications_outlined,
            label: 'Notifications',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) =>
                      const RiderNotificationsScreen()),
            ),
          ),
          _ActionTile(
            icon: Icons.help_outline_rounded,
            label: 'Help & Emergency Support',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => const RiderHelpScreen()),
            ),
          ),

          const SizedBox(height: 16),

          // ── Demo: switch rider type ──────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Demo: Switch Rider Type',
                  style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 10),
                Row(
                  children: RiderType.values.map((type) {
                    final isSelected = profile.riderType == type;
                    final label = switch (type) {
                      RiderType.perTrip => 'Per-Trip',
                      RiderType.weekly => 'Weekly',
                      RiderType.monthly => 'Monthly',
                    };
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => ref
                            .read(riderProvider.notifier)
                            .switchRiderTypeDemo(type),
                        child: Container(
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFF1E9E68)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isSelected
                                  ? const Color(0xFF1E9E68)
                                  : Colors.grey.shade300,
                            ),
                          ),
                          child: Text(
                            label,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Colors.white
                                  : Colors.grey.shade600,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          ListTile(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            tileColor: Colors.red.shade50,
            leading:
                Icon(Icons.logout_rounded, color: Colors.red.shade600),
            title: Text(
              'Log Out',
              style: TextStyle(
                color: Colors.red.shade600,
                fontWeight: FontWeight.bold,
              ),
            ),
            onTap: () => ref.read(authProvider.notifier).logout(),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _ProfileTile({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5EE),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: const Color(0xFF1E9E68), size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                      color: Colors.grey.shade500, fontSize: 11),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: valueColor ?? Colors.black87,
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

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFE8F5EE),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: const Color(0xFF1E9E68), size: 18),
        ),
        title: Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: onTap,
      ),
    );
  }
}
