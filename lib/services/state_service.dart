import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../models/models.dart';

class StateService extends ChangeNotifier {
  static final StateService _instance = StateService._internal();
  factory StateService() => _instance;
  StateService._internal();

  // Auth State
  bool _isLoggedIn = false;
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

  void addToCart(Medicine medicine, int quantity) {
    var existingIndex = _cartItems.indexWhere(
      (item) => item.medicine.id == medicine.id,
    );
    if (existingIndex >= 0) {
      _cartItems[existingIndex].quantity += quantity;
    } else {
      _cartItems.add(CartItem(medicine: medicine, quantity: quantity));
    }
    notifyListeners();
  }

  void removeFromCart(String medicineId) {
    _cartItems.removeWhere((item) => item.medicine.id == medicineId);
    notifyListeners();
  }

  void decrementQuantity(String medicineId) {
    var existingIndex = _cartItems.indexWhere(
      (item) => item.medicine.id == medicineId,
    );
    if (existingIndex >= 0) {
      if (_cartItems[existingIndex].quantity > 1) {
        _cartItems[existingIndex].quantity--;
      } else {
        _cartItems.removeAt(existingIndex);
      }
      notifyListeners();
    }
  }

  void incrementQuantity(String medicineId) {
    var existingIndex = _cartItems.indexWhere(
      (item) => item.medicine.id == medicineId,
    );
    if (existingIndex >= 0) {
      _cartItems[existingIndex].quantity++;
      notifyListeners();
    }
  }

  void clearCart() {
    _cartItems.clear();
    notifyListeners();
  }

  double get totalAmount {
    return _cartItems.fold(0.0, (sum, item) => sum + item.total);
  }
}
