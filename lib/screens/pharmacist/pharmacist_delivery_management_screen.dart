import 'package:flutter/material.dart';

// --- MOCK MODELS ---
enum DriverStatus { available, busy, offline }

class DeliveryDriver {
  final String id;
  final String name;
  final String phone;
  final DriverStatus status;
  final String currentOrderId;
  final String locationArea;
  final double rating;

  DeliveryDriver({
    required this.id,
    required this.name,
    required this.phone,
    required this.status,
    this.currentOrderId = "",
    required this.locationArea,
    required this.rating,
  });
}

class OrderHistoryEvent {
  final String title;
  final String personnelName;
  final String personnelRole;
  final DateTime timestamp;

  OrderHistoryEvent({
    required this.title,
    required this.personnelName,
    required this.personnelRole,
    required this.timestamp,
  });
}

class DeliveryOrder {
  final String orderId;
  final String patientName;
  final String destination;
  final String status;
  final DateTime estimatedTime;
  final String? driverId;
  final List<String> items;
  final double totalAmount;
  final List<OrderHistoryEvent> history;
  final String pharmacistCode;
  final String pharmacyName;
  final String pharmacyLocation;

  DeliveryOrder({
    required this.orderId,
    required this.patientName,
    required this.destination,
    required this.status,
    required this.estimatedTime,
    this.driverId,
    this.items = const [],
    this.totalAmount = 0.0,
    this.history = const [],
    this.pharmacistCode = "PH-001A",
    this.pharmacyName = "Kigali Central Pharmacy",
    this.pharmacyLocation = "Kigali, Nyarugenge",
  });
}

class PharmacistDeliveryManagementScreen extends StatefulWidget {
  const PharmacistDeliveryManagementScreen({super.key});

  @override
  State<PharmacistDeliveryManagementScreen> createState() =>
      _PharmacistDeliveryManagementScreenState();
}

