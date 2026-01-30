import 'package:flutter/foundation.dart';
import '../models/models.dart';

class StateService extends ChangeNotifier {
  static final StateService _instance = StateService._internal();
  factory StateService() => _instance;
  StateService._internal();

  // Auth State
  bool _isLoggedIn = false;
  String? _userEmail;
  String? _userName;
  
  bool get isLoggedIn => _isLoggedIn;
  String? get userEmail => _userEmail;
  String? get userName => _userName;

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
    var existingIndex = _cartItems.indexWhere((item) => item.medicine.id == medicine.id);
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

  void clearCart() {
    _cartItems.clear();
    notifyListeners();
  }

  double get totalAmount {
    return _cartItems.fold(0.0, (sum, item) => sum + item.total);
  }
}
