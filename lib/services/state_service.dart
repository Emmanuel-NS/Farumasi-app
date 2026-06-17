import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../core/sell_mode.dart';
import '../models/models.dart';

class StateService extends ChangeNotifier {
  static final StateService _instance = StateService._internal();
  factory StateService() => _instance;
  StateService._internal();

  // Consult State — which thread is open in the UI (skip popup only for that thread).
  String? activeOpenConsultId;

  void setActiveOpenConsultId(String? consultId) {
    if (activeOpenConsultId == consultId) return;
    activeOpenConsultId = consultId;
  }

  // Search State
  String _searchQuery = '';
  String get searchQuery => _searchQuery;
  
  // Callback to trigger filter modal from different screens
  VoidCallback? onShowFilterModal;

  /// Home shell: switch tab (0=store, 4=prescriptions, 5=settings, etc.)
  int? pendingHomeTabIndex;
  bool _openPrescriptionUploadTab = false;

  void requestHomeTab(int index, {bool prescriptionUpload = false}) {
    pendingHomeTabIndex = index;
    if (prescriptionUpload) _openPrescriptionUploadTab = true;
    notifyListeners();
  }

  int? consumePendingHomeTab() {
    final tab = pendingHomeTabIndex;
    pendingHomeTabIndex = null;
    return tab;
  }

  bool consumePrescriptionUploadTab() {
    final v = _openPrescriptionUploadTab;
    _openPrescriptionUploadTab = false;
    return v;
  }

  String? pendingConsultPharmacistId;
  String? pendingConsultId;
  bool pendingConsultAnonymous = false;

  void requestConsultOpen({
    required String pharmacistId,
    String? consultId,
    bool anonymous = false,
  }) {
    pendingConsultPharmacistId = pharmacistId;
    pendingConsultId = consultId;
    pendingConsultAnonymous = anonymous;
    requestHomeTab(2);
  }

  ({String pharmacistId, String? consultId, bool anonymous})? consumePendingConsultOpen() {
    final pharmacistId = pendingConsultPharmacistId;
    if (pharmacistId == null) return null;
    final req = (
      pharmacistId: pharmacistId,
      consultId: pendingConsultId,
      anonymous: pendingConsultAnonymous,
    );
    pendingConsultPharmacistId = null;
    pendingConsultId = null;
    pendingConsultAnonymous = false;
    return req;
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void showFilterModal() {
    if (onShowFilterModal != null) {
      onShowFilterModal!();
    }
  }

  // Auth State
  bool _isLoggedIn = false;
  
  // Bookings
  final List<PharmacistBooking> _bookings = [];
  List<PharmacistBooking> get bookings => _bookings;

  void addBooking(PharmacistBooking booking) {
    _bookings.add(booking);
    notifyListeners();
  }

  void cancelBooking(String id) {
    _bookings.removeWhere((b) => b.id == id);
    notifyListeners();
  }
  String? _userEmail;
  String? _userName;

  // Location State
  String? _userAddress;
  String? _userCoordinates;

  bool get isLoggedIn => _isLoggedIn;
  String? get userEmail => _userEmail;
  String? get userName => _userName;
  String? get userAddress => _userAddress;
  String? get userCoordinates => _userCoordinates;

  void setLocation(String address, String coordinates) {
    _userAddress = address;
    _userCoordinates = coordinates;
    notifyListeners();
  }

  /// Suggests the user enables location services, requests permissions, 
  /// and updates the state with real GPS coordinates.
  Future<void> fetchRealLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    // Test if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      // Location services are not enabled don't continue
      // accessing the position and request users of the 
      // App to enable the location services.
      return Future.error('Location services are disabled.');
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        // Permissions are denied, next time you could try
        // requesting permissions again (this is also where
        // Android's shouldShowRequestPermissionRationale 
        // returned true. According to Android guidelines
        // your App should show an explanatory UI now.
        return Future.error('Location permissions are denied');
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      // Permissions are denied forever, handle appropriately. 
      return Future.error(
        'Location permissions are permanently denied, we cannot request permissions.');
    } 

    // When we reach here, permissions are granted and we can
    // continue accessing the position of the device.
    Position position = await Geolocator.getCurrentPosition();
    
