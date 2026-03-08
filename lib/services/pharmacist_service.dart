import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../data/dummy_data.dart';

class PharmacistService extends ChangeNotifier {
  static final PharmacistService _instance = PharmacistService._internal();
  factory PharmacistService() => _instance;
  PharmacistService._internal();

  // --- MOCK DATABASE ---

  List<PrescriptionOrder> orders = [
    // 1. Pending Review (New Request)
    PrescriptionOrder(
      id: "RX-1001",
      patientName: "Alice Uwase",
      patientLocationName: "Nyarutarama, Kigali",
      patientCoordinates: [-1.9441, 30.1040],
      date: DateTime.now().subtract(Duration(minutes: 5)),
      prescriptionImageUrl: "assets/rx_sample1.jpg",
      insuranceProvider: "RSSB",
      status: OrderStatus.pendingReview,
    ),
    // 2. Pharmacy Accepted (Ready for Pharmacist to finalize)
    PrescriptionOrder(
      id: "RX-1002",
      patientName: "John Mugabo",
      patientLocationName: "Kicukiro, Sonatubes",
      patientCoordinates: [-1.9706, 30.1044],
      date: DateTime.now().subtract(Duration(minutes: 45)),
      prescriptionImageUrl: "assets/rx_sample2.jpg",
      status: OrderStatus.pharmacyAccepted,
      assignedPharmacyId: "PH-01",
      assignedPharmacyName: "Farumasi Pharmacy",
      pharmacyPrice: 12000, 
      items: [dummyMedicines[0], dummyMedicines[2]],
      reviewedBy: "Pharmacist (You)",
      reviewedAt: DateTime.now().subtract(Duration(minutes: 40)),
      acceptedAt: DateTime.now().subtract(Duration(minutes: 5)),
    ),
    // 3. Payment Pending
    PrescriptionOrder(
      id: "RX-1003",
      patientName: "Sarah Keza",
      patientLocationName: "Remera, Gisimenti",
      patientCoordinates: [-1.9585, 30.1114],
      date: DateTime.now().subtract(Duration(hours: 1)),
      prescriptionImageUrl: "assets/rx_sample3.jpg",
      status: OrderStatus.paymentPending,
      assignedPharmacyName: "City Center Chemists",
      pharmacyPrice: 4500,
      deliveryFee: 1000,
      items: [dummyMedicines[1]],
      reviewedBy: "Pharmacist (You)",
    ),
    // 4. Finding Pharmacy (Broadcasting)
    PrescriptionOrder(
      id: "RX-1004",
      patientName: "David N.",
      patientLocationName: "Kimironko, Zindiro",
      patientCoordinates: [-1.9397, 30.1303],
      date: DateTime.now().subtract(Duration(minutes: 10)),
      prescriptionImageUrl: "assets/rx_sample1.jpg",
      status: OrderStatus.findingPharmacy,
      reviewedBy: "Pharmacist (You)",
      reviewedAt: DateTime.now().subtract(Duration(minutes: 1)),
    ),
    // 5. Delivered (Direct Order)
    PrescriptionOrder(
      id: "ORD-2001",
      patientName: "Emmanuel K.",
      patientLocationName: "Kacyiru, US Embassy",
      patientCoordinates: [-1.9470, 30.0880],
      date: DateTime.now().subtract(Duration(days: 1)),
      status: OrderStatus.delivered,
      items: [dummyMedicines[3], dummyMedicines[0]],
      pharmacyPrice: 15400,
      deliveryFee: 1500,
      paymentId: "TX-998877",
      paidAt: DateTime.now().subtract(Duration(days: 1, hours: 2)),
      shippedAt: DateTime.now().subtract(Duration(days: 1, hours: 1)),
      completedAt: DateTime.now().subtract(Duration(days: 1)),
      assignedDriverName: "Jean Paul",
    ),
    // 6. Rejected (Out of Stock)
    PrescriptionOrder(
      id: "RX-1005",
      patientName: "Grace Batamuriza",
      patientLocationName: "Gisozi, ULK",
      patientCoordinates: [-1.9300, 30.0580],
      date: DateTime.now().subtract(Duration(hours: 3)),
      prescriptionImageUrl: "assets/rx_sample2.jpg",
      status: OrderStatus.cancelled,
      cancelledBy: "Pharmacist (You)",
      cancelledAt: DateTime.now().subtract(Duration(hours: 2, minutes: 55)),
      cancellationReason: "Prescription not legible and user unreachable.",
    ),
    // 7. Out For Delivery
    PrescriptionOrder(
      id: "ORD-2002",
      patientName: "Fabrice I.",
      patientLocationName: "Nyamirambo, Cosmos",
      patientCoordinates: [-1.9750, 30.0400],
      date: DateTime.now().subtract(Duration(hours: 2)),
      status: OrderStatus.outForDelivery,
      items: [dummyMedicines[2]],
      pharmacyPrice: 3200,
      assignedDriverName: "Eric M.",
      shippedAt: DateTime.now().subtract(Duration(minutes: 30)),
    ),
    // 8. Ready for Pickup (Waiting for Driver)
    PrescriptionOrder(
      id: "RX-1006",
      patientName: "Olive M.",
      patientLocationName: "Kanombe, Airport",
      patientCoordinates: [-1.9630, 30.1350],
      date: DateTime.now().subtract(Duration(hours: 4)),
      prescriptionImageUrl: "assets/rx_sample3.jpg",
      status: OrderStatus.readyForPickup,
      pharmacyPrice: 20000,
      paymentId: "TX-776655",
      paidAt: DateTime.now().subtract(Duration(minutes: 10)),
    ),
    // 9. Delivered (Old)
    PrescriptionOrder(
      id: "RX-9001",
      patientName: "Paul R.",
      patientLocationName: "Gacuriro",
      patientCoordinates: [-1.9300, 30.0800],
      date: DateTime.now().subtract(Duration(days: 5)),
      prescriptionImageUrl: "assets/rx_sample1.jpg",
      status: OrderStatus.delivered,
      items: [dummyMedicines[4]],
      pharmacyPrice: 5000,
      completedAt: DateTime.now().subtract(Duration(days: 5)),
    ),
    // 10. Rejected (Invalid Insurance)
    PrescriptionOrder(
      id: "RX-1007",
      patientName: "Chantal U.",
      patientLocationName: "Kibagabaga",
      patientCoordinates: [-1.9400, 30.1100],
      date: DateTime.now().subtract(Duration(days: 2)),
      prescriptionImageUrl: "assets/rx_sample2.jpg",
      status: OrderStatus.cancelled,
      cancelledBy: "Pharmacist (You)",
      cancellationReason: "Insurance card expired.",
      cancelledAt: DateTime.now().subtract(Duration(days: 2, hours: 1)),
    ),
    // 11. Payment Pending (Direct Order)
    PrescriptionOrder(
      id: "ORD-2003",
      patientName: "Kevin G.",
      patientLocationName: "Masaka",
      patientCoordinates: [-2.0000, 30.2000],
      date: DateTime.now().subtract(Duration(minutes: 20)),
      status: OrderStatus.paymentPending,
      items: [dummyMedicines[0], dummyMedicines[0]],
      pharmacyPrice: 17000,
    ),
    // 12. Pending Review (Recent)
    PrescriptionOrder(
      id: "RX-1008",
      patientName: "Beatrice K.",
      patientLocationName: "Nyanza, Kicukiro",
      patientCoordinates: [-1.9900, 30.1000],
      date: DateTime.now().subtract(Duration(minutes: 2)),
      prescriptionImageUrl: "assets/rx_sample3.jpg",
      status: OrderStatus.pendingReview,
      insuranceProvider: "MMI",
    ),
    // 13. Driver Assigned
    PrescriptionOrder(
      id: "ORD-2004",
      patientName: "Robert T.",
      patientLocationName: "Rebero",
      patientCoordinates: [-1.9800, 30.0700],
      date: DateTime.now().subtract(Duration(hours: 1, minutes: 30)),
      status: OrderStatus.driverAssigned,
      items: [dummyMedicines[2]],
      pharmacyPrice: 6000,
      assignedDriverName: "Jean Paul",
    ),
    // 14. Pharmacy Accepted
    PrescriptionOrder(
      id: "RX-1009",
      patientName: "Diane S.",
      patientLocationName: "Kimihurura",
      patientCoordinates: [-1.9500, 30.0800],
      date: DateTime.now().subtract(Duration(hours: 2)),
      prescriptionImageUrl: "assets/rx_sample1.jpg",
      status: OrderStatus.pharmacyAccepted,
      assignedPharmacyName: "HealthPlus Kimironko",
      items: [dummyMedicines[1], dummyMedicines[3]],
      pharmacyPrice: 9500,
    ),
    // 15. Delivered (Yesterday)
    PrescriptionOrder(
      id: "ORD-2005",
      patientName: "Patrick M.",
      patientLocationName: "Gikondo",
      patientCoordinates: [-1.9600, 30.0600],
      date: DateTime.now().subtract(Duration(days: 1, hours: 5)),
      status: OrderStatus.delivered,
      items: [dummyMedicines[0]],
      pharmacyPrice: 8500,
      completedAt: DateTime.now().subtract(Duration(days: 1)),
    ),
  ];

