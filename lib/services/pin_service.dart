import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/repositories/patient_repository.dart';

/// Per-user passcode — local cache + server sync (matches patient portal).
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
  bool _serverPinOnly = false;

  bool get isHydrated => _isHydrated;
  bool get isLocked => _isLocked;
  bool get serverPinOnly => _serverPinOnly;
  String? get pinHash =>
      _activeUserId != null ? _pinsByUser[_activeUserId] : null;
  bool get hasPin => pinHash != null || _serverPinOnly;

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
    if (userId == null) {
      _serverPinOnly = false;
      _isLocked = false;
    } else {
      final hash = _pinsByUser[userId];
      _isLocked = hash != null || _serverPinOnly;
    }
    notifyListeners();
    _persist();
  }

  /// Pull `has_pin` from API after login — locks app if PIN exists only on server.
  Future<void> syncFromServer() async {
    if (_activeUserId == null) return;
    try {
      final profile = await PatientRepository.instance.fetchMyProfile();
      if (profile.hasPin && !_pinsByUser.containsKey(_activeUserId)) {
        _serverPinOnly = true;
        _isLocked = true;
      } else if (!profile.hasPin) {
        _serverPinOnly = false;
        final next = Map<String, String>.from(_pinsByUser);
        next.remove(_activeUserId);
        _pinsByUser = next;
        _isLocked = false;
      } else {
        _serverPinOnly = false;
        _isLocked = pinHash != null;
      }
      notifyListeners();
      await _persist();
    } catch (_) {
      /* offline — keep local state */
    }
  }

  Future<void> setPin(String pin) async {
    if (_activeUserId == null) return;
    try {
      await PatientRepository.instance.setServerPin(pin);
    } catch (_) {
      /* still cache locally if offline */
    }
    final hash = _hash(pin);
    _pinsByUser = {..._pinsByUser, _activeUserId!: hash};
    _serverPinOnly = false;
    _isLocked = false;
    notifyListeners();
    await _persist();
  }

  Future<bool> changePin(String currentPin, String newPin) async {
    if (_activeUserId == null) return false;
    if (!_serverPinOnly && pinHash != null && _hash(currentPin) != pinHash) {
      return false;
    }
    if (_serverPinOnly) {
      final ok = await PatientRepository.instance.verifyServerPin(currentPin);
      if (!ok) return false;
    }
    try {
      await PatientRepository.instance.changeServerPin(currentPin, newPin);
    } on DioException {
      return false;
    } catch (_) {
      return false;
    }
    await setPin(newPin);
    return true;
  }

  Future<bool> verifyPin(String pin) async {
    if (_serverPinOnly || (_activeUserId != null && pinHash == null && hasPin)) {
      final ok = await PatientRepository.instance.verifyServerPin(pin);
      if (ok && _activeUserId != null) {
        _pinsByUser = {..._pinsByUser, _activeUserId!: _hash(pin)};
        _serverPinOnly = false;
        _isLocked = false;
        notifyListeners();
        await _persist();
      }
      return ok;
    }
    if (pinHash == null) return true;
    if (_hash(pin) != pinHash) {
      // Local mismatch — try server (PIN may have changed on web)
      try {
        final ok = await PatientRepository.instance.verifyServerPin(pin);
        if (ok && _activeUserId != null) {
          _pinsByUser = {..._pinsByUser, _activeUserId!: _hash(pin)};
          _isLocked = false;
          notifyListeners();
          await _persist();
          return true;
        }
      } catch (_) {}
      return false;
    }
    _isLocked = false;
    notifyListeners();
    await _persist();
    return true;
  }

  Future<bool> clearPin(String pin) async {
    if (_activeUserId == null) return false;
    if (_serverPinOnly || pinHash == null) {
      try {
        await PatientRepository.instance.clearServerPin(pin);
      } on DioException {
        return false;
      }
    } else {
      if (_hash(pin) != pinHash) return false;
      try {
        await PatientRepository.instance.clearServerPin(pin);
      } on DioException {
        return false;
      }
    }
    final next = Map<String, String>.from(_pinsByUser);
    next.remove(_activeUserId);
    _pinsByUser = next;
    _serverPinOnly = false;
    _isLocked = false;
    notifyListeners();
    await _persist();
    return true;
  }

  void lock() {
    if (!hasPin) return;
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
