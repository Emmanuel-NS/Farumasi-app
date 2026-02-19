import 'package:flutter/material.dart';
import 'package:farumasi_app/screens/prescription_upload_screen.dart';
import 'package:farumasi_app/screens/order_tracking_screen.dart';

import 'package:farumasi_app/services/state_service.dart';

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: StateService(),
      builder: (context, _) {
    // For now, we simulate an empty list of orders.
    // In a real app, this would come from a backend or local database.
    final List<Map<String, dynamic>> pastOrders = [];

    // Simulate one active order for demo purposes
    final activeOrders = [
      {
        "id": "ORD-7829X",
        "status": "Out for Delivery",
        "items": "Panadol Extra, Vitamin C",
        "total": "RWF 25,000",
        "date": "Today, 10:30 AM",
        "pharmacy": "Kigali Main Pharmacy" 
      },
    ];

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: Colors.grey.shade50,
        appBar: AppBar(
          elevation: 0,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          title: const Text(
            'My Orders',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          centerTitle: true,
          bottom: const TabBar(
            labelColor: Colors.green,
            unselectedLabelColor: Colors.grey,
            indicatorColor: Colors.green,
            tabs: [
              Tab(text: "Active Orders"),
              Tab(text: "Past Orders"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Active Orders Tab
            activeOrders.isEmpty
                ? _buildEmptyState(
                    context,
                    "No Active Orders",
                    "You have no orders in progress.",
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: activeOrders.length,
                    separatorBuilder: (ctx, i) => const SizedBox(height: 16),
                    itemBuilder: (ctx, i) =>
                        _buildActiveOrderCard(context, activeOrders[i]),
                  ),

            // Past Orders Tab
            pastOrders.isEmpty
                ? _buildEmptyState(
                    context,
                    "No Past Orders",
                    "You haven't placed any orders yet.",
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: pastOrders.length,
                    separatorBuilder: (ctx, i) => const SizedBox(height: 16),
                    itemBuilder: (ctx, i) => _buildOrderItem(pastOrders[i]),
                  ),
          ],
        ),
      ),
    );
    },
   );
  }

  Widget _buildActiveOrderCard(
    BuildContext context,
    Map<String, dynamic> order,
  ) {
    final statusColor = order['status'] == 'Out for Delivery' ? Colors.orange : Colors.green;
    final statusBg = statusColor.shade50;
    final statusText = statusColor.shade800;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8), 
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => OrderTrackingScreen(orderId: order['id']),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Icon + Pharmacy + Date + Status
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.local_pharmacy_rounded, color: Colors.green, size: 24),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            order['pharmacy'] ?? "Pharmacy",
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            order['date'] ?? "Just now",
                            style: TextStyle(
                              color: Colors.grey.shade500,
                              fontSize: 12, 
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        order['status'],
                        style: TextStyle(
                          color: statusText,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Divider(height: 1),
                ),

                // Order Details Grid
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("ORDER ID", style: TextStyle(color: Colors.grey.shade400, fontSize: 10, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text("#${order['id']}", style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        ],
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("ITEMS", style: TextStyle(color: Colors.grey.shade400, fontSize: 10, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text(
                            order['items'] ?? "",
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text("TOTAL", style: TextStyle(color: Colors.grey.shade400, fontSize: 10, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text(
                            order['total'] ?? "",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.green),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),
                
                // Track Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                       Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => OrderTrackingScreen(orderId: order['id']),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: const Icon(Icons.location_on, size: 18),
                    label: const Text("Track Order Live", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, String title, String subtitle) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.receipt_long_rounded,
                size: 64,
                color: Colors.blue.shade300,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, height: 1.5),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  if (!StateService().isLoggedIn) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Please login to upload a prescription.")),
                      );
                      return;
                  }
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const PrescriptionUploadScreen(),
                    ),
                  );
                },
                icon: const Icon(Icons.upload_file),
                label: const Text("Upload Prescription"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: StateService().isLoggedIn ? Colors.green : Colors.grey,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  textStyle: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderItem(Map<String, dynamic> order) {
    // Placeholder for future order item implementation
    return Card(child: ListTile(title: Text("Order #${order['id']}")));
  }
}