    // Update state with real coordinates
    // Note: To get address from coordinates, we would need 'geocoding' package.
    // For now, we update coordinates and keep a generic "Current Location" label 
    // or previous address if user didn't type one.
    setLocation(
      _userAddress ?? "Current GPS Location", 
      "${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)}"
    );
  }

  Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  Future<void> openAppSettings() async {
    await Geolocator.openAppSettings();
  }

  void login(String email, {String? name}) {
    _isLoggedIn = true;
    _userEmail = email;
    _userName = name ?? email.split('@')[0];
    notifyListeners();
  }

  void logout() {
    _isLoggedIn = false;
    _userEmail = null;
    _userName = null;
    notifyListeners();
  }

  // Cart State
  final List<CartItem> _cartItems = [];
  List<CartItem> get cartItems => _cartItems;

  void addToCart(
    Medicine medicine,
    int quantity, {
    SellMode sellMode = SellMode.pack,
  }) {
    final key = cartLineKey(medicine.id, sellMode);
    final existingIndex = _cartItems.indexWhere((item) => item.lineKey == key);
    if (existingIndex >= 0) {
      _cartItems[existingIndex].quantity += quantity;
    } else {
      _cartItems.add(
        CartItem(medicine: medicine, quantity: quantity, sellMode: sellMode),
      );
    }
    notifyListeners();
  }

  bool isProductInCart(String productId) {
    return _cartItems.any((item) => item.medicine.id == productId);
  }

  void removeProductLines(String productId) {
    _cartItems.removeWhere((item) => item.medicine.id == productId);
    notifyListeners();
  }

  void removeFromCart(String lineKey) {
    _cartItems.removeWhere((item) => item.lineKey == lineKey);
    notifyListeners();
  }

  void decrementQuantity(String lineKey) {
    final existingIndex = _cartItems.indexWhere((item) => item.lineKey == lineKey);
    if (existingIndex >= 0) {
      if (_cartItems[existingIndex].quantity > 1) {
        _cartItems[existingIndex].quantity--;
      } else {
        _cartItems.removeAt(existingIndex);
      }
      notifyListeners();
    }
  }

  void incrementQuantity(String lineKey) {
    final existingIndex = _cartItems.indexWhere((item) => item.lineKey == lineKey);
    if (existingIndex >= 0) {
      _cartItems[existingIndex].quantity++;
      notifyListeners();
    }
  }

  /// Legacy id-based remove — clears all sell modes for a product.
  void removeFromCartByProductId(String medicineId) {
    removeProductLines(medicineId);
  }

  void decrementQuantityByProductId(String medicineId) {
    final index = _cartItems.indexWhere((i) => i.medicine.id == medicineId);
    if (index >= 0) {
      decrementQuantity(_cartItems[index].lineKey);
    }
  }

  void incrementQuantityByProductId(String medicineId) {
    final existingIndex = _cartItems.indexWhere(
      (item) => item.medicine.id == medicineId,
    );
    if (existingIndex >= 0) {
      incrementQuantity(_cartItems[existingIndex].lineKey);
    }
  }

  void clearCart() {
    _cartItems.clear();
    notifyListeners();
  }

  double get totalAmount {
    return _cartItems.fold(0.0, (sum, item) => sum + item.total);
  }

  double get packSubtotal {
    return _cartItems
        .where((i) => i.sellMode == SellMode.pack)
        .fold(0.0, (sum, item) => sum + item.total);
  }

  double get partialSubtotal {
    return _cartItems
        .where((i) => i.sellMode == SellMode.partial)
        .fold(0.0, (sum, item) => sum + item.total);
  }

  // Pharmacy Preferences
  // Using Set for O(1) lookups
  final Set<String> _preferredPharmacies = {};
  final Set<String> _blockedPharmacies = {};

  bool isPharmacyPreferred(String id) => _preferredPharmacies.contains(id);
  bool isPharmacyBlocked(String id) => _blockedPharmacies.contains(id);

  // Toggle preference: true = preferred, false = remove preference
  void setPharmacyPreferred(String id, bool isPreferred) {
    if (isPreferred) {
      _preferredPharmacies.add(id);
      _blockedPharmacies.remove(id); // Can't be both
    } else {
      _preferredPharmacies.remove(id);
    }
    notifyListeners();
  }

  // Toggle block: true = blocked, false = unblocked (allowed)
  void setPharmacyBlocked(String id, bool isBlocked) {
    if (isBlocked) {
      _blockedPharmacies.add(id);
      _preferredPharmacies.remove(id); // Can't be both
    } else {
      _blockedPharmacies.remove(id);
    }
    notifyListeners();
  }
}
