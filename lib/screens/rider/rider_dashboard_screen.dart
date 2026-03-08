import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../models/models.dart';
import '../../services/pharmacist_service.dart';
import '../auth_screen.dart';

class RiderDashboardScreen extends StatefulWidget {
  const RiderDashboardScreen({super.key});

  @override
  State<RiderDashboardScreen> createState() => _RiderDashboardScreenState();
}

class _RiderDashboardScreenState extends State<RiderDashboardScreen> {
  int _currentIndex = 0;
  bool _isOnline = true;

  // Rider Context
  final String _riderId = "DR-01";
  final String _riderName = "Jean Paul";

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: _buildBody(),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          selectedItemColor: Colors.green.shade800,
          unselectedItemColor: Colors.grey.shade500,
          backgroundColor: Colors.white,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          onTap: (idx) => setState(() => _currentIndex = idx),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_rounded),
              label: "Dashboard",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_rounded),
              label: "Earnings",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.history_rounded),
              label: "History",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_rounded),
              label: "Account",
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    switch (_currentIndex) {
      case 0:
        return _DashboardTab(
          isOnline: _isOnline,
          onToggleOnline: (v) => setState(() => _isOnline = v),
          riderId: _riderId,
          riderName: _riderName,
        );
      case 1:
        return _EarningsTab(riderId: _riderId, riderName: _riderName);
      case 2:
        return _HistoryTab(riderId: _riderId, riderName: _riderName);
      case 3:
      default:
        return _AccountTab(riderName: _riderName);
    }
  }
}

// -----------------------------------------------------------------------------
// TAB 1: DASHBOARD
// -----------------------------------------------------------------------------
class _DashboardTab extends StatelessWidget {
  final bool isOnline;
  final ValueChanged<bool> onToggleOnline;
  final String riderId;
  final String riderName;