  List<Pharmacy> partnerPharmacies = [
    Pharmacy(
      id: "PH-01", 
      name: "Farumasi Pharmacy", 
      locationName: "Kigali Heights", 
      coordinates: [-1.9540, 30.0926], 
      supportedInsurances: ["RSSB", "UAP", "MMI"]
    ),
    Pharmacy(
      id: "PH-02", 
      name: "HealthPlus Kimironko", 
      locationName: "Kimironko Market", 
      coordinates: [-1.9495, 30.1260], 
      supportedInsurances: ["RSSB"]
    ),
    Pharmacy(
      id: "PH-03", 
      name: "City Center Chemists", 
      locationName: "UTC Building", 
      coordinates: [-1.9446, 30.0624], 
      supportedInsurances: ["UAP", "MMI"]
    ),
  ];

  List<Driver> activeDrivers = [
    Driver(
      id: "DR-01", 
      name: "Jean Paul", 
      phoneNumber: "+250788123456", 
      currentCoordinates: [-1.9450, 30.1000] // Near Nyarutarama
    ),
    Driver(
      id: "DR-02", 
      name: "Eric M.", 
      phoneNumber: "+250788654321", 
      currentCoordinates: [-1.9700, 30.1000] // Near Kicukiro
    ),
  ];

  // --- BOOKINGS (SESSIONS) ---
  List<PharmacistBooking> bookings = [
    PharmacistBooking(
      id: "BK-001",
      pharmacistId: "PH-USR-01",
      pharmacistName: "You",
      patientName: "Sarah M.",
      type: "General Consultation",
      date: DateTime.now(),
      time: "10:30 AM",
      notes: "Routine check-up for blood pressure.",
      status: "Confirmed",
    ),
    PharmacistBooking(
      id: "BK-002",
      pharmacistId: "PH-USR-01",
      pharmacistName: "You",
      patientName: "David K.",
      type: "Prescription Review",
      date: DateTime.now(),
      time: "02:00 PM",
      notes: "Discuss side effects of new medication.",
      status: "Pending",
    ),
    PharmacistBooking(
      id: "BK-003",
      pharmacistId: "PH-USR-01",
      pharmacistName: "You",
      patientName: "Grace L.",
      type: "Follow-up",
      date: DateTime.now().add(const Duration(days: 1)),
      time: "09:00 AM",
      notes: "Post-surgery follow-up.",
      status: "Confirmed",
    ),
  ];
  
