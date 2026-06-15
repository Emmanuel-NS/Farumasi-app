import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/repositories/auth_repository.dart';
import '../services/pin_service.dart';

/// Matches Next.js `PinGate` — passcode lock for orders / prescriptions.
class PinGate extends StatefulWidget {
  const PinGate({
    super.key,
    required this.feature,
    required this.child,
  });

  final String feature;
  final Widget child;

  @override
  State<PinGate> createState() => _PinGateState();
}

class _PinGateState extends State<PinGate> {
  final _controller = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    PinService.instance.hydrate();
    PinService.instance.addListener(_onPinChanged);
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    PinService.instance.removeListener(_onPinChanged);
    _controller.dispose();
    super.dispose();
  }

  void _onPinChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _submit() async {
    final pin = _controller.text;
    if (pin.length < 4 || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final ok = await PinService.instance.verifyPin(pin);
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      setState(() {
        _error = 'Incorrect passcode';
        _controller.clear();
      });
    }
  }

  Future<void> _showForgotPinDialog() async {
    final user = await AuthRepository().loadCachedUser();
    if (!mounted) return;
    final accountEmail = user?.email?.trim();
    if (accountEmail == null || accountEmail.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sign in again, then reset your passcode from Settings → Security.'),
        ),
      );
      return;
    }
    final loginEmail = accountEmail;

    final passwordController = TextEditingController();
    final newPinController = TextEditingController();
    final confirmController = TextEditingController();
    String? dialogError;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Reset passcode'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Confirm your account password, then choose a new 4–8 digit passcode.',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Account password',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: newPinController,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  maxLength: 8,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'New passcode',
                    counterText: '',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: confirmController,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  maxLength: 8,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'Confirm passcode',
                    counterText: '',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (dialogError != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    dialogError!,
                    style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                final password = passwordController.text;
                final newPin = newPinController.text;
                final confirm = confirmController.text;
                if (password.isEmpty) {
                  setDialogState(() => dialogError = 'Enter your account password');
                  return;
                }
                if (newPin.length < 4 || newPin.length > 8) {
                  setDialogState(() => dialogError = 'Passcode must be 4–8 digits');
                  return;
                }
                if (newPin != confirm) {
                  setDialogState(() => dialogError = 'Passcodes do not match');
                  return;
                }
                try {
                  await AuthRepository().login(
                    emailOrPhone: loginEmail,
                    password: password,
                  );
                  await PinService.instance.setPin(newPin);
                  if (ctx.mounted) Navigator.pop(ctx);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Passcode updated')),
                    );
                  }
                } catch (_) {
                  setDialogState(() => dialogError = 'Incorrect password. Try again.');
                }
              },
              child: const Text('Save new passcode'),
            ),
          ],
        ),
      ),
    );

    passwordController.dispose();
    newPinController.dispose();
    confirmController.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: PinService.instance,
      builder: (context, _) {
        final pin = PinService.instance;
        if (!pin.isHydrated) {
          return const Center(
            child: CircularProgressIndicator(color: Color(0xFF1E9E68)),
          );
        }
        if (!pin.hasPin || !pin.isLocked) {
          return widget.child;
        }

        return Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEDFDF6),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: const Icon(
                        Icons.verified_user_outlined,
                        color: Color(0xFF1E9E68),
                        size: 28,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Enter passcode',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your ${widget.feature} is protected. Enter your 4–8 digit passcode to continue.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _controller,
                      obscureText: true,
                      keyboardType: TextInputType.number,
                      maxLength: 8,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 6,
                      ),
                      decoration: InputDecoration(
                        counterText: '',
                        hintText: '••••',
                        prefixIcon: const Icon(Icons.lock_outline, size: 18),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(
                            color: Color(0xFF1E9E68),
                            width: 2,
                          ),
                        ),
                      ),
                      onChanged: (_) {
                        if (_error != null) setState(() => _error = null);
                      },
                      onSubmitted: (_) => _submit(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: Color(0xFFDC2626),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed:
                            _controller.text.length >= 4 && !_busy ? _submit : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E9E68),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: Text(_busy ? 'Verifying…' : 'Unlock'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _showForgotPinDialog,
                      child: const Text(
                        'Forgot passcode?',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
