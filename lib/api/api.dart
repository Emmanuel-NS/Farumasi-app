/// FARUMASI API Service Layer
///
/// Architecture:
///   FarumasiApiClient  — Dio HTTP client with JWT + refresh interceptors
///   AuthRepository     — Login, register, token management
///   MedicineRepository — Medicine catalog + search
///   OrderRepository    — Order lifecycle
///   PrescriptionRepository — Prescription upload + status
///   PharmacyRepository     — Pharmacy search + recommendations
///
/// State management: Riverpod (see providers/)
/// Token storage: flutter_secure_storage

library farumasi_api;

export 'api_client.dart';
export 'repositories/auth_repository.dart';
export 'repositories/medicine_repository.dart';
export 'repositories/order_repository.dart';
export 'repositories/prescription_repository.dart';
export 'repositories/patient_repository.dart';
export 'repositories/pharmacy_repository.dart';