class _PharmacistDeliveryManagementScreenState
    extends State<PharmacistDeliveryManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<DeliveryDriver> _drivers = [
    DeliveryDriver(
      id: "D-001",
      name: "Kagabo Eric",
      phone: "+250 788 123 456",
      status: DriverStatus.busy,
      currentOrderId: "ORD-8942",
      locationArea: "Kicukiro",
      rating: 4.8,
    ),
    DeliveryDriver(
      id: "D-002",
      name: "Mugisha Jean",
      phone: "+250 788 654 321",
      status: DriverStatus.available,
      locationArea: "Gasabo",
      rating: 4.9,
    ),
    DeliveryDriver(
      id: "D-003",
      name: "Ndayisaba Paul",
      phone: "+250 788 111 222",
      status: DriverStatus.busy,
      currentOrderId: "ORD-8943",
      locationArea: "Nyarugenge",
      rating: 4.5,
    ),
    DeliveryDriver(
      id: "D-004",
      name: "Bizimana Pacifique",
      phone: "+250 788 999 888",
      status: DriverStatus.offline,
      locationArea: "Remera",
      rating: 4.6,
    ),
  ];

  final List<DeliveryOrder> _orders = [
    DeliveryOrder(
      orderId: "ORD-8942",
      patientName: "Aline M.",
      destination: "Kicukiro, KK 15 Ave",
      status: "In Transit",
      estimatedTime: DateTime.now().add(const Duration(minutes: 15)),
      driverId: "D-001",
      items: ["Paracetamol 500mg x2", "Cough Syrup x1"],
      totalAmount: 4500,
      history: [
        OrderHistoryEvent(
          title: "Order Placed",
          personnelName: "Aline M.",
          personnelRole: "Patient",
          timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        ),
        OrderHistoryEvent(
          title: "Payment Verified",
          personnelName: "System",
          personnelRole: "Auto",
          timestamp: DateTime.now().subtract(
            const Duration(hours: 1, minutes: 55),
          ),
        ),
        OrderHistoryEvent(
          title: "Prescription Approved",
          personnelName: "Dr. Mutabazi",
          personnelRole: "Pharmacist",
          timestamp: DateTime.now().subtract(
            const Duration(hours: 1, minutes: 30),
          ),
        ),
        OrderHistoryEvent(
          title: "Packed & Ready",
          personnelName: "Jane Doe",
          personnelRole: "Pharmacy Assistant",
          timestamp: DateTime.now().subtract(const Duration(hours: 1)),
        ),
        OrderHistoryEvent(
          title: "Picked Up by Rider",
          personnelName: "Kagabo Eric",
          personnelRole: "Delivery Driver",
          timestamp: DateTime.now().subtract(const Duration(minutes: 30)),
        ),
      ],
    ),
    DeliveryOrder(
      orderId: "ORD-8943",
      patientName: "Bosco T.",
      destination: "Nyarutarama",
      status: "Picked Up",
      estimatedTime: DateTime.now().add(const Duration(minutes: 30)),
      driverId: "D-003",
      items: ["Amoxicillin 250mg", "Vitamins C"],
      totalAmount: 3200,
      history: [
        OrderHistoryEvent(
          title: "Order Placed",
          personnelName: "Bosco T.",
          personnelRole: "Patient",
          timestamp: DateTime.now().subtract(
            const Duration(hours: 1, minutes: 30),
          ),
        ),
        OrderHistoryEvent(
          title: "Approved",
          personnelName: "Dr. Mutabazi",
          personnelRole: "Pharmacist",
          timestamp: DateTime.now().subtract(const Duration(hours: 1)),
        ),
        OrderHistoryEvent(
          title: "Packed & Ready",
          personnelName: "Jane Doe",
          personnelRole: "Pharmacy Assistant",
          timestamp: DateTime.now().subtract(const Duration(minutes: 15)),
        ),
        OrderHistoryEvent(
          title: "Picked Up",
          personnelName: "Ndayisaba Paul",
          personnelRole: "Delivery Driver",
          timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
        ),
      ],
    ),
    DeliveryOrder(
      orderId: "ORD-8944",
      patientName: "Nadine U.",
      destination: "Kimironko",
      status: "Pending",
      estimatedTime: DateTime.now().add(const Duration(hours: 1)),
      items: ["First Aid Kit"],
      totalAmount: 15000,
      history: [
        OrderHistoryEvent(
          title: "Order Placed",
          personnelName: "Nadine U.",
          personnelRole: "Patient",
          timestamp: DateTime.now().subtract(const Duration(minutes: 45)),
        ),
        OrderHistoryEvent(
          title: "Packed & Ready",
          personnelName: "Sarah K.",
          personnelRole: "Pharmacy Assistant",
          timestamp: DateTime.now().subtract(const Duration(minutes: 10)),
        ),
      ],
    ),
    DeliveryOrder(
      orderId: "ORD-8945",
      patientName: "Claude N.",
      destination: "Kacyiru",
      status: "Pending",
      estimatedTime: DateTime.now().add(const Duration(minutes: 45)),
      items: ["Insulin Glargine Pen"],
      totalAmount: 25000,
      history: [
        OrderHistoryEvent(
          title: "Order Placed",
          personnelName: "Claude N.",
          personnelRole: "Patient",
          timestamp: DateTime.now().subtract(const Duration(minutes: 20)),
        ),
      ],
    ),
    // --- Past Orders ---
    DeliveryOrder(
      orderId: "ORD-8800",
      patientName: "Alice M.",
      destination: "Kiyovu",
      status: "Delivered",
      estimatedTime: DateTime.now().subtract(const Duration(days: 1)),
      driverId: "D-002",
      items: ["Ibuprofen 500mg"],
      totalAmount: 1500,
      pharmacistCode: "PH-001A",
      pharmacyName: "Kigali Central Pharmacy",
      pharmacyLocation: "Kigali, Nyarugenge",
      history: [
        OrderHistoryEvent(
          title: "Order Placed",
          personnelName: "Alice M.",
          personnelRole: "Patient",
          timestamp: DateTime.now().subtract(const Duration(days: 1, hours: 3)),
        ),
        OrderHistoryEvent(
          title: "Delivered",
          personnelName: "Mugisha Jean",
          personnelRole: "Delivery Driver",
          timestamp: DateTime.now().subtract(const Duration(days: 1)),
        ),
      ],
    ),
    DeliveryOrder(
      orderId: "ORD-8801",
      patientName: "Peter K.",
      destination: "Remera",
      status: "Cancelled",
      estimatedTime: DateTime.now().subtract(const Duration(days: 2)),
      items: ["Cough Syrup"],
      totalAmount: 2500,
      pharmacistCode: "PH-089",
      pharmacyName: "Remera Hub Pharmacy",
      pharmacyLocation: "Kigali, Gasabo",
      history: [
        OrderHistoryEvent(
          title: "Order Placed",
          personnelName: "Peter K.",
          personnelRole: "Patient",
          timestamp: DateTime.now().subtract(const Duration(days: 2, hours: 1)),
        ),
        OrderHistoryEvent(
          title: "Cancelled",
          personnelName: "Dr. Mutabazi",
          personnelRole: "Pharmacist",
          timestamp: DateTime.now().subtract(const Duration(days: 2)),
        ),
      ],
    ),
  ];

  // Search & Filter State
  String _searchQuery = "";
  String _orderStatusFilter = "All";
  String _driverStatusFilter = "All";
  String _sortOption = "Default";

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        setState(() {
          _searchQuery = "";
          _sortOption = "Default";
        });
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Color _getStatusColor(DriverStatus status) {
    switch (status) {
      case DriverStatus.available:
        return Colors.green;
      case DriverStatus.busy:
        return Colors.orange;
      case DriverStatus.offline:
        return Colors.grey;
    }
  }

  // --- Filtering Logic ---
  List<DeliveryOrder> get _filteredOrders {
    var filtered = _orders.where((o) {
      if (o.status == "Delivered" || o.status == "Cancelled") return false;
      final matchesSearch =
          _searchQuery.isEmpty ||
          o.orderId.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          o.patientName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          o.destination.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesFilter =
          _orderStatusFilter == 'All' || o.status == _orderStatusFilter;
      return matchesSearch && matchesFilter;
    }).toList();

    if (_sortOption == "A-Z (Name)") {
      filtered.sort((a, b) => a.patientName.compareTo(b.patientName));
    } else if (_sortOption == "Time (Closest)") {
      filtered.sort((a, b) => a.estimatedTime.compareTo(b.estimatedTime));
    }
    return filtered;
  }

  List<DeliveryOrder> get _filteredPastOrders {
    var filtered = _orders.where((o) {
      if (o.status != "Delivered" && o.status != "Cancelled") return false;
      final matchesSearch =
          _searchQuery.isEmpty ||
          o.orderId.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          o.patientName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          o.destination.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesFilter =
          _orderStatusFilter == 'All' || o.status == _orderStatusFilter;
      return matchesSearch && matchesFilter;
    }).toList();

    if (_sortOption == "A-Z (Name)") {
      filtered.sort((a, b) => a.patientName.compareTo(b.patientName));
    } else if (_sortOption == "Time (Closest)") {
      filtered.sort((a, b) => b.estimatedTime.compareTo(a.estimatedTime));
    }
    return filtered;
  }

  List<DeliveryDriver> get _filteredDrivers {
    var filtered = _drivers.where((d) {
      final matchesSearch =
          _searchQuery.isEmpty ||
          d.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          d.id.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          d.locationArea.toLowerCase().contains(_searchQuery.toLowerCase());

      final dStatusStr =
          d.status.name[0].toUpperCase() + d.status.name.substring(1);
      final matchesFilter =
          _driverStatusFilter == 'All' || dStatusStr == _driverStatusFilter;
      return matchesSearch && matchesFilter;
    }).toList();

    if (_sortOption == "A-Z (Name)") {
      filtered.sort((a, b) => a.name.compareTo(b.name));
    } else if (_sortOption == "Rating (High-Low)") {
      filtered.sort((a, b) => b.rating.compareTo(a.rating));
    }
    return filtered;
  }

  // --- UI Components ---
  void _assignOrderDialog(DeliveryOrder order) {
    final availableDrivers = _drivers
        .where((d) => d.status == DriverStatus.available)
        .toList();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text("Assign Driver to ${order.orderId}"),
          content: availableDrivers.isEmpty
              ? const Text(
                  "No drivers are currently available.",
                  style: TextStyle(color: Colors.red),
                )
              : SizedBox(
                  width: double.maxFinite,
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: availableDrivers.length,
                    itemBuilder: (ctx, idx) {
                      final driver = availableDrivers[idx];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.green.shade50,
                          child: const Icon(
                            Icons.two_wheeler,
                            color: Colors.green,
                          ),
                        ),
                        title: Text(driver.name),
                        subtitle: Text("Near: ${driver.locationArea}"),
                        trailing: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green.shade800,
                            foregroundColor: Colors.white,
                          ),
                          onPressed: () {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  "Order assigned to ${driver.name}",
                                ),
                              ),
                            );
                            setState(() {
                              final matchedDriverIndex = _drivers.indexWhere(
                                (d) => d.id == driver.id,
                              );
                              if (matchedDriverIndex != -1) {
                                _drivers[matchedDriverIndex] = DeliveryDriver(
                                  id: driver.id,
                                  name: driver.name,
                                  phone: driver.phone,
                                  status: DriverStatus.busy,
                                  locationArea: driver.locationArea,
                                  rating: driver.rating,
                                  currentOrderId: order.orderId,
                                );
                              }
                              final orderIndex = _orders.indexWhere(
                                (o) => o.orderId == order.orderId,
                              );
                              if (orderIndex != -1) {
                                _orders[orderIndex] = DeliveryOrder(
                                  orderId: order.orderId,
                                  patientName: order.patientName,
                                  destination: order.destination,
                                  status: "Picked Up",
                                  estimatedTime: order.estimatedTime,
                                  driverId: driver.id,
                                );
                              }
                            });
                          },
                          child: const Text("Assign"),
                        ),
                      );
                    },
                  ),
                ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Close"),
            ),
          ],
        );
      },
    );
  }

  void _showOrderDetails(DeliveryOrder order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 16),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Order Details",
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: order.status == "Pending"
                          ? Colors.red.shade50
                          : Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      order.status,
                      style: TextStyle(
                        color: order.status == "Pending"
                            ? Colors.red.shade700
                            : Colors.blue.shade700,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 32),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Order #${order.orderId}",
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Patient & Dest
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.person_outline,
                          size: 20,
                          color: Colors.grey.shade700,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Patient",
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                order.patientName,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.location_on_outlined,
                          size: 20,
                          color: Colors.grey.shade700,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Delivery Address",
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                order.destination,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.local_pharmacy_outlined,
                          size: 20,
                          color: Colors.grey.shade700,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Pharmacy Info",
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                order.pharmacyName,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text(
                                "${order.pharmacyLocation} • Code: ${order.pharmacistCode}",
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    // Items
                    const Text(
                      "Items",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        children: [
                          ...order.items.map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 8.0),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.medication_outlined,
                                    size: 16,
                                    color: Colors.green,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      item,
                                      style: const TextStyle(fontSize: 14),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const Divider(),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                "Total Amount",
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                "${order.totalAmount} RWF",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green.shade700,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    // Timeline
                    const Text(
                      "Order Timeline & Personnel",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    if (order.history.isEmpty)
                      const Text(
                        "No history available",
                        style: TextStyle(color: Colors.grey),
                      )
                    else
                      ...order.history.map((event) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16.0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Column(
                                children: [
                                  Container(
                                    width: 12,
                                    height: 12,
                                    decoration: BoxDecoration(
                                      color: Colors.green.shade500,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  Container(
                                    width: 2,
                                    height: 40,
                                    color: Colors.green.shade200,
                                  ),
                                ],
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          event.title,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                        Text(
                                          "${event.timestamp.hour}:${event.timestamp.minute.toString().padLeft(2, '0')}",
                                          style: TextStyle(
                                            color: Colors.grey.shade500,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.person,
                                          size: 14,
                                          color: Colors.grey.shade600,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          event.personnelName,
                                          style: TextStyle(
                                            color: Colors.black87,
                                            fontWeight: FontWeight.w500,
                                            fontSize: 13,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.grey.shade100,
                                            borderRadius: BorderRadius.circular(
                                              4,
                                            ),
                                          ),
                                          child: Text(
                                            event.personnelRole,
                                            style: TextStyle(
                                              color: Colors.grey.shade700,
                                              fontSize: 10,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showMapTracking(DeliveryDriver driver, DeliveryOrder order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 16),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: Colors.blue.shade50,
                    child: const Icon(
                      Icons.two_wheeler,
                      color: Colors.blue,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          driver.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          "${order.orderId} • ${order.status}",
                          style: TextStyle(
                            color: Colors.orange.shade800,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.call, color: Colors.green),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text("Calling ${driver.name}...")),
                      );
                    },
                  ),
                ],
              ),
            ),
            const Divider(height: 32),
            Expanded(
              child: Container(
                width: double.infinity,
                margin: const EdgeInsets.only(left: 20, right: 20, bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(16),
                  image: const DecorationImage(
                    image: NetworkImage(
                      "https://mt.googleapis.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/1899-blank-shape_pin_4x.png",
                    ),
                    fit: BoxFit.cover,
                  ),
                  border: Border.all(color: Colors.grey.shade300, width: 2),
                ),
                child: Stack(
                  children: [
                    const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.location_on, color: Colors.red, size: 48),
                          Text(
                            "Live GPS Tracking En Route",
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              backgroundColor: Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Positioned(
                      bottom: 16,
                      left: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: const [
                            BoxShadow(color: Colors.black12, blurRadius: 10),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Est. Arrival",
                                  style: TextStyle(
                                    color: Colors.grey,
                                    fontSize: 12,
                                  ),
                                ),
                                Text(
                                  "${order.estimatedTime.hour}:${order.estimatedTime.minute.toString().padLeft(2, '0')}",
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18,
                                  ),
                                ),
                              ],
                            ),
                            Flexible(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text(
                                    "Destination",
                                    style: TextStyle(
                                      color: Colors.grey,
                                      fontSize: 12,
                                    ),
                                  ),
                                  Text(
                                    order.destination,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text(
          "Fleet & Deliveries",
          style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.green.shade800,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Colors.green.shade800,
          isScrollable: true,
          tabs: const [
            Tab(text: "Active Orders"),
            Tab(text: "Order History"),
            Tab(text: "Riders & Fleet"),
          ],
        ),
      ),
      body: Column(
        children: [
          // Filter & Search Bar Area
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: _tabController.index == 2
                        ? "Search driver name or ID..."
                        : "Search orders, destinations...",
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    filled: true,
                    fillColor: Colors.grey.shade100,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    // Dynamic Filter Dropdown
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            isExpanded: true,
                            value: _tabController.index == 0
                                ? _orderStatusFilter
                                : _driverStatusFilter,
                            icon: const Icon(Icons.filter_list, size: 16),
                            style: const TextStyle(
                              fontSize: 13,
                              color: Colors.black87,
                            ),
                            items:
                                (_tabController.index == 0
                                        ? [
                                            "All",
                                            "Pending",
                                            "Picked Up",
                                            "In Transit",
                                            "Delivered",
                                          ]
                                        : [
                                            "All",
                                            "Available",
                                            "Busy",
                                            "Offline",
                                          ])
                                    .map((String value) {
                                      return DropdownMenuItem<String>(
                                        value: value,
                                        child: Text(value),
                                      );
                                    })
                                    .toList(),
                            onChanged: (val) {
                              setState(() {
                                if (_tabController.index == 0) {
                                  _orderStatusFilter = val!;
                                } else {
                                  _driverStatusFilter = val!;
                                }
                              });
                            },
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Dynamic Sort Dropdown
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            isExpanded: true,
                            value: _sortOption,
                            icon: const Icon(Icons.sort, size: 16),
                            style: const TextStyle(
                              fontSize: 13,
                              color: Colors.black87,
                            ),
                            items:
                                [
                                  "Default",
                                  "A-Z (Name)",
                                  _tabController.index == 0
                                      ? "Time (Closest)"
                                      : "Rating (High-Low)",
                                ].map((String value) {
                                  return DropdownMenuItem<String>(
                                    value: value,
                                    child: Text(value),
                                  );
                                }).toList(),
                            onChanged: (val) {
                              setState(() {
                                _sortOption = val!;
                              });
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildActiveOrdersTab(),
                _buildOrderHistoryTab(),
                _buildDriversTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveOrdersTab() {
    final list = _filteredOrders;
    if (list.isEmpty)
      return const Center(
        child: Text("No orders found", style: TextStyle(color: Colors.grey)),
      );

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final order = list[index];
        final isAssigned = order.driverId != null;

        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: InkWell(
            onTap: () => _showOrderDetails(order),
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        order.orderId,
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
                          color: order.status == "Pending"
                              ? Colors.red.shade50
                              : Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          order.status,
                          style: TextStyle(
                            color: order.status == "Pending"
                                ? Colors.red.shade700
                                : Colors.blue.shade700,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(
                        Icons.person_outline,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          order.patientName,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 16),
                      const Icon(
                        Icons.location_on_outlined,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          order.destination,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  if (!isAssigned)
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.person_add_alt_1),
                        label: const Text("Assign to Rider"),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.green.shade800,
                          side: BorderSide(color: Colors.green.shade800),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        onPressed: () => _assignOrderDialog(order),
                      ),
                    )
                  else ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 12,
                              backgroundColor: Colors.green.shade100,
                              child: const Icon(
                                Icons.sports_motorsports,
                                size: 14,
                                color: Colors.green,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              "Assigned: ${order.driverId!}",
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        TextButton.icon(
                          icon: const Icon(Icons.my_location, size: 16),
                          label: const Text("Track Ride"),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.orange.shade800,
                          ),
                          onPressed: () {
                            final driver = _drivers.firstWhere(
                              (d) => d.id == order.driverId,
                            );
                            _showMapTracking(driver, order);
                          },
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildOrderHistoryTab() {
    final list = _filteredPastOrders;
    if (list.isEmpty) {
      return const Center(
        child: Text(
          "No past orders found",
          style: TextStyle(color: Colors.grey),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final order = list[index];

        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: InkWell(
            onTap: () => _showOrderDetails(order),
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        order.orderId,
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
                          color: order.status == "Delivered"
                              ? Colors.green.shade50
                              : Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          order.status,
                          style: TextStyle(
                            color: order.status == "Delivered"
                                ? Colors.green.shade700
                                : Colors.red.shade700,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(
                        Icons.person_outline,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          order.patientName,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 16),
                      const Icon(
                        Icons.location_on_outlined,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          order.destination,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildDriversTab() {
    final list = _filteredDrivers;
    if (list.isEmpty)
      return const Center(
        child: Text("No drivers found", style: TextStyle(color: Colors.grey)),
      );

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final driver = list[index];
        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Stack(
                      children: [
                        CircleAvatar(
                          radius: 28,
                          backgroundColor: Colors.grey.shade100,
                          child: Icon(
                            Icons.person,
                            color: Colors.grey.shade700,
                            size: 32,
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: _getStatusColor(driver.status),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                driver.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.star,
                                    color: Colors.amber,
                                    size: 14,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    driver.rating.toString(),
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "ID: ${driver.id} • ${driver.phone}",
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Icon(
                                Icons.location_on,
                                size: 14,
                                color: Colors.grey.shade500,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                driver.locationArea,
                                style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontSize: 12,
                                ),
                              ),
                              const Spacer(),
                              if (driver.status == DriverStatus.busy)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.orange.shade50,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    "Delivering ${driver.currentOrderId}",
                                    style: TextStyle(
                                      color: Colors.orange.shade800,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                )
                              else if (driver.status == DriverStatus.available)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade50,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    "Available",
                                    style: TextStyle(
                                      color: Colors.green.shade800,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                )
                              else
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    "Offline",
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                // Expanded Actions Row
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    TextButton.icon(
                      icon: Icon(
                        Icons.call_outlined,
                        size: 18,
                        color: Colors.green.shade700,
                      ),
                      label: Text(
                        "Call Node",
                        style: TextStyle(color: Colors.green.shade700),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              "Calling ${driver.name} at ${driver.phone}...",
                            ),
                          ),
                        );
                      },
                    ),
                    Container(
                      height: 24,
                      width: 1,
                      color: Colors.grey.shade300,
                    ),
                    TextButton.icon(
                      icon: Icon(
                        Icons.message_outlined,
                        size: 18,
                        color: Colors.blue.shade700,
                      ),
                      label: Text(
                        "Message",
                        style: TextStyle(color: Colors.blue.shade700),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              "Opening text thread with ${driver.name}...",
                            ),
                          ),
                        );
                      },
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
}
