import 'package:flutter/material.dart';
import 'package:farumasi_app/screens/prescription_upload_screen.dart';
import 'package:farumasi_app/screens/order_tracking_screen.dart';

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // For now, we simulate an empty list of orders.
    // In a real app, this would come from a backend or local database.
    final List<Map<String, dynamic>> pastOrders = [];

    // Simulate one active order for demo purposes
    final activeOrders = [
      {
        "id": "ORD-7829X",
        "status": "Out for Delivery",
        "items": "Panadol Extra, Vitamin C",
        "total": "UGX 25,000",
        "date": "Today, 10:30 AM",
        "pharmacy": "Kampala Main Pharmacy",
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
  }

  Widget _buildActiveOrderCard(
    BuildContext context,
    Map<String, dynamic> order,
  ) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  order['id'],
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green.shade100),
                  ),
                  child: Text(
                    order['status'],
                    style: TextStyle(
                      color: Colors.green.shade700,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Pharmacy Info
            Row(
              children: [
                Icon(Icons.store, size: 16, color: Colors.grey.shade600),
                const SizedBox(width: 4),
                Text(
                  order['pharmacy'] ?? "Unknown Pharmacy",
                  style: TextStyle(
                    color: Colors.grey.shade800,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            Text(order['items'], style: TextStyle(color: Colors.grey.shade700)),
            const SizedBox(height: 4),
            Text(
              "Total: ${order['total']}",
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => OrderTrackingScreen(orderId: order['id']),
                    ),
                  );
                },
                icon: const Icon(Icons.map),
                label: const Text("Track Order Live"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ],
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
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const PrescriptionUploadScreen(),
                    ),
                  );
                },
                icon: const Icon(Icons.upload_file),
                label: const Text("Upload Prescription"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
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
