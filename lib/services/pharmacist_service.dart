import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../data/dummy_data.dart';

class PharmacistService extends ChangeNotifier {
  static final PharmacistService _instance = PharmacistService._internal();
  factory PharmacistService() => _instance;
  PharmacistService._internal();

  // --- MOCK DATABASE ---

  List<PrescriptionOrder> orders = [
    PrescriptionOrder(
      id: "RX-1001",
      patientName: "Alice Uwase",
      patientLocationName: "Nyarutarama, Kigali",
      patientCoordinates: [-1.9441, 30.1040], // Near MTN Centre
      date: DateTime.now().subtract(Duration(minutes: 5)),
      prescriptionImageUrl: "assets/rx_sample1.jpg",
      insuranceProvider: "RSSB",
      status: OrderStatus.pendingReview,
    ),
    PrescriptionOrder(
      id: "RX-1002",
      patientName: "John Mugabo",
      patientLocationName: "Kicukiro, Sonatubes",
      patientCoordinates: [-1.9706, 30.1044],
      date: DateTime.now().subtract(Duration(minutes: 45)),
      prescriptionImageUrl: "assets/rx_sample2.jpg",
      status: OrderStatus.pharmacyAccepted, // Ready for Pharmacist to review pricing/finalize
      assignedPharmacyId: "PH-01",
      assignedPharmacyName: "GreenCross Pharmacy",
      pharmacyPrice: 12000, 
      items: [dummyMedicines[0], dummyMedicines[2]],
    ),
  ];

  List<Pharmacy> partnerPharmacies = [
    Pharmacy(
      id: "PH-01", 
      name: "GreenCross Pharmacy", 
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

    // SIMULATION: Driver flow
    _simulateDriverMovement(order);
  }

  void _simulateDriverMovement(PrescriptionOrder order) {
    // 1. Going to Pharmacy
    Future.delayed(Duration(seconds: 5), () {
      order.status = OrderStatus.outForDelivery; // Picked up
      notifyListeners();
      
      // 2. Going to Patient
      Future.delayed(Duration(seconds: 8), () {
        order.status = OrderStatus.delivered;
        notifyListeners();
      });
    });
  }
}
