import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // Import for SystemUiOverlayStyle
import 'dart:ui' as ui; // For PathMetrics in dashed line
import '../../models/models.dart';
import '../../services/pharmacist_service.dart';
import 'package:fl_chart/fl_chart.dart'; // Import for charts
import '../../data/dummy_data.dart'; // For inventory access
import 'inventory_edit_screen.dart';
import 'prescription_review_screen.dart';
import 'order_details_screen.dart'; // Import the new screen
import 'pharmacist_chat_screen.dart';
import 'revenue_details_screen.dart';
import 'daily_sales_screen.dart';
import 'pharmacist_notifications_screen.dart';
import '../auth_screen.dart';
import 'settings/profile_management_screen.dart';
import 'settings/system_audit_logs_screen.dart';
import 'settings/pharmacy_settings_screen.dart';
import 'settings/help_privacy_screen.dart';

class PharmacistDashboardScreen extends StatefulWidget {
  const PharmacistDashboardScreen({super.key});

  @override
  State<PharmacistDashboardScreen> createState() => _PharmacistDashboardScreenState();
}

class _PharmacistDashboardScreenState extends State<PharmacistDashboardScreen> {
  int _selectedIndex = 0;
  // Dashboard Status Filter Tabs
  int _ordersFilterIndex = 0; // 0=All, 1=Requests, 2=Processing...
  
  // Enhanced Search & Sort State
  String _searchQuery = "";
  String _sortBy = "Newest"; // Options: Newest, Oldest, Price: High-Low, Price: Low-High, Status
  
  final PharmacistService _service = PharmacistService();
  
  // Theme Colors - Green & White
  final Color _primaryGreen = const Color(0xFF2E7D32); // Darker standard green
  final Color _lightGreenErrors = const Color(0xFFE8F5E9);
  final Color _bgWhite = const Color(0xFFFAFAFA);
  
  // Local Inventory Management
  late List<Medicine> _inventoryList;
  final Set<String> _unpublishedIds = {};

  final List<String> _titles = ["Overview", "Requests", "Orders", "Inventory", "More"];

