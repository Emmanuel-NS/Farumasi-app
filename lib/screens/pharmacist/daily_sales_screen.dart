import 'package:flutter/material.dart';
import '../../models/models.dart';
import '../../services/pharmacist_service.dart';

class DailySalesScreen extends StatefulWidget {
  final int dayIndex;
  const DailySalesScreen({super.key, required this.dayIndex});

  @override
  State<DailySalesScreen> createState() => _DailySalesScreenState();
}

class _DailySalesScreenState extends State<DailySalesScreen> {
  final PharmacistService _service = PharmacistService();

  String _getDayName(int index) {
    switch (index) {
      case 0: return "Monday";
      case 1: return "Tuesday";
      case 2: return "Wednesday";
      case 3: return "Thursday";
      case 4: return "Friday";
      case 5: return "Saturday";
      case 6: return "Sunday";
      default: return "Unknown Day";
    }
  }

  @override
  Widget build(BuildContext context) {
    final String dayName = _getDayName(widget.dayIndex);
    
    // For demonstration, let's filter completed orders by some mock logic,
    // or just show all completed orders for simplicity, since our mock data timestamps might not map directly to these days.
    // In a real app we would check `order.completedAt.weekday == widget.dayIndex + 1` etc.
    final List<PrescriptionOrder> dayOrders = _service.completedOrders;

    return Scaffold(
      appBar: AppBar(
        title: Text("$dayName's Sales", style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black87),
      ),
      backgroundColor: Colors.grey.shade50,
      body: dayOrders.isEmpty
          ? const Center(child: Text("No sales recorded for this day."))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: dayOrders.length,
              itemBuilder: (context, index) {
                final order = dayOrders[index];
                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Colors.grey.shade200)
                  ),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8)
                      ),
                      child: const Icon(Icons.receipt_long, color: Colors.green),
                    ),
                    title: Text("Order #${order.id}", style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(
                      "Patient: ${order.patientName}\nItems: ${order.items.length}", 
                      style: TextStyle(color: Colors.grey.shade700)
                    ),
                    trailing: Text(
                      "RWF ${order.totalPrice.toStringAsFixed(0)}", 
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 16)
                    ),
                    isThreeLine: true,
                  ),
                );
              },
            ),
    );
  }
}
