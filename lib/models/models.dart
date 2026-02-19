class Medicine {
  final String id;
  final String name;
  final String description;
  final double price;
  final String imageUrl;
  final String category;
  final bool requiresPrescription;
  final double rating;
  final bool isPopular;
  final String dosage;
  final String sideEffects;
  final String manufacturer;

  Medicine({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.imageUrl,
    required this.category,
    this.requiresPrescription = false,
    this.rating = 4.5,
    this.isPopular = false,
    this.dosage = 'Take as directed by physician.',
    this.sideEffects = 'Consult a doctor if adverse reactions occur.',
    this.manufacturer = 'Generic Pharm Co.',
  });
}

class HealthTip {
  final String id;
  final String title;
  final String content;
  final String imageUrl;

  HealthTip({
    required this.id,
    required this.title,
    required this.content,
    required this.imageUrl,
  });
}

class CartItem {
  final Medicine medicine;
  int quantity;

  CartItem({required this.medicine, this.quantity = 1});

  double get total => medicine.price * quantity;
}

// --- New Models for Pharmacist Dashboard ---

enum OrderStatus {
  pendingReview,     // 1. Pharmacist reviews prescription
  findingPharmacy,   // 2. Sent to pharmacy, waiting for acceptance/price
  pharmacyAccepted,  // 3. Pharmacy accepted, price received
  paymentPending,    // 4. Sent to patient with final price (drug + delivery)
  readyForPickup,    // 5. Patient paid, assigning driver
  driverAssigned,    // 6. Driver on the way to pharmacy
  outForDelivery,    // 7. Picked up, going to patient
  delivered,         // 8. Completed
  cancelled
}

class PrescriptionOrder {
  final String id;
  final String patientName;
  final String patientLocationName; // Text address
  final List<double> patientCoordinates; // [lat, long]
  final String? prescriptionImageUrl;
  final DateTime date;
  OrderStatus status;
  List<Medicine> items;
  double pharmacyPrice; // Price from pharmacy
  double deliveryFee;
  double get totalPrice => pharmacyPrice + deliveryFee;
  
  String? assignedPharmacyId;
  String? assignedPharmacyName;
  List<double>? pharmacyCoordinates;

  String? assignedDriverId;
  String? assignedDriverName;
  List<double>? driverCoordinates;

  String? insuranceProvider;

  PrescriptionOrder({
    required this.id,
    required this.patientName,
    required this.patientLocationName,
    required this.patientCoordinates,
    this.prescriptionImageUrl,
    required this.date,
    this.status = OrderStatus.pendingReview,
    this.items = const [],
    this.pharmacyPrice = 0.0,
    this.deliveryFee = 1500.0,
    this.assignedPharmacyId,
    this.assignedPharmacyName,
    this.pharmacyCoordinates,
    this.assignedDriverId,
    this.assignedDriverName,
    this.driverCoordinates,
    this.insuranceProvider,
  });
}

class Pharmacy {
  final String id;
  final String name;
  final String locationName;
  final List<double> coordinates; // [lat, long]
  final List<String> supportedInsurances;
  final bool isOpen;
  final String imageUrl;
  final double rating;
  final String deliveryTime;

  Pharmacy({
    required this.id,
    required this.name,
    required this.locationName,
    required this.coordinates,
    required this.supportedInsurances,
    this.isOpen = true,
    this.imageUrl = 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?q=80&w=2938&auto=format&fit=crop', // Default image
    this.rating = 4.5,
    this.deliveryTime = '30-45 min',
  });
}

class Driver {
  final String id;
  final String name;
  final String phoneNumber;
  final List<double> currentCoordinates; // [lat, long]
  final bool isAvailable;

  Driver({
    required this.id,
    required this.name,
    required this.phoneNumber,
    required this.currentCoordinates,
    this.isAvailable = true,
  });
}

class Pharmacist {
  final String id;
  final String name;
  final String specialty;
  final String imageUrl;
  final double rating;
  final int yearsExperience;

  Pharmacist({
    required this.id,
    required this.name,
    required this.specialty,
    required this.imageUrl,
    this.rating = 4.8,
    this.yearsExperience = 5,
  });
}
