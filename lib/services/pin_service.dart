import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Matches patient portal `pin-store.ts` — per-user passcode for orders/Rx.
class PinService extends ChangeNotifier {
  PinService._();
  static final PinService instance = PinService._();

  static const _pinsKey = 'farumasi_pins_by_user';
  static const _activeUserKey = 'farumasi_pin_active_user';
  static const _lockedKey = 'farumasi_pin_locked';

  Map<String, String> _pinsByUser = {};
  String? _activeUserId;
  bool _isLocked = true;
  bool _isHydrated = false;

  bool get isHydrated => _isHydrated;
  bool get isLocked => _isLocked;
  String? get pinHash =>
      _activeUserId != null ? _pinsByUser[_activeUserId] : null;
  bool get hasPin => pinHash != null;

  Future<void> hydrate() async {
    if (_isHydrated) return;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_pinsKey);
    if (raw != null) {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      _pinsByUser = decoded.map((k, v) => MapEntry(k, v as String));
    }
    _activeUserId = prefs.getString(_activeUserKey);
    final hash = _activeUserId != null ? _pinsByUser[_activeUserId] : null;
    _isLocked = hash != null ? (prefs.getBool(_lockedKey) ?? true) : false;
    _isHydrated = true;
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_pinsKey, jsonEncode(_pinsByUser));
    if (_activeUserId != null) {
      await prefs.setString(_activeUserKey, _activeUserId!);
    } else {
      await prefs.remove(_activeUserKey);
    }
    await prefs.setBool(_lockedKey, _isLocked);
  }

  String _hash(String pin) {
    return sha256.convert(utf8.encode(pin)).toString();
  }

  void setActiveUser(String? userId) {
    _activeUserId = userId;
    final hash = userId != null ? _pinsByUser[userId] : null;
    _isLocked = hash != null;
    notifyListeners();
    _persist();
  }

  Future<void> setPin(String pin) async {
    if (_activeUserId == null) return;
    final hash = _hash(pin);
    _pinsByUser = {..._pinsByUser, _activeUserId!: hash};
    _isLocked = false;
    notifyListeners();
    await _persist();
  }

  Future<bool> changePin(String currentPin, String newPin) async {
    if (_activeUserId == null || pinHash == null) return false;
    if (_hash(currentPin) != pinHash) return false;
    await setPin(newPin);
    return true;
  }

  Future<bool> verifyPin(String pin) async {
    if (pinHash == null) return true;
    if (_hash(pin) != pinHash) return false;
    _isLocked = false;
    notifyListeners();
    await _persist();
    return true;
  }

  Future<bool> clearPin(String pin) async {
    if (_activeUserId == null || pinHash == null) return false;
    if (_hash(pin) != pinHash) return false;
    final next = Map<String, String>.from(_pinsByUser);
    next.remove(_activeUserId);
    _pinsByUser = next;
    _isLocked = false;
    notifyListeners();
    await _persist();
    return true;
  }

  void lock() {
    if (pinHash == null) return;
    _isLocked = true;
    notifyListeners();
    _persist();
  }

  void unlock() {
    _isLocked = false;
    notifyListeners();
    _persist();
  }
}
