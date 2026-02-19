import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // Import for SystemUiOverlayStyle
import '../../models/models.dart';
import '../../services/pharmacist_service.dart';
import 'package:fl_chart/fl_chart.dart'; // Import for charts
import '../../data/dummy_data.dart'; // For inventory access
import 'inventory_edit_screen.dart';
import 'prescription_review_screen.dart';
import 'pharmacist_chat_screen.dart';

class PharmacistDashboardScreen extends StatefulWidget {
  const PharmacistDashboardScreen({super.key});

  @override
  State<PharmacistDashboardScreen> createState() => _PharmacistDashboardScreenState();
}

class _PharmacistDashboardScreenState extends State<PharmacistDashboardScreen> {
  int _selectedIndex = 0;
  int _ordersFilterIndex = 0; // 0: All, 1: Prescription, 2: Direct
  final PharmacistService _service = PharmacistService();
  
  // Theme Colors - Green & White
  final Color _primaryGreen = const Color(0xFF2E7D32); // Darker standard green
  final Color _lightGreenErrors = const Color(0xFFE8F5E9);
  final Color _bgWhite = const Color(0xFFFAFAFA);

  final List<String> _titles = ["Overview", "Requests", "Orders", "Inventory", "Profile"];

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
                      const Center(child: Text("Profile Settings")), // Index 4
                    ],
                  ),
                ),
              ],
            ),
          ),
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
              BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: "Account"),
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
                       Icon(Icons.local_pharmacy, color: _primaryGreen, size: 24),
                       const SizedBox(width: 8),
                       Text(
                         "Farumasi",
                         style: TextStyle(
                           fontSize: 22, 
                           fontWeight: FontWeight.bold,
                           color: _primaryGreen,
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
                    child: IconButton(
                      icon: Icon(Icons.notifications_none_rounded, color: _primaryGreen),
                      onPressed: () {},
                    ),
                  ),
                ],
              )
            ],
          ),
          const SizedBox(height: 8),
          Container(
             padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
             decoration: BoxDecoration(
               color: _lightGreenErrors,
               borderRadius: BorderRadius.circular(20),
             ),
             child: Row(
               mainAxisSize: MainAxisSize.min,
               children: [
                 const Icon(Icons.storefront, size: 14, color: Colors.green),
                 const SizedBox(width: 6),
                 Text(
                   "GreenCross Pharmacy", 
                   style: TextStyle(
                     fontSize: 12, 
                     color: _primaryGreen,
                     fontWeight: FontWeight.bold
                   ),
                 ),
               ],
             ),
          ),
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
                const Expanded(
                  child: TextField(
                    decoration: InputDecoration(
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
            childAspectRatio: 1.1, // Adjusted to prevent overflow on smaller screens
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            children: [
              _buildStatCard(
                title: "Stock Items", 
                value: "${dummyMedicines.length}", 
                subtext: "Low Stock: 2",
                icon: Icons.medication_outlined,
                color: Colors.blue, 
              ),
              _buildStatCard(
                title: "Active Orders", 
                value: "${_service.processingOrders.length}", 
                subtext: "Action Needed",
                icon: Icons.shopping_bag_outlined,
                color: Colors.orange,
              ),
              _buildStatCard(
                title: "New Requests", 
                value: "${_service.incomingRequests.length}", 
                subtext: "+2 since 1h",
                icon: Icons.assignment_late_outlined,
                color: Colors.redAccent,
              ),
              _buildStatCard(
                title: "Revenue (Today)", 
                value: "RWF 45k", 
                subtext: "+12% vs yest.",
                icon: Icons.payments_outlined,
                color: _primaryGreen,
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Chart Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Weekly Sales", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20))),
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
          _buildChart(),
          const SizedBox(height: 80),
        ],
      ),
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
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (_) => _primaryGreen,
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                 return BarTooltipItem(
                   '${rod.toY.toInt()}',
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
            _makeBarGroup(0, 8),
            _makeBarGroup(1, 10),
            _makeBarGroup(2, 14),
            _makeBarGroup(3, 15),
            _makeBarGroup(4, 13),
            _makeBarGroup(5, 18), // Saturday peak
            _makeBarGroup(6, 12),
          ],
        ),
      ),
    );
  }

  BarChartGroupData _makeBarGroup(int x, double y) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: y,
          color: _primaryGreen,
          width: 12,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
          backDrawRodData: BackgroundBarChartRodData(
            show: true,
            toY: 20,
            color: _lightGreenErrors, 
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({required String title, required String value, required String subtext, required IconData icon, required Color color}) {
    return Container(
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
              color: color.withOpacity(0.1),
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
    List<PrescriptionOrder> list = _service.processingOrders;

    // Filter Logic
    if (_ordersFilterIndex == 1) { // Prescription Only
       list = list.where((o) => o.prescriptionImageUrl != null).toList();
    } else if (_ordersFilterIndex == 2) { // Direct/No Prescription
       list = list.where((o) => o.prescriptionImageUrl == null).toList();
    }
    
    return Column(
      children: [
        // Filter Tabs
        Container(
          height: 60,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _buildFilterChip("All Orders", 0),
              const SizedBox(width: 8),
              _buildFilterChip("Prescriptions", 1),
              const SizedBox(width: 8),
              _buildFilterChip("Direct Orders", 2),
            ],
          ),
        ),

        Expanded(
          child: list.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shopping_bag_outlined, size: 80, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text("No Active Orders", style: TextStyle(color: Colors.grey.shade500)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(24),
              itemCount: list.length,
              itemBuilder: (context, index) {
                final order = list[index];
                bool isPaymentPending = order.status == OrderStatus.paymentPending;
                bool isPrescription = order.prescriptionImageUrl != null;

                return Container(
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
                                Icon(Icons.description, size: 16, color: Colors.blue)
                              else
                                Icon(Icons.shopping_cart, size: 16, color: Colors.orange),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isPaymentPending ? Colors.orange.shade50 : Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: isPaymentPending ? Colors.orange.shade100 : Colors.blue.shade100),
                            ),
                            child: Text(
                              isPaymentPending ? "Awaiting Payment" : "Processing",
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isPaymentPending ? Colors.orange : Colors.blue),
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
                      else 
                        SizedBox(
                           width: double.infinity,
                           child: OutlinedButton(
                             onPressed: () {}, 
                             child: const Text("View Details")
                           )
                        )
                    ],
                  ),
                );
              },
            ),
        ),
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
           child: ListView.separated(
             padding: const EdgeInsets.all(24),
             itemCount: dummyMedicines.length,
             separatorBuilder: (c, i) => const Divider(height: 1),
             itemBuilder: (context, index) {
               final med = dummyMedicines[index];
               final bool isLowStock = index % 3 == 0; // Fake logic
               
               return InkWell(
                 onTap: () {
                   Navigator.push(
                     context,
                     MaterialPageRoute(
                       builder: (_) => InventoryEditScreen(medicine: med),
                     ),
                   ).then((_) => setState(() {}));
                 },
                 child: Padding(
                   padding: const EdgeInsets.symmetric(vertical: 12),
                   child: Row(
                     children: [
                       Container(
                         width: 50, height: 50,
                         decoration: BoxDecoration(
                           borderRadius: BorderRadius.circular(8),
                           color: Colors.grey.shade100,
                           image: DecorationImage(
                             image: NetworkImage(med.imageUrl), fit: BoxFit.cover
                           )
                         ),
                       ),
                       const SizedBox(width: 16),
                       Expanded(
                         child: Column(
                           crossAxisAlignment: CrossAxisAlignment.start,
                           children: [
                             Text(med.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                             Text(med.manufacturer, style: const TextStyle(fontSize: 12, color: Colors.grey)),
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
                       const SizedBox(width: 8),
                       Icon(Icons.edit_outlined, size: 20, color: Colors.grey.shade400),
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
}