  // --- HELPERS FOR DASHBOARD ---

  List<PharmacistBooking> get upcomingSessions => bookings
      .where((b) => b.status == "Confirmed" || b.status == "Pending")
      .toList();

  double get totalRevenue => completedOrders
      .fold(0, (sum, order) => sum + order.totalPrice);

  double get todayRevenue => totalRevenue * 0.4; // Mock calculation for today
  double get weeklyRevenue => totalRevenue * 2.5; // Mock calculation for week

  void updateBookingStatus(String id, String newStatus) {
    final index = bookings.indexWhere((b) => b.id == id);
    if (index != -1) {
      // Create a new object with updated status because properties are final
      final old = bookings[index];
      bookings[index] = PharmacistBooking(
        id: old.id,
        pharmacistId: old.pharmacistId,
        pharmacistName: old.pharmacistName,
        patientName: old.patientName,
        type: old.type,
        date: old.date,
        time: old.time,
        notes: old.notes,
        status: newStatus,
      );
      notifyListeners();
    }
  }

  List<PrescriptionOrder> get incomingRequests =>
      orders.where((o) => o.status == OrderStatus.pendingReview).toList();

  List<PrescriptionOrder> get processingOrders => orders
      .where((o) => [
            OrderStatus.findingPharmacy,
            OrderStatus.pharmacyAccepted,
            OrderStatus.paymentPending
          ].contains(o.status))
      .toList();