  @override
  void initState() {
    super.initState();
    _inventoryList = List.from(dummyMedicines);
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>( // Force status bar icons to be dark (visible on light bg)
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent, // Make status bar transparent
      ),
      child: AnimatedBuilder(
        animation: _service,
        builder: (context, _) {
          return Scaffold(
          backgroundColor: _bgWhite,
          body: SafeArea(
            child: Column(
              children: [
                // header
                _buildHeader(),
                
                // Content
                Expanded(
                  child: IndexedStack(
                    index: _selectedIndex,
                    children: [
                      _buildOverviewTab(),
                      _buildRequestsTab(),
                      _buildOrdersTab(),
                      _buildInventoryTab(),
                      _buildMoreTab(), // Index 4
                    ],
                  ),
                ),
              ],
            ),
          ),
          floatingActionButton: _selectedIndex == 3 
            ? FloatingActionButton.extended(
                backgroundColor: _primaryGreen,
                icon: const Icon(Icons.add, color: Colors.white),
                label: const Text("New Product", style: TextStyle(color: Colors.white)),
                onPressed: () async {
                    final result = await Navigator.push(context, MaterialPageRoute(builder: (c) => const InventoryEditScreen()));
                    if (result != null && result is Medicine) {
                       setState(() {
                         _inventoryList.insert(0, result);
                       });
                    }
                },
              )
            : null,
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _selectedIndex,
            onTap: (index) => setState(() => _selectedIndex = index),
            type: BottomNavigationBarType.fixed,
            backgroundColor: Colors.white,
            selectedItemColor: _primaryGreen,
            unselectedItemColor: Colors.grey.shade400,
            showSelectedLabels: true,
            showUnselectedLabels: true,
            selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            unselectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: "Overview"),
              BottomNavigationBarItem(icon: Icon(Icons.assignment_outlined), activeIcon: Icon(Icons.assignment), label: "Requests"),
              BottomNavigationBarItem(icon: Icon(Icons.shopping_bag_outlined), activeIcon: Icon(Icons.shopping_bag), label: "Orders"),
              BottomNavigationBarItem(icon: Icon(Icons.inventory_2_outlined), activeIcon: Icon(Icons.inventory_2), label: "Stock"),
              BottomNavigationBarItem(icon: Icon(Icons.more_horiz_outlined), activeIcon: Icon(Icons.more_horiz), label: "More"),
            ],
          ),
        ); // Close Scaffold
      },
    ),
    ); // Close AnimatedBuilder, then AnnotatedRegion
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
               Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Brand Header
                  Row(
                    children: [
                       Image.asset(
                         'assets/images/app_logo.png',
                         width: 28,
                         height: 28,
                         errorBuilder: (context, error, stackTrace) => Icon(Icons.local_pharmacy, color: _primaryGreen, size: 28),
                       ),
                       const SizedBox(width: 8),
                       Text(
                         "FARUMASI",
                         style: TextStyle(
                           fontSize: 22, 
                           fontWeight: FontWeight.bold,
                           color: _primaryGreen,
                           letterSpacing: 1.2,
                         ),
                       ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _titles[_selectedIndex],
                    style: TextStyle(
                      fontSize: 26, 
                      fontWeight: FontWeight.w900,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(color: Colors.grey.shade200, blurRadius: 10, offset: const Offset(0, 5))
                      ],
                      border: Border.all(color: _lightGreenErrors),
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.chat_bubble_outline, color: Color(0xFF2E7D32)),
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const PharmacistChatScreen()));
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(color: Colors.grey.shade200, blurRadius: 10, offset: const Offset(0, 5))
                      ],
                      border: Border.all(color: _lightGreenErrors),
                    ),
                    child: Stack(
                      children: [
                        IconButton(
                          icon: Icon(Icons.notifications_none_rounded, color: _primaryGreen),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const PharmacistNotificationsScreen()),
                            );
                          },
                        ),
                        Positioned(
                          right: 12,
                          top: 12,
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(minWidth: 8, minHeight: 8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              )
            ],
          ),
          const SizedBox(height: 8),
          /* Removed arbitrary pharmacy badge */
        ],
      ),
    );
  }

  // --- TAB 0: OVERVIEW ---
  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            height: 50,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(color: Colors.grey.shade100, blurRadius: 4, offset: const Offset(0, 2))
              ],
            ),
            child: Row(
              children: [
                 Icon(Icons.search, color: _primaryGreen),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    onChanged: (val) {
                      setState(() {
                        _searchQuery = val;
                      });
                    },
                    decoration: const InputDecoration(
                      hintText: "Search orders, medicines...",
                      border: InputBorder.none,
                      hintStyle: TextStyle(color: Colors.grey),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Overview Stats
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            childAspectRatio: 0.95, // Adjusted to fix 16px vertical overflow
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            children: [
              _buildStatCard(
                title: "Stock Items", 
                value: "${dummyMedicines.length}", 
                subtext: "Low Stock: 2",
                icon: Icons.medication_outlined,
                color: Colors.blue, 
                onTap: () {
                  setState(() => _selectedIndex = 3); // Go to Stock tab
                }
              ),
              _buildStatCard(
                title: "Active Orders", 
                value: "${_service.processingOrders.length}", 
                subtext: "Action Needed",
                icon: Icons.shopping_bag_outlined,
                color: Colors.orange,
                onTap: () {
                  setState(() {
                    _selectedIndex = 2; // Go to Orders tab
                    _ordersFilterIndex = 2; // Auto-filter to 'Processing'
                  });
                }
              ),
              _buildStatCard(
                title: "New Requests", 
                value: "${_service.incomingRequests.length}", 
                subtext: "+2 since 1h",
                icon: Icons.assignment_late_outlined,
                color: Colors.redAccent,
                onTap: () {
                  setState(() => _selectedIndex = 1); // Go to Requests tab
                }
              ),
              _buildStatCard(
                title: "Revenue (Today)", 
                value: "RWF ${_service.totalRevenue.toStringAsFixed(0)}", 
                subtext: "+12% vs yest.",
                icon: Icons.payments_outlined,
                color: _primaryGreen,
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const RevenueDetailsScreen()));
                }
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Chart Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Weekly Activity", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _lightGreenErrors,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text("This Week", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _primaryGreen)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildLegend(color: _primaryGreen, text: "Orders"),
              const SizedBox(width: 16),
              _buildLegend(color: Colors.blue, text: "Sessions"),
            ],
          ),
          const SizedBox(height: 16),
          _buildChart(),

          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Upcoming Sessions",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1B5E20),
                ),
              ),
              TextButton(
                onPressed: () {
                  _showAllSessions(context);
                },
                child: Text("See All", style: TextStyle(color: _primaryGreen)),
              )
            ],
          ),
          const SizedBox(height: 12),
          _buildUpcomingSessions(),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildUpcomingSessions() {
    final sessions = _service.upcomingSessions;

    if (sessions.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        alignment: Alignment.center,
        child: Column(
          children: [
            Icon(Icons.event_busy, size: 48, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text(
              "No upcoming sessions",
              style: TextStyle(color: Colors.grey.shade500),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: sessions.length,
      itemBuilder: (context, index) {
        final session = sessions[index];
        bool isToday = session.date.day == DateTime.now().day &&
            session.date.month == DateTime.now().month &&
            session.date.year == DateTime.now().year;

        return GestureDetector(
          onTap: () => _showSessionDetails(session),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.shade100,
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
              border: Border.all(color: Colors.grey.shade100),
            ),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: _lightGreenErrors,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      session.patientName.isNotEmpty ? session.patientName[0].toUpperCase() : '?',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: _primaryGreen,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session.patientName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "${session.type} • ${isToday ? 'Today' : 'Tomorrow'}", // Simplified date logic
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      session.time,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _primaryGreen,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: session.status == "Confirmed"
                            ? Colors.green.shade50
                            : Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        session.status,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: session.status == "Confirmed"
                              ? Colors.green
                              : Colors.orange,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildChart() {
    return Container(
      height: 220,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.grey.shade100, blurRadius: 10, offset: const Offset(0, 5))
        ],
      ),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: 20,
          barTouchData: BarTouchData(
            touchCallback: (FlTouchEvent event, barTouchResponse) {
              if (!event.isInterestedForInteractions ||
                  barTouchResponse == null ||
                  barTouchResponse.spot == null) {
                return;
              }
              if (event is FlTapUpEvent) {
                final int dayIndex = barTouchResponse.spot!.touchedBarGroupIndex;
                Navigator.push(context, MaterialPageRoute(builder: (_) => DailySalesScreen(dayIndex: dayIndex)));
              }
            },
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (group) => Colors.grey.shade800,
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                 final String title = rodIndex == 0 ? "Orders" : "Sessions";
                 return BarTooltipItem(
                   '$title: ${rod.toY.toInt()}',
                   const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                 );
              },
            ),
          ),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (double value, TitleMeta meta) {
                  const style = TextStyle(color: Colors.grey, fontWeight: FontWeight.bold, fontSize: 10);
                  String text = '';
                  switch (value.toInt()) {
                    case 0: text = 'M'; break;
                    case 1: text = 'T'; break;
                    case 2: text = 'W'; break;
                    case 3: text = 'T'; break;
                    case 4: text = 'F'; break;
                    case 5: text = 'S'; break;
                    case 6: text = 'S'; break;
                  }
                  return SideTitleWidget(meta: meta, child: Text(text, style: style));
                },
              ),
            ),
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          barGroups: [
            _makeBarGroup(0, 8, 4),
            _makeBarGroup(1, 10, 5),
            _makeBarGroup(2, 14, 8),
            _makeBarGroup(3, 15, 6),
            _makeBarGroup(4, 13, 10),
            _makeBarGroup(5, 18, 14), // Saturday peak
            _makeBarGroup(6, 12, 11),
          ],
        ),
      ),
    );
  }

  BarChartGroupData _makeBarGroup(int x, double orders, double sessions) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: orders,
          color: _primaryGreen,
          width: 8,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          backDrawRodData: BackgroundBarChartRodData(
            show: true,
            toY: 20,
            color: Colors.grey.shade100, 
          ),
        ),
        BarChartRodData(
          toY: sessions,
          color: Colors.blue,
          width: 8,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          backDrawRodData: BackgroundBarChartRodData(
            show: true,
            toY: 20,
            color: Colors.grey.shade100, 
          ),
        ),
      ],
    );
  }

  Widget _buildLegend({required Color color, required String text}) {
    return Row(
      children: [
        Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 8),
        Text(text, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
      ],
    );
  }

  Widget _buildStatCard({required String title, required String value, required String subtext, required IconData icon, required Color color, VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(color: Colors.grey.shade100, blurRadius: 10, offset: const Offset(0, 5))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(height: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87)),
                const SizedBox(height: 4),
                Text(title, style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(subtext, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.bold)),
              ],
            )
          ],
        ),
      ),
    );
  }

  // --- TAB 1: REQUESTS (Prescription Review) ---
  Widget _buildRequestsTab() {
    final list = _service.incomingRequests;
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in_outlined, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text("No Pending Requests", style: TextStyle(color: Colors.grey.shade500, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final order = list[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(color: Colors.grey.shade200, blurRadius: 8, offset: const Offset(0, 4))
            ],
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: _lightGreenErrors,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("New Prescription", style: TextStyle(color: _primaryGreen, fontWeight: FontWeight.bold)),
                    Text(order.date.toString().substring(0, 16), style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Prescription Image Thumbnail
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: 70, height: 70,
                        color: Colors.grey.shade200,
                        child: Icon(Icons.image, color: Colors.grey.shade400), 
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(order.patientName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          const SizedBox(height: 4),
                          Text("Ins: ${order.insuranceProvider ?? 'None'}", style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                          const SizedBox(height: 4),
                          Text("Loc: ${order.patientLocationName}", style: TextStyle(color: Colors.grey.shade600, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Row(
                  children: [
                    Expanded(
                       child: OutlinedButton(
                         onPressed: () {}, // Reject Logic
                         style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                         child: const Text("Reject"),
                       ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                       child: ElevatedButton(
                         onPressed: () => _handleAcceptRequest(order), 
                         style: ElevatedButton.styleFrom(
                           backgroundColor: _primaryGreen,
                           foregroundColor: Colors.white,
                           elevation: 0,
                         ),
                         child: const Text("Review & Price"),
                       ),
                    ),
                  ],
                ),
              )
            ],
          ),
        );
      },
    );
  }

  void _handleAcceptRequest(PrescriptionOrder order) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PrescriptionReviewScreen(order: order),
      ),
    ).then((_) => setState(() {}));
  }

  // --- TAB 2: ORDERS (Active Processing) ---
  Widget _buildOrdersTab() {
    // Start with master list
    List<PrescriptionOrder> list = List.from(_service.orders); 

    // 1. Filter by Status/Type (Tabs)
    if (_ordersFilterIndex == 1) { // Prescription Only
       list = list.where((o) => o.prescriptionImageUrl != null).toList();
    } else if (_ordersFilterIndex == 2) { // Direct/No Prescription
       list = list.where((o) => o.prescriptionImageUrl == null).toList();
    } else if (_ordersFilterIndex == 3) { // Rejected Only
       list = list.where((o) => o.status == OrderStatus.cancelled).toList();
    } else if (_ordersFilterIndex == 4) { // Completed Only
       list = list.where((o) => o.status == OrderStatus.delivered).toList();
    } else if (_ordersFilterIndex == 5) { // In Progress
       list = list.where((o) => 
         o.status != OrderStatus.delivered && 
         o.status != OrderStatus.cancelled &&
         o.status != OrderStatus.pendingReview
       ).toList();
    } else if (_ordersFilterIndex == 6) { // Shipping / Tracking
       list = list.where((o) => 
         o.status == OrderStatus.outForDelivery || 
         o.status == OrderStatus.driverAssigned
       ).toList();
    }
    
    // 2. Search Filter
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((o) {
        final matchesId = o.id.toLowerCase().contains(q);
        final matchesName = o.patientName.toLowerCase().contains(q);
        final matchesMed = o.items.any((i) => i.name.toLowerCase().contains(q));
        final matchesDriver = o.assignedDriverName?.toLowerCase().contains(q) ?? false;
        final matchesPharmacy = o.assignedPharmacyName?.toLowerCase().contains(q) ?? false;
        return matchesId || matchesName || matchesMed || matchesDriver || matchesPharmacy;
      }).toList();
    }

    // 3. Sorting
    switch (_sortBy) {
      case "Newest":
        list.sort((a, b) => b.date.compareTo(a.date));
        break;
      case "Oldest":
        list.sort((a, b) => a.date.compareTo(b.date));
        break;
      case "Price: High-Low":
        list.sort((a, b) => b.totalPrice.compareTo(a.totalPrice));
        break;
      case "Price: Low-High":
        list.sort((a, b) => a.totalPrice.compareTo(b.totalPrice));
        break;
      case "Status":
        list.sort((a, b) => a.status.index.compareTo(b.status.index));
        break;  
    }

    final totalValue = list.fold(0.0, (sum, o) => sum + o.totalPrice);

    return Column(
      children: [
        // Enhanced Search Bar
        Container(
          margin: const EdgeInsets.fromLTRB(24, 0, 24, 16),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          height: 50,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
            boxShadow: [
              BoxShadow(color: Colors.grey.shade100, blurRadius: 4, offset: const Offset(0, 2))
            ],
          ),
          child: Row(
            children: [
               Icon(Icons.search, color: _primaryGreen),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val;
                    });
                  },
                  decoration: const InputDecoration(
                    hintText: "Search ID, Name, Driver...",
                    border: InputBorder.none,
                    hintStyle: TextStyle(color: Colors.grey),
                  ),
                ),
              ),
              if (_searchQuery.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.clear, color: Colors.grey),
                  onPressed: () => setState(() => _searchQuery = ""),
                ),
            ],
          ),
        ),

        // Controls Row: Filters & Sort
        Container(
          height: 50,
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            children: [
              Expanded(
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _buildFilterChip("All", 0),
                    const SizedBox(width: 8),
                    _buildFilterChip("Shipping", 6),
                    const SizedBox(width: 8),
                    _buildFilterChip("In Progress", 5),
                    const SizedBox(width: 8),
                    _buildFilterChip("Completed", 4),
                    const SizedBox(width: 8),
                    _buildFilterChip("Rejected", 3),
                    const SizedBox(width: 8),
                    _buildFilterChip("Prescriptions", 1),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Sort Checkbox/Dropdown
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: PopupMenuButton<String>(
                  icon: Icon(Icons.sort, color: _primaryGreen),
                  tooltip: "Sort Orders",
                  onSelected: (val) => setState(() => _sortBy = val),
                  itemBuilder: (ctx) => [
                    "Newest", 
                    "Oldest", 
                    "Price: High-Low", 
                    "Price: Low-High",
                    "Status"
                  ].map((s) => PopupMenuItem(
                    value: s, 
                    child: Row(
                      children: [
                        if (_sortBy == s) Icon(Icons.check, size: 16, color: _primaryGreen),
                        if (_sortBy == s) const SizedBox(width: 8),
                        Text(s, style: TextStyle(
                          color: _sortBy == s ? _primaryGreen : Colors.black,
                          fontWeight: _sortBy == s ? FontWeight.bold : FontWeight.normal
                        )),
                      ],
                    )
                  )).toList(),
                ),
              ),
            ],
          ),
        ),
        
        // Summary Bar
        if (list.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("${list.length} Orders Found", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                Text("Total: RWF ${totalValue.toStringAsFixed(0)}", style: TextStyle(fontWeight: FontWeight.bold, color: _primaryGreen)),
              ],
            ),
          ),

        Expanded(
          child: list.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.search_off, size: 80, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text("No Orders Found matching your filters.", style: TextStyle(color: Colors.grey.shade500)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(24),
              itemCount: list.length,
              itemBuilder: (context, index) {
                final order = list[index];
                bool isPaymentPending = order.status == OrderStatus.paymentPending;
                bool isShipping = order.status == OrderStatus.outForDelivery || order.status == OrderStatus.driverAssigned;
                bool isPrescription = order.prescriptionImageUrl != null;
                bool isRejected = order.status == OrderStatus.cancelled;
                bool isDelivered = order.status == OrderStatus.delivered;

                Color statusColor;
                Color statusBgColor;
                String statusText;

                if (isRejected) {
                  statusColor = Colors.red;
                  statusBgColor = Colors.red.shade50;
                  statusText = "Rejected";
                } else if (isDelivered) {
                  statusColor = Colors.green;
                  statusBgColor = Colors.green.shade50;
                  statusText = "Completed";
                } else if (isPaymentPending) {
                  statusColor = Colors.orange;
                  statusBgColor = Colors.orange.shade50;
                  statusText = "Awaiting Payment";
                } else if (isShipping) {
                  statusColor = Colors.blueAccent;
                  statusBgColor = Colors.blue.shade50;
                  statusText = order.status == OrderStatus.outForDelivery ? "Out For Delivery" : "Driver Assigned";
                } else if (order.status == OrderStatus.findingPharmacy) {
                   statusColor = Colors.purple;
                   statusBgColor = Colors.purple.shade50;
                   statusText = "Broadcasting";
                } else {
                  statusColor = Colors.blue;
                  statusBgColor = Colors.blue.shade50;
                  statusText = "Processing";
                }

                return GestureDetector(
                  onTap: () {
                     // If still pending review, go to Review Screen
                     if (order.status == OrderStatus.pendingReview) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PrescriptionReviewScreen(order: order),
                          ),
                        ).then((_) => setState(() {}));
                     } else {
                        // Otherwise go to Read-Only Details / Audit Log
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => OrderDetailsScreen(order: order),
                          ),
                        );
                     }
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade100),
                      boxShadow: [
                        BoxShadow(color: Colors.grey.shade200, blurRadius: 6, offset: const Offset(0, 3))
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Text("Ord #${order.id.split('-').last}", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: _primaryGreen)),
                                const SizedBox(width: 8),
                                if (isPrescription) 
                                  const Icon(Icons.description, size: 16, color: Colors.blue)
                                else
                                  const Icon(Icons.shopping_cart, size: 16, color: Colors.orange),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: statusBgColor,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: statusColor.withOpacity(0.3)),
                              ),
                              child: Text(
                                statusText,
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                              ),
                            )
                          ],
                        ),
                        const Divider(height: 24),
                        Row(
                          children: [
                            Icon(Icons.person, size: 16, color: Colors.grey.shade400),
                            const SizedBox(width: 8),
                            Text(order.patientName, style: const TextStyle(fontWeight: FontWeight.w500)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.medication, size: 16, color: Colors.grey.shade400),
                            const SizedBox(width: 8),
                            Text("${order.items.length} Medicines", style: const TextStyle(color: Colors.black54)),
                            const Spacer(),
                            Text(
                              "RWF ${order.pharmacyPrice.toInt()}", 
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        
                        // Action Buttons
                        if (isPaymentPending)
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _primaryGreen,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: () {
                                   _service.markAsPaid(order);
                                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Payment Confirmed! Order Ready.")));
                              },
                              icon: const Icon(Icons.check_circle_outline, size: 18),
                              label: const Text("Confirm Payment Received"),
                            ),
                          )
                        else if (isShipping)
                           SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blueAccent,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: () {
                                 // Show Tracking Dialog/BottomSheet
                                 _showTrackingDialog(context, order);
                              },
                              icon: const Icon(Icons.location_on, size: 18),
                              label: const Text("Track Order"),
                            ),
                          )
                        else 
                          SizedBox(
                             width: double.infinity,
                             child: OutlinedButton(
                               onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => PrescriptionReviewScreen(order: order),
                                    ),
                                  ).then((_) => setState(() {}));
                               }, 
                               child: const Text("View Details")
                             )
                          )
                      ],
                    ),
                  ),
                );
              },
            ),
        ),
      ],
    );
  }

  void _showTrackingDialog(BuildContext context, PrescriptionOrder order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
         initialChildSize: 0.90,
         minChildSize: 0.60,
         maxChildSize: 0.95,
         builder: (context, scrollController) => Container(
           decoration: const BoxDecoration(
             color: Colors.white,
             borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
           ),
           child: Column(
             children: [
               // Header Handle
               Center(
                 child: Container(
                   width: 40, height: 4, 
                   margin: const EdgeInsets.symmetric(vertical: 12),
                   decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                 ),
               ),
               Expanded(
                 child: ListView(
                   controller: scrollController,
                   padding: const EdgeInsets.all(24),
                   children: [
                     // --- 1. LIVE TRACKING MAP ---
                     Row(
                       mainAxisAlignment: MainAxisAlignment.spaceBetween,
                       children: [
                         const Text("Live Location", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                         Container(
                           padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                           decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
                           child: Row(
                             mainAxisSize: MainAxisSize.min,
                             children: [
                               Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle)),
                               const SizedBox(width: 6),
                               const Text("LIVE", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 10)),
                             ]
                           ),
                         )
                       ],
                     ),
                     const SizedBox(height: 16),
                     Container(
                       height: 200,
                       width: double.infinity,
                       decoration: BoxDecoration(
                         color: const Color(0xFFE8F5E9), // Light map aesthetic
                         borderRadius: BorderRadius.circular(16),
                         border: Border.all(color: Colors.green.shade200, width: 2),
                         // Giving it a grid-like texture to simulate a map background
                         gradient: LinearGradient(
                           colors: [Colors.green.shade50, Colors.blue.shade50],
                           begin: Alignment.topLeft,
                           end: Alignment.bottomRight,
                         )
                       ),
                       child: Stack(
                         children: [
                           // Add some "roads" lines
                           Positioned(top: 40, left: 40, right: 40, child: Container(height: 4, color: Colors.white)),
                           Positioned(top: 40, bottom: 40, right: 40, child: Container(width: 4, color: Colors.white)),
                           
                           // Path between Pharmacy and Patient
                           Positioned(
                             top: 40, left: 40, right: 40, bottom: 40,
                             child: CustomPaint(
                               painter: _DashedLinePainter(),
                             )
                           ),

                           // Pharmacy Pin
                           Positioned(
                             top: 10, left: 20,
                             child: _buildMapPin(Icons.local_pharmacy, "Pharmacy", Colors.purple),
                           ),
                           // Patient Pin
                           Positioned(
                             bottom: 10, right: 20,
                             child: _buildMapPin(Icons.home, "Patient", Colors.green),
                           ),
                           // Driver Pin (Simulated midway)
                           Positioned(
                             top: 20, right: 80,
                             child: _buildMapPin(Icons.motorcycle, "Driver", Colors.blue),
                           ),
                         ],
                       ),
                     ),
                     const SizedBox(height: 24),
                     
                     // --- 2. DRIVER INFO ---
                     Container(
                       padding: const EdgeInsets.all(16),
                       decoration: BoxDecoration(
                         color: Colors.white,
                         borderRadius: BorderRadius.circular(16),
                         border: Border.all(color: Colors.grey.shade200),
                         boxShadow: [BoxShadow(color: Colors.grey.shade100, blurRadius: 4, offset: const Offset(0, 2))],
                       ),
                       child: Row(
                         children: [
                           CircleAvatar(
                             backgroundColor: Colors.blue.shade100,
                             radius: 24,
                             child: const Icon(Icons.delivery_dining, color: Colors.blueAccent),
                           ),
                           const SizedBox(width: 16),
                           Expanded(
                             child: Column(
                               crossAxisAlignment: CrossAxisAlignment.start,
                               children: [
                                 Text(order.assignedDriverName ?? "Unknown Driver", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                 Text("License: KGL-884R • ETA: 5 mins", style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                               ],
                             ),
                           ),
                           Container(
                             padding: const EdgeInsets.all(8),
                             decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                             child: const Icon(Icons.phone, color: Colors.green),
                           )
                         ],
                       ),
                     ),
                     const SizedBox(height: 24),

                     // --- 3. UNIFIED ACCOUNTABILITY & TRACKING TIMELINE ---
                     const Text("Order Tracking & Audit Log", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                     const SizedBox(height: 8),
                     const Text("Tap any stage to view complete compliance and custody details.", style: TextStyle(color: Colors.grey, fontSize: 12)),
                     const SizedBox(height: 16),
                     
                     _buildInteractiveTrackingStep(
                       context,
                       title: "Prescription Reviewed",
                       subtitle: "Verified & Approved for Dispensing",
                       isActive: order.status.index >= OrderStatus.findingPharmacy.index,
                       hasNext: true,
                       details: {
                         "Action": "Clinical Review & Pricing",
                         "Pharmacist": order.reviewedBy ?? "System Auto-Verified",
                         "License No.": "PH-49201-RW",
                         "Timestamp": order.reviewedAt?.toString() ?? order.date.toString(),
                         "Notes": "Dosage limits verified against patient history.",
                       }
                     ),
                     _buildInteractiveTrackingStep(
                       context,
                       title: "Pharmacy Dispensed",
                       subtitle: order.assignedPharmacyName ?? "Awaiting Pharmacy Acceptance",
                       isActive: order.status.index >= OrderStatus.readyForPickup.index,
                       hasNext: true,
                       details: {
                         "Action": "Packaging & Verification",
                         "Facility": order.assignedPharmacyName ?? "Pending",
                         "Facility ID": order.assignedPharmacyId ?? "Pending",
                         "Timestamp": order.acceptedAt?.toString() ?? "Pending",
                         "Status": "Sealed in tamper-evident packaging.",
                       }
                     ),
                     _buildInteractiveTrackingStep(
                       context,
                       title: "Driver Picked Up",
                       subtitle: order.assignedDriverName ?? "Finding Driver",
                       isActive: order.status.index >= OrderStatus.outForDelivery.index,
                       hasNext: true,
                       details: {
                         "Action": "Custody Handoff",
                         "Courier Name": order.assignedDriverName ?? "Pending",
                         "Courier ID": order.assignedDriverId ?? "Pending",
                         "Timestamp": order.shippedAt?.toString() ?? "Pending",
                         "Verification": "Match order ID & QR Code scanned.",
                       }
                     ),
                     _buildInteractiveTrackingStep(
                       context,
                       title: "On The Way",
                       subtitle: "Heading to: ${order.patientLocationName}",
                       isActive: order.status.index >= OrderStatus.outForDelivery.index,
                       hasNext: true,
                       details: {
                         "Action": "Transit",
                         "Destination": order.patientLocationName,
                         "Coordinates": "${order.patientCoordinates[0]}, ${order.patientCoordinates[1]}",
                         "ETA": "15-25 minutes",
                       }
                     ),
                     _buildInteractiveTrackingStep(
                       context,
                       title: "Delivered",
                       subtitle: order.status == OrderStatus.delivered ? "Handed over successfully" : "Pending Delivery",
                       isActive: order.status == OrderStatus.delivered,
                       hasNext: false,
                       details: {
                         "Action": "Final Drop-off",
                         "Recipient": order.patientName,
                         "Timestamp": order.completedAt?.toString() ?? "Pending",
                         "Sign-off": "OTP Verification Required",
                       }
                     ),
                   ],
                 ),
               )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInteractiveTrackingStep(BuildContext context, {
    required String title,
    required String subtitle,
    required bool isActive,
    required bool hasNext,
    required Map<String, String> details,
  }) {
      return IntrinsicHeight(
        child: Row(
          children: [
            Column(
              children: [
                Container(
                  width: 20, height: 20,
                  decoration: BoxDecoration(
                    color: isActive ? _primaryGreen : Colors.grey.shade300,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: [
                      if(isActive) BoxShadow(color: _primaryGreen.withValues(alpha: 0.3), blurRadius: 4)
                    ]
                  ),
                  child: isActive ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
                ),
                if (hasNext) Expanded(child: Container(width: 2, color: isActive ? _primaryGreen : Colors.grey.shade300)),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                       _showDetailDialog(context, title, details);
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isActive ? _primaryGreen.withValues(alpha: 0.05) : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: isActive ? _primaryGreen.withValues(alpha: 0.2) : Colors.transparent)
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                               crossAxisAlignment: CrossAxisAlignment.start,
                               children: [
                                 Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: isActive ? Colors.black87 : Colors.grey.shade600)),
                                 const SizedBox(height: 4),
                                 Text(subtitle, style: TextStyle(fontSize: 12, color: isActive ? Colors.grey.shade800 : Colors.grey.shade500))
                               ],
                            ),
                          ),
                          Icon(Icons.info_outline, size: 18, color: isActive ? _primaryGreen : Colors.grey.shade400)
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            )
          ],
        ),
      );
  }

  void _showDetailDialog(BuildContext context, String title, Map<String, String> details) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.security, color: _primaryGreen, size: 20),
            const SizedBox(width: 8),
            Expanded(child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: details.entries.map((e) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 90, 
                  child: Text(e.key, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade600))
                ),
                Expanded(
                  child: Text(e.value, style: const TextStyle(fontSize: 13, color: Colors.black87))
                ),
              ],
            ),
          )).toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context), 
            child: Text("Close", style: TextStyle(color: _primaryGreen))
          )
        ],
      )
    );
  }

  Widget _buildMapPin(IconData icon, String label, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2))]
          ),
          child: Icon(icon, color: Colors.white, size: 16),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.9), borderRadius: BorderRadius.circular(4)),
          child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
        )
      ],
    );
  }

  Widget _buildFilterChip(String label, int index) {
    bool isSelected = _ordersFilterIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _ordersFilterIndex = index),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? _primaryGreen : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? _primaryGreen : Colors.grey.shade300),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey.shade700,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  // --- TAB 3: INVENTORY ---
  Widget _buildInventoryTab() {
     return Column(
       children: [
         // Filter Header
         Container(
           padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
           color: Colors.white,
           child: Row(
             children: [
               Expanded(
                 child: Container(
                   height: 40,
                   decoration: BoxDecoration(
                     color: Colors.grey.shade100,
                     borderRadius: BorderRadius.circular(10),
                   ),
                   child: const TextField(
                     decoration: InputDecoration(
                        prefixIcon: Icon(Icons.search, size: 20),
                        hintText: "Search stock...",
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.only(top: 8)
                     ),
                   ),
                 ),
               ),
               const SizedBox(width: 12),
               Container(
                 padding: const EdgeInsets.all(10),
                 decoration: BoxDecoration(
                   color: _primaryGreen.withOpacity(0.1),
                   borderRadius: BorderRadius.circular(10),
                 ),
                 child: Icon(Icons.filter_list, color: _primaryGreen),
               )
             ],
           ),
         ),
         Expanded(
           child: _inventoryList.isEmpty 
             ? Center(child: Text("No items found", style: TextStyle(color: Colors.grey.shade500)))
             : ListView.separated(
             padding: const EdgeInsets.all(24),
             itemCount: _inventoryList.length,
             separatorBuilder: (c, i) => const Divider(height: 1),
             itemBuilder: (context, index) {
               final med = _inventoryList[index];
               final bool isPublished = !_unpublishedIds.contains(med.id);
               final bool isLowStock = index % 3 == 0; // Fake logic
               
               return Padding(
                 padding: const EdgeInsets.symmetric(vertical: 4),
                 child: Opacity(
                   opacity: isPublished ? 1.0 : 0.5,
                   child: Row(
                   children: [
                     Expanded(
                       child: InkWell(
                         onTap: () async {
                            final result = await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => InventoryEditScreen(medicine: med),
                              ),
                            );
                            if (result != null && result is Medicine) {
                                setState(() {
                                  final index = _inventoryList.indexWhere((m) => m.id == result.id);
                                  if (index != -1) {
                                    _inventoryList[index] = result;
                                  }
                                });
                            }
                         },
                         child: Padding(
                           padding: const EdgeInsets.symmetric(vertical: 8),
                           child: Row(
                             children: [
                               Container(
                                 width: 50, height: 50,
                                 decoration: BoxDecoration(
                                   borderRadius: BorderRadius.circular(8),
                                   color: Colors.grey.shade100,
                                   image: DecorationImage(
                                     image: NetworkImage(med.imageUrl), fit: BoxFit.cover,
                                     colorFilter: !isPublished ? const ColorFilter.mode(Colors.grey, BlendMode.saturation) : null,
                                   )
                                 ),
                               ),
                               const SizedBox(width: 16),
                               Expanded(
                                 child: Column(
                                   crossAxisAlignment: CrossAxisAlignment.start,
                                   children: [
                                     Text(med.name, style: TextStyle(fontWeight: FontWeight.bold, decoration: !isPublished ? TextDecoration.lineThrough : null)),
                                     Text(med.manufacturer, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                     if (!isPublished)
                                       Container(
                                         margin: const EdgeInsets.only(top: 4),
                                         padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                         decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(4)),
                                         child: const Text("UNPUBLISHED", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54)),
                                       )
                                   ],
                                 ),
                               ),
                               Column(
                                 crossAxisAlignment: CrossAxisAlignment.end,
                                 children: [
                                   Text("RWF ${med.price.toInt()}", style: const TextStyle(fontWeight: FontWeight.bold)),
                                   const SizedBox(height: 4),
                                   Container(
                                     padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                     decoration: BoxDecoration(
                                       color: isLowStock ? Colors.orange.withOpacity(0.1) : Colors.green.withOpacity(0.1),
                                       borderRadius: BorderRadius.circular(4)
                                     ),
                                     child: Text(
                                       isLowStock ? "Low Stock" : "In Stock", 
                                       style: TextStyle(
                                         fontSize: 10, 
                                         color: isLowStock ? Colors.orange : Colors.green,
                                         fontWeight: FontWeight.bold
                                       )
                                     ),
                                   )
                                 ],
                               ),
                             ],
                           ),
                         ),
                       ),
                     ),
                     const SizedBox(width: 4),
                     PopupMenuButton<String>(
                        icon: Icon(Icons.more_vert, size: 22, color: Colors.grey.shade500),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        onSelected: (value) async {
                          if (value == 'edit') {
                             final result = await Navigator.push(
                               context,
                               MaterialPageRoute(
                                 builder: (_) => InventoryEditScreen(medicine: med),
                               ),
                             );
                             if (result != null && result is Medicine) {
                               setState(() {
                                 final index = _inventoryList.indexWhere((m) => m.id == result.id);
                                 if (index != -1) {
                                   _inventoryList[index] = result;
                                 }
                               });
                             }
                          } else if (value == 'delete') {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text("Delete Product"),
                                content: Text("Are you sure you want to delete '${med.name}'?"),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel", style: TextStyle(color: Colors.grey))),
                                  TextButton(
                                    onPressed: () { 
                                      setState(() {
                                        _inventoryList.removeAt(index);
                                      });
                                      Navigator.pop(ctx);
                                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("${med.name} deleted"), backgroundColor: Colors.red));
                                    }, 
                                    child: const Text("Delete", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))
                                  ),
                                ],
                              ),
                            );
                          } else if (value == 'publish') {
                            setState(() {
                              if (isPublished) {
                                _unpublishedIds.add(med.id);
                              } else {
                                _unpublishedIds.remove(med.id);
                              }
                            });
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(isPublished ? "${med.name} unpublished" : "${med.name} published"), 
                                backgroundColor: isPublished ? Colors.grey : _primaryGreen,
                                duration: const Duration(milliseconds: 1500),
                              )
                            );
                          }
                        },
                        itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                          const PopupMenuItem<String>(
                            value: 'edit',
                            child: Row(children: [Icon(Icons.edit, size: 18), SizedBox(width: 8), Text('Edit')]),
                          ),
                          PopupMenuItem<String>(
                            value: 'publish',
                            child: Row(children: [
                              Icon(isPublished ? Icons.visibility_off : Icons.visibility, size: 18), 
                              const SizedBox(width: 8), 
                              Text(isPublished ? 'Unpublish' : 'Publish')
                            ]),
                          ),
                          const PopupMenuDivider(),
                          const PopupMenuItem<String>(
                            value: 'delete',
                            child: Row(children: [Icon(Icons.delete_outline, size: 18, color: Colors.red), SizedBox(width: 8), Text('Delete', style: TextStyle(color: Colors.red))]),
                          ),
                        ],
                       ),
                   ],
                 ),
                 ),
               );
             },
           ),
         ),
       ],
     );
  }

  void _showAllSessions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          builder: (_, controller) {
            final allSessions = _service.upcomingSessions;
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                  Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
                  const SizedBox(height: 16),
                  const Text("All Booked Sessions", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  Expanded(
                    child: ListView.separated(
                      controller: controller,
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      itemCount: allSessions.length,
                      separatorBuilder: (context, index) => const Divider(),
                      itemBuilder: (context, index) {
                        final session = allSessions[index];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                            backgroundColor: _lightGreenErrors,
                            child: Text(session.patientName[0], style: TextStyle(color: _primaryGreen)),
                          ),
                          title: Text(session.patientName, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text("${session.type}\n${session.date.toString().split(' ')[0]} at ${session.time}\nRe: ${session.notes}", maxLines: 2, overflow: TextOverflow.ellipsis),
                          isThreeLine: true,
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(session.status, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: session.status == 'Confirmed' ? Colors.green : Colors.orange)),
                              const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
                            ],
                          ),
                          onTap: () {
                            Navigator.pop(context); // Close sheet
                            _showSessionDetails(session);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showSessionDetails(PharmacistBooking session) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Session Details"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _detailRow("Patient:", session.patientName),
            _detailRow("Type:", session.type),
            _detailRow("Time:", "${session.time} (${session.date.toString().split(' ')[0]})"),
            _detailRow("Status:", session.status),
            _detailRow("Notes:", session.notes),
            const SizedBox(height: 20),
            if (session.status == "Pending")
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    _service.updateBookingStatus(session.id, "Confirmed");
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Session confirmed!")));
                  },
                  icon: const Icon(Icons.check),
                  label: const Text("Confirm Session"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primaryGreen,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
             if (session.status == "Confirmed")
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    _service.updateBookingStatus(session.id, "Completed");
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Session completed!")));
                  },
                  icon: const Icon(Icons.done_all),
                  label: const Text("Mark as Completed"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                    _service.updateBookingStatus(session.id, "Cancelled");
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Session cancelled.")));
                },
                child: const Text("Cancel Session", style: TextStyle(color: Colors.red)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Close")),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 80, child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  // --- TAB 4: MORE (Profile, Logs, Settings) ---
  Widget _buildMoreTab() {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        // Profile Header
        Row(
          children: [
            CircleAvatar(
              radius: 30, 
              backgroundColor: _primaryGreen.withValues(alpha: 0.1), 
              child: Icon(Icons.person, color: _primaryGreen, size: 30)
            ),
            const SizedBox(width: 16),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Dr. John Doe", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  Text("License: PH-49201-RW", style: TextStyle(color: Colors.grey)),
                  // Removed arbitrary pharmacy assignment string
                ]
              )
            )
          ]
        ),
        const SizedBox(height: 32),

        // Menu Sections
        const Text("Management", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey)),
        const SizedBox(height: 8),
        _buildMoreMenuItem(Icons.person_outline, "Profile Management", "Update your personal and professional details", onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileManagementScreen()));
        }),
        _buildMoreMenuItem(Icons.history_edu, "System Audit Logs", "View detailed chain of custody and system records", onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const SystemAuditLogsScreen()));
        }),
        _buildMoreMenuItem(Icons.settings_outlined, "Pharmacy Settings", "Manage operating hours, notifications, and preferences", onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const PharmacySettingsScreen()));
        }),
        
        const SizedBox(height: 24),
        const Text("Support & Security", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey)),
        const SizedBox(height: 8),
        _buildMoreMenuItem(Icons.help_outline, "Help & Support", "Contact system administrator", onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpCenterScreen()));
        }),
        _buildMoreMenuItem(Icons.privacy_tip_outlined, "Privacy & Terms", "Read the compliance & terms of service", onTap: () {
           Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen()));
        }),
        _buildMoreMenuItem(Icons.logout, "Logout", "Sign out of your account", isDestructive: true, onTap: () {
          // Handle Logout
          showDialog(
             context: context,
             builder: (ctx) => AlertDialog(
               title: const Text("Logout"),
               content: const Text("Are you sure you want to sign out?"),
               actions: [
                 TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
                 TextButton(
                   onPressed: () {
                     // Pop dialog
                     Navigator.pop(ctx);
                     // Replace with AuthScreen
                     Navigator.of(context).pushReplacement(
                       MaterialPageRoute(builder: (_) => const AuthScreen())
                     );
                   }, 
                   child: const Text("Logout", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))
                 ),
               ],
             )
          );
        }),
      ]
    );
  }

  Widget _buildMoreMenuItem(IconData icon, String title, String subtitle, {bool isDestructive = false, VoidCallback? onTap}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDestructive ? Colors.red.shade100 : Colors.grey.shade200),
        boxShadow: [BoxShadow(color: Colors.grey.shade50, blurRadius: 4, offset: const Offset(0, 2))],
      ),
      child: ListTile(
        onTap: onTap ?? () {
           // Placeholder for navigation
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$title Screen Comming Soon")));
        },
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isDestructive ? Colors.red.shade50 : _primaryGreen.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8)
          ),
          child: Icon(icon, color: isDestructive ? Colors.red : _primaryGreen),
        ),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: isDestructive ? Colors.red : Colors.black87)),
        subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        trailing: Icon(Icons.chevron_right, color: Colors.grey.shade400),
      ),
    );
  }
}

// Custom Painter for dashed lines on the simulated map
class _DashedLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    var paint = Paint()
      ..color = Colors.blue.withValues(alpha: 0.5)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    var path = Path();
    path.moveTo(0, 0);                 // Start top left
    path.quadraticBezierTo(size.width * 0.5, size.height * 0.2, size.width, size.height); // Curve down to bottom right

    double dashWidth = 8.0, dashSpace = 6.0, distance = 0.0;
    
    // Simplistic dash implementation using PathMetrics
    for (ui.PathMetric pathMetric in path.computeMetrics()) {
      while (distance < pathMetric.length) {
        canvas.drawPath(
          pathMetric.extractPath(distance, distance + dashWidth),
          paint,
        );
        distance += dashWidth + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