  const _DashboardTab({
    required this.isOnline,
    required this.onToggleOnline,
    required this.riderId,
    required this.riderName,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListenableBuilder(
        listenable: PharmacistService(),
        builder: (context, _) {
          final allOrders = PharmacistService().orders;

          // Compute Tasks Data
          final activeTask = allOrders
              .where(
                (o) =>
                    o.assignedDriverName == riderName &&
                    (o.status == OrderStatus.driverAssigned ||
                        o.status == OrderStatus.outForDelivery),
              )
              .firstOrNull;

          // Pull real orders that need a driver (Status = readyForPickup)
          final newRequests = allOrders
              .where((o) => o.status == OrderStatus.readyForPickup)
              .toList();

          final completedCount = allOrders
              .where(
                (o) =>
                    o.assignedDriverName == riderName &&
                    o.status == OrderStatus.delivered,
              )
              .length;

          return CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.all(20),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _buildHeader(context),
                    const SizedBox(height: 24),
                    _buildStatusCard(),
                    const SizedBox(height: 24),
                    _buildMetricsGrid(completedCount),
                    const SizedBox(height: 32),

                    if (activeTask != null) ...[
                      const Text(
                        "Active Delivery",
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildActiveTripCard(context, activeTask),
                      const SizedBox(height: 32),
                    ],

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "New Requests",
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Colors.black87,
                          ),
                        ),
                        if (isOnline && newRequests.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.green.shade100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              "${newRequests.length} Available",
                              style: TextStyle(
                                color: Colors.green.shade800,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    if (!isOnline)
                      _buildOfflineNotice()
                    else if (newRequests.isEmpty)
                      _buildEmptyRequestsNotice()
                    else
                      ...newRequests.map(
                        (req) => _buildRequestCard(context, req),
                      ),
                  ]),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Welcome back,",
              style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
            ),
            Text(
              riderName,
              style: TextStyle(
                color: Colors.green.shade800,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        Stack(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: const Icon(
                CupertinoIcons.bell,
                color: Colors.black87,
                size: 22,
              ),
            ),
            Positioned(
              right: 0,
              top: 0,
              child: Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatusCard() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isOnline ? Colors.green.shade50 : Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isOnline
                  ? Icons.motorcycle_rounded
                  : Icons.power_settings_new_rounded,
              color: isOnline ? Colors.green.shade700 : Colors.grey.shade500,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isOnline ? "You're Online" : "You're Offline",
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isOnline
                      ? "Searching for nearby orders..."
                      : "Go online to receive orders",
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          Switch(
            value: isOnline,
            activeTrackColor: Colors.green.shade600,
            inactiveThumbColor: Colors.grey.shade400,
            inactiveTrackColor: Colors.grey.shade200,
            onChanged: onToggleOnline,
          ),
        ],
      ),
    );
  }

  Widget _buildMetricsGrid(int completedCount) {
    return Row(
      children: [
        Expanded(
          child: _buildMetricCard(
            "Today's Earnings",
            "18,500 RWF",
            Icons.account_balance_wallet_outlined,
            Colors.blue,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildMetricCard(
            "Completed",
            "$completedCount Trips",
            Icons.check_circle_outline,
            Colors.orange,
          ),
        ),
      ],
    );
  }

  Widget _buildMetricCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              color: Colors.black87,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveTripCard(BuildContext context, PrescriptionOrder task) {
    bool toPharmacy = task.status == OrderStatus.driverAssigned;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.green.shade200, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.green.withValues(alpha: 0.1),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: toPharmacy
                      ? Colors.orange.shade100
                      : Colors.blue.shade100,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    Icon(
                      toPharmacy ? Icons.storefront : Icons.person_pin,
                      size: 14,
                      color: toPharmacy
                          ? Colors.orange.shade800
                          : Colors.blue.shade800,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      toPharmacy ? "Heading to Pharmacy" : "Out for Delivery",
                      style: TextStyle(
                        color: toPharmacy
                            ? Colors.orange.shade800
                            : Colors.blue.shade800,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                "#${task.id}",
                style: TextStyle(
                  color: Colors.grey.shade500,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Timeline logic
          _buildProgressTimeline(
            title: toPharmacy ? "Pickup at" : "Pick up from",
            subtitle: task.assignedPharmacyName ?? "Pharmacy",
            isCompleted: !toPharmacy,
            isCurrent: toPharmacy,
          ),
          _buildProgressTimelineLine(isCompleted: !toPharmacy),
          _buildProgressTimeline(
            title: "Drop off at",
            subtitle: task.patientLocationName,
            isCompleted: task.status == OrderStatus.delivered,
            isCurrent: !toPharmacy,
          ),

          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade700,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => TripMapScreen(task: task)),
                );
              },
              child: const Text(
                "View Route Details",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressTimeline({
    required String title,
    required String subtitle,
    required bool isCompleted,
    required bool isCurrent,
  }) {
    Color dotColor = isCompleted
        ? Colors.green.shade600
        : (isCurrent ? Colors.green.shade600 : Colors.grey.shade300);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.only(top: 4, right: 16, left: 2),
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: isCurrent ? Colors.white : dotColor,
            border: isCurrent
                ? Border.all(color: Colors.green, width: 4)
                : null,
            shape: BoxShape.circle,
          ),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  color: Colors.black87,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProgressTimelineLine({required bool isCompleted}) {
    return Container(
      margin: const EdgeInsets.only(left: 9, top: 4, bottom: 4),
      width: 2,
      height: 24,
      color: isCompleted ? Colors.green.shade600 : Colors.grey.shade300,
    );
  }

  Widget _buildRequestCard(BuildContext context, PrescriptionOrder req) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.inventory_2,
                      color: Colors.green.shade700,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "#${req.id}",
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        "Distance: ~4.2 km",
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Text(
                "${req.deliveryFee.toInt()} RWF",
                style: TextStyle(
                  color: Colors.green.shade800,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(Icons.store, size: 16, color: Colors.grey.shade400),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  req.assignedPharmacyName ?? "Pharmacy",
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                Icons.person_pin_circle,
                size: 16,
                color: Colors.grey.shade400,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  req.patientLocationName,
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade50,
                foregroundColor: Colors.green.shade800,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onPressed: () {
                // Mock Driver Object
                final mockDriver = Driver(
                  id: riderId,
                  name: riderName,
                  phoneNumber: "+250788000111",
                  currentCoordinates: [-1.95, 30.1],
                );
                PharmacistService().assignDriver(req, mockDriver);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Order Accepted!")),
                );
              },
              child: const Text(
                "Accept Delivery",
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOfflineNotice() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40),
      alignment: Alignment.center,
      child: Column(
        children: [
          Icon(
            Icons.location_off_rounded,
            size: 64,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          const Text(
            "You are offline",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.black54,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Toggle your status to start receiving orders",
            style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyRequestsNotice() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40),
      alignment: Alignment.center,
      child: Column(
        children: [
          Icon(
            Icons.check_circle_outline,
            size: 64,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          const Text(
            "All caught up!",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.black54,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Waiting for new delivery requests...",
            style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
          ),
          const SizedBox(height: 24),
          const CircularProgressIndicator(strokeWidth: 2),
        ],
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// TAB 2: EARNINGS
// -----------------------------------------------------------------------------
class _EarningsTab extends StatelessWidget {
  final String riderId;
  final String riderName;

  const _EarningsTab({required this.riderId, required this.riderName});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        physics: const BouncingScrollPhysics(),
        children: [
          const Text(
            "Wallet & Earnings",
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 24),

          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.green.shade800, Colors.green.shade600],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.green.withValues(alpha: 0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Available Balance",
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
                const SizedBox(height: 8),
                const Text(
                  "18,500 RWF",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: Colors.green.shade800,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () {},
                        icon: const Icon(
                          Icons.account_balance_wallet,
                          size: 18,
                        ),
                        label: const Text("Withdraw"),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Recent Transactions",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.black87,
                ),
              ),
              TextButton(
                onPressed: () {},
                child: Text(
                  "See All",
                  style: TextStyle(color: Colors.green.shade700),
                ),
              ),
            ],
          ),

          _buildTransactionItem(
            "Delivery #RX-1002",
            "Today, 10:30 AM",
            1500,
            true,
          ),
          _buildTransactionItem(
            "Delivery #RX-1005",
            "Yesterday, 3:15 PM",
            2500,
            true,
          ),
          _buildTransactionItem(
            "Withdrawal to MoMo",
            "Mon, 1:00 PM",
            -14500,
            false,
          ),
          _buildTransactionItem(
            "Delivery #ORD-2001",
            "Mon, 12:30 PM",
            1500,
            true,
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionItem(
    String title,
    String subtitle,
    int amount,
    bool isCredit,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isCredit ? Colors.green.shade50 : Colors.red.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isCredit ? Icons.arrow_downward : Icons.arrow_upward,
              color: isCredit ? Colors.green : Colors.red,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                ),
              ],
            ),
          ),
          Text(
            "${isCredit ? '+' : ''}$amount RWF",
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: isCredit ? Colors.green.shade800 : Colors.red.shade800,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// TAB 3: HISTORY
// -----------------------------------------------------------------------------
class _HistoryTab extends StatelessWidget {
  final String riderId;
  final String riderName;

  const _HistoryTab({required this.riderId, required this.riderName});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListenableBuilder(
        listenable: PharmacistService(),
        builder: (context, _) {
          final allOrders = PharmacistService().orders;
          final pastTasks = allOrders
              .where(
                (o) =>
                    o.assignedDriverName == riderName &&
                    o.status == OrderStatus.delivered,
              )
              .toList();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 20, 20, 8),
                child: Text(
                  "Delivery History",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),
              if (pastTasks.isEmpty)
                Expanded(
                  child: Center(
                    child: Text(
                      "No completed deliveries yet.",
                      style: TextStyle(color: Colors.grey.shade500),
                    ),
                  ),
                )
              else
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(20),
                    physics: const BouncingScrollPhysics(),
                    itemCount: pastTasks.length,
                    itemBuilder: (context, index) {
                      final task = pastTasks[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.green.shade50,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                Icons.check_circle_rounded,
                                color: Colors.green.shade600,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "To: ${task.patientName}",
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "ID: #${task.id} • ${task.patientLocationName.split(',').first}",
                                    style: TextStyle(
                                      color: Colors.grey.shade500,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              "${task.deliveryFee.toInt()} RWF",
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.green.shade800,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// TAB 4: ACCOUNT
// -----------------------------------------------------------------------------
class _AccountTab extends StatelessWidget {
  final String riderName;

  const _AccountTab({required this.riderName});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        physics: const BouncingScrollPhysics(),
        children: [
          const Text(
            "Account Details",
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
                CircleAvatar(
                  radius: 45,
                  backgroundColor: Colors.green.shade100,
                  child: Text(
                    riderName[0],
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.green.shade800,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  riderName,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                Text(
                  "+250 788 123 456",
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          _buildSettingsTile(
            Icons.pedal_bike,
            "Vehicle Information",
            "Motorcycle - RAC 123 A",
          ),
          _buildSettingsTile(
            Icons.support_agent,
            "Help & Support",
            "Contact our dispatch team",
          ),
          _buildSettingsTile(
            Icons.description,
            "Legal Documents",
            "License & Registration",
          ),

          const SizedBox(height: 24),
          ListTile(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            tileColor: Colors.red.shade50,
            leading: Icon(Icons.logout, color: Colors.red.shade600),
            title: Text(
              "Log Out",
              style: TextStyle(
                color: Colors.red.shade600,
                fontWeight: FontWeight.bold,
              ),
            ),
            onTap: () {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (context) => const AuthScreen()),
                (route) => false,
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsTile(IconData icon, String title, String subtitle) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: Colors.green.shade700, size: 20),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
        ),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: () {},
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// MAP SCREEN (GREEN + WHITE THEME)
// -----------------------------------------------------------------------------
class TripMapScreen extends StatelessWidget {
  final PrescriptionOrder task;

  const TripMapScreen({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    bool isGoingToPharmacy = task.status == OrderStatus.driverAssigned;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Simulated Light Map background
          Positioned.fill(
            child: Opacity(
              opacity: 0.5,
              child: Image.network(
                "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=3000&auto=format&fit=crop",
                fit: BoxFit.cover,
                color: Colors.white, // Bleach it out slightly
                colorBlendMode: BlendMode.screen,
              ),
            ),
          ),

          // Route Polyline CustomPainter
          Positioned.fill(
            child: IgnorePointer(
              child: CustomPaint(painter: MockRoutePainter()),
            ),
          ),

          SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Clean White Search / Top Bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.1),
                                blurRadius: 10,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.arrow_back,
                            color: Colors.black87,
                            size: 20,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(30),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.1),
                                blurRadius: 10,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            isGoingToPharmacy
                                ? "Navigating to Pharmacy..."
                                : "Navigating to Patient...",
                            style: TextStyle(
                              color: Colors.green.shade800,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 10,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          CupertinoIcons.map_fill,
                          color: Colors.black87,
                          size: 20,
                        ),
                      ),
                    ],
                  ),
                ),

                // Bottom Tracking Card (White Theme)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(30),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 20,
                        offset: const Offset(0, -5),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Pull handle indicator
                      Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(height: 24),

                      Row(
                        children: [
                          CircleAvatar(
                            radius: 24,
                            backgroundColor: Colors.green.shade100,
                            child: Icon(
                              isGoingToPharmacy ? Icons.store : Icons.person,
                              color: Colors.green.shade800,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isGoingToPharmacy
                                      ? (task.assignedPharmacyName ??
                                            "Pharmacy")
                                      : task.patientName,
                                  style: const TextStyle(
                                    color: Colors.black87,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  isGoingToPharmacy
                                      ? "Order #${task.id}"
                                      : "${task.deliveryFee.toInt()} RWF (Cash collection)",
                                  style: TextStyle(
                                    color: Colors.grey.shade600,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.green.shade50,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              CupertinoIcons.phone_fill,
                              color: Colors.green.shade700,
                              size: 22,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      const Divider(height: 1),
                      const SizedBox(height: 16),

                      Row(
                        children: [
                          Icon(
                            Icons.location_on,
                            color: Colors.grey.shade400,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Destination",
                                  style: TextStyle(
                                    color: Colors.grey.shade500,
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  isGoingToPharmacy
                                      ? "Pharmacy Location"
                                      : task.patientLocationName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                "Est. time",
                                style: TextStyle(
                                  color: Colors.grey.shade500,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                "12 mins",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                  color: Colors.black87,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),

                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green.shade700,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 0,
                          ),
                          onPressed: () {
                            if (isGoingToPharmacy) {
                              PharmacistService().updateDriverOrderStatus(
                                task,
                                OrderStatus.outForDelivery,
                              );
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    "Picked up order! Proceeding to patient.",
                                  ),
                                ),
                              );
                            } else {
                              PharmacistService().updateDriverOrderStatus(
                                task,
                                OrderStatus.delivered,
                              );
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    "Delivery Successful! Great job.",
                                  ),
                                ),
                              );
                            }
                          },
                          child: Text(
                            isGoingToPharmacy
                                ? "Confirm Pickup"
                                : "Complete Delivery",
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
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

// Draw a route line (Green variant)
class MockRoutePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.green.shade600
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    final path = Path();
    path.moveTo(size.width * 0.3, size.height * 0.6);
    path.lineTo(size.width * 0.6, size.height * 0.45);
    path.lineTo(size.width * 0.55, size.height * 0.35);
    path.lineTo(size.width * 0.8, size.height * 0.2);

    // Setup shadow for the path
    canvas.drawShadow(path, Colors.green.shade800, 4.0, false);

    // Draw the green path
    canvas.drawPath(path, paint);

    // Draw origin dot (Driver)
    final originPaint = Paint()..color = Colors.black87;
    canvas.drawCircle(
      Offset(size.width * 0.3, size.height * 0.6),
      8,
      originPaint,
    );

    final innerOrigin = Paint()..color = Colors.white;
    canvas.drawCircle(
      Offset(size.width * 0.3, size.height * 0.6),
      4,
      innerOrigin,
    );

    // Draw destination dot (Pharmacy / House)
    final destPaint = Paint()..color = Colors.green.shade700;
    canvas.drawCircle(
      Offset(size.width * 0.8, size.height * 0.2),
      10,
      destPaint,
    );

    final innerDest = Paint()..color = Colors.white;
    canvas.drawCircle(
      Offset(size.width * 0.8, size.height * 0.2),
      4,
      innerDest,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