  List<PrescriptionOrder> get deliveryQueue => orders
      .where((o) => [
            OrderStatus.readyForPickup,
            OrderStatus.driverAssigned,
            OrderStatus.outForDelivery
          ].contains(o.status))
      .toList();

  List<PrescriptionOrder> get completedOrders => 
      orders.where((o) => o.status == OrderStatus.delivered || o.status == OrderStatus.cancelled).toList();

  // --- WORKFLOW ACTIONS ---

  // Step 1: Pharmacist Reviews and Accepts Order
  void reviewOrder(PrescriptionOrder order, bool accepted) {
    if (accepted) {
      // Move to 'finding pharmacy' stage
      order.status = OrderStatus.findingPharmacy;
    } else {
      order.status = OrderStatus.cancelled;
    }
    notifyListeners();
  }

  // Step 2: Send Request to Pharmacy
  void sendToPharmacy(PrescriptionOrder order, Pharmacy pharmacy) {
    order.assignedPharmacyId = pharmacy.id;
    order.assignedPharmacyName = pharmacy.name;
    order.pharmacyCoordinates = pharmacy.coordinates; // Store for map/routing
    order.status = OrderStatus.findingPharmacy;
    notifyListeners();

    // SIMULATION: Pharmacy Accepts after 3 seconds
    Future.delayed(Duration(seconds: 3), () {
      order.items = [dummyMedicines[0], dummyMedicines[1]]; // Mock items added by pharmacy
      order.pharmacyPrice = 8500.0; // Mock price set by pharmacy
      order.status = OrderStatus.pharmacyAccepted;
      notifyListeners();
    });
  }

  // Step 3: Pharmacist Finalizes Invoice (Add Delivery Fee) & Sends to Patient
  void sendToPatientForPayment(PrescriptionOrder order) {
    order.status = OrderStatus.paymentPending;
    notifyListeners();
    // Simulation: None (Wait for manual "Confirm Payment")
  }
  
  // Step 3b: Confirm Payment Received
  void markAsPaid(PrescriptionOrder order) {
    order.status = OrderStatus.readyForPickup;
    notifyListeners();
  }

  // Step 4: Assign Driver
  void assignDriver(PrescriptionOrder order, Driver driver) {
    order.assignedDriverId = driver.id;
    order.assignedDriverName = driver.name;
    order.driverCoordinates = driver.currentCoordinates; 
    order.status = OrderStatus.driverAssigned;
    notifyListeners();

    // Removed automatic simulation so the Rider Dashboard can manually drive it!
    // _simulateDriverMovement(order);
  }

  // Method for Rider Dashboard to manually advance state
  void updateDriverOrderStatus(PrescriptionOrder order, OrderStatus newStatus) {
    order.status = newStatus;
    if (newStatus == OrderStatus.delivered) {
      order.completedAt = DateTime.now();
    }
    notifyListeners();
  }


}
