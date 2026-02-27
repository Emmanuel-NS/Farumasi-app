import 'package:flutter/material.dart';
import '../../models/models.dart';

class OrderDetailsScreen extends StatelessWidget {
  final PrescriptionOrder order;

  const OrderDetailsScreen({Key? key, required this.order}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Order #${order.id}"),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Banner
            _buildStatusHeader(),
            const SizedBox(height: 24),

            // Patient Info
            _buildSectionTitle("Patient Information"),
            _buildInfoCard([
              _buildInfoRow(Icons.person, "Name", order.patientName),
              _buildInfoRow(Icons.location_on, "Location", order.patientLocationName),
              _buildInfoRow(Icons.health_and_safety, "Insurance", order.insuranceProvider ?? "None"),
            ]),
            const SizedBox(height: 24),

            // Order Items
            _buildSectionTitle("Items Ordered"),
            _buildItemsList(),
            if (order.prescriptionImageUrl != null)
               Padding(
                 padding: const EdgeInsets.only(top: 12),
                 child: OutlinedButton.icon(
                   onPressed: () {
                     // Show fuller image
                     showDialog(context: context, builder: (_) => Dialog(child: Image.asset(order.prescriptionImageUrl!)));
                   },
                   icon: const Icon(Icons.image),
                   label: const Text("View Prescription"),
                 ),
               ),
            const SizedBox(height: 24),

            // Audit Trail / Timeline
            _buildSectionTitle("Request Timeline"),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                children: [
                  _buildTimelineItem(
                    title: "Request Created",
                    subtitle: "By Patient",
                    time: order.date,
                    isFirst: true,
                    isCompleted: true,
                  ),
                  _buildTimelineItem(
                    title: "Reviewed by Pharmacist",
                    subtitle: order.reviewedBy ?? "Pending Review",
                    time: order.reviewedAt,
                    isCompleted: order.reviewedAt != null,
                  ),
                  _buildTimelineItem(
                    title: "Pharmacy Assigned",
                    subtitle: order.assignedPharmacyName ?? "Finding Pharmacy...",
                    time: order.acceptedAt,
                    isCompleted: order.acceptedAt != null,
                  ),
                  _buildTimelineItem(
                    title: "Payment",
                    subtitle: order.paymentId != null ? "ID: ${order.paymentId}" : "Awaiting User Payment",
                    time: order.paidAt,
                    isCompleted: order.paidAt != null,
                  ),
                  _buildTimelineItem(
                    title: "Out for Delivery",
                    subtitle: order.assignedDriverName != null 
                        ? "Driver: ${order.assignedDriverName}" 
                        : "Waiting for driver assignment",
                    time: order.shippedAt,
                    isCompleted: order.shippedAt != null,
                  ),
                  if (order.status == OrderStatus.cancelled)
                    _buildTimelineItem(
                      title: "Order Cancelled",
                      subtitle: "Reason: ${order.cancellationReason ?? 'Unknown'}\nBy: ${order.cancelledBy ?? 'Unknown'}",
                      time: order.cancelledAt,
                      isLast: true,
                      isCompleted: true,
                      isError: true,
                    )
                  else
                    _buildTimelineItem(
                      title: "Delivered",
                      subtitle: "Order fulfilled successfully",
                      time: order.completedAt,
                      isLast: true,
                      isCompleted: order.completedAt != null,
                    ),
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHeader() {
    Color color;
    String text;
    IconData icon;

    switch (order.status) {
      case OrderStatus.delivered:
        color = Colors.green;
        text = "Completed";
        icon = Icons.check_circle;
        break;
      case OrderStatus.cancelled:
        color = Colors.red;
        text = "Cancelled";
        icon = Icons.cancel;
        break;
      case OrderStatus.paymentPending:
        color = Colors.orange;
        text = "Awaiting Payment";
        icon = Icons.payment;
        break;
      case OrderStatus.outForDelivery:
        color = Colors.blue;
        text = "In Transit";
        icon = Icons.local_shipping;
        break;
      default:
        color = Colors.blue;
        text = "Processing";
        icon = Icons.hourglass_empty;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Status: $text", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color)),
              const SizedBox(height: 4),
              // Show last updated time roughly for now
              Text("Last updated: Just now", style: TextStyle(color: Colors.grey.shade600, fontSize: 12)), 
            ],
          )
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
    );
  }

  Widget _buildInfoCard(List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.grey.shade100, blurRadius: 4, offset: const Offset(0, 2))
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: Colors.grey),
          const SizedBox(width: 12),
          SizedBox(
            width: 80,
            child: Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
          ),
        ],
      ),
    );
  }

  Widget _buildItemsList() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          ...order.items.map((item) => ListTile(
            leading: Container(
              width: 40, height: 40,
              color: Colors.grey.shade100,
              child: Icon(Icons.medication, color: Colors.blue.shade300),
            ),
            title: Text(item.name),
            subtitle: Text("${item.dosage} • RWF ${item.price.toStringAsFixed(0)}"),
            trailing: Text("x1"), // Assuming quantity 1 for simplicity in view
          )),
          const Divider(),
          ListTile(
            title: const Text("Total Estimated Cost", style: TextStyle(fontWeight: FontWeight.bold)),
            trailing: Text("RWF ${(order.totalPrice).toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
          )
        ],
      ),
    );
  }

  Widget _buildTimelineItem({required String title, required String subtitle, DateTime? time, bool isFirst = false, bool isLast = false, bool isCompleted = false, bool isError = false}) {
    Color color = isError ? Colors.red : (isCompleted ? Colors.green : Colors.grey.shade300);
    
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline Line & Dot
          SizedBox(
            width: 40,
            child: Column(
              children: [
                if (!isFirst) Expanded(child: Container(width: 2, color: Colors.grey.shade300)),
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  width: 12, height: 12,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 4)]
                  ),
                ),
                if (!isLast) Expanded(child: Container(width: 2, color: Colors.grey.shade300)),
              ],
            ),
          ),
          // Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(4, 0, 0, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: isCompleted ? Colors.black : Colors.grey)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                  if (time != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        "${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')} • ${time.day}/${time.month}", 
                        style: TextStyle(fontSize: 10, color: Colors.grey.shade400)
                      ),
                    )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
