import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  static const _green = Color(0xFF1E9E68);

  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  int _step = 0;
  bool _showPassword = false;
  String? _infoMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    final email = _emailController.text.trim();
    if (!email.contains('@')) {
      _showSnack('Enter a valid email address');
      return;
    }
    final message = await ref.read(authProvider.notifier).forgotPassword(email);
    if (!mounted) return;
    if (message != null) {
      setState(() {
        _step = 1;
        _infoMessage = message;
      });
      return;
    }
    final err = ref.read(authProvider).error;
    if (err != null) _showSnack(err);
  }

  Future<void> _pasteCode() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final digits = (data?.text ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.length >= 6) {
      setState(() => _codeController.text = digits.substring(0, 6));
    } else {
      _showSnack('Clipboard does not contain a 6-digit code');
    }
  }

  Future<void> _resetPassword() async {
    final code = _codeController.text.trim();
    if (code.length < 4) {
      _showSnack('Enter the verification code from your email');
      return;
    }
    if (_passwordController.text.length < 8) {
      _showSnack('Password must be at least 8 characters');
      return;
    }
    if (_passwordController.text != _confirmController.text) {
      _showSnack('Passwords do not match');
      return;
    }

    final message = await ref.read(authProvider.notifier).resetPassword(
          email: _emailController.text.trim(),
          code: code,
          newPassword: _passwordController.text,
        );
    if (!mounted) return;
    if (message != null) {
      _showSnack(message, success: true);
      Navigator.of(context).pop();
      return;
    }
    final err = ref.read(authProvider).error;
    if (err != null) _showSnack(err);
  }

  void _showSnack(String message, {bool success = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: success ? _green : Colors.red.shade800,
      ),
    );
  }

  InputDecoration _field(String hint, IconData icon, {Widget? suffix}) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon, color: const Color(0xFF94A3B8), size: 20),
      suffixIcon: suffix,
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: _green, width: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider.select((s) => s.isLoading));

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
        title: Text(_step == 0 ? 'Forgot password' : 'Reset password'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                _step == 0
                    ? 'We will email you a reset code'
                    : 'Enter code and new password',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _step == 0
                    ? 'Use the email linked to your FARUMASI account.'
                    : 'Check your inbox for a 6-digit code, then choose a new password.',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
              ),
              if (_infoMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Text(
                    _infoMessage!,
                    style: const TextStyle(
                      color: Color(0xFF166534),
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              if (_step == 0) ...[
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  decoration: _field('Email address', Icons.mail_outline),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: loading ? null : _requestCode,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _green,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Send reset code',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ] else ...[
                TextField(
                  controller: _emailController,
                  readOnly: true,
                  decoration: _field('Email', Icons.mail_outline),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 6,
                  ),
                  decoration: _field('6-digit code', Icons.verified_outlined)
                      .copyWith(counterText: ''),
                ),
                TextButton(
                  onPressed: _pasteCode,
                  child: const Text('Paste code from clipboard'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _passwordController,
                  obscureText: !_showPassword,
                  decoration: _field(
                    'New password',
                    Icons.lock_outline,
                    suffix: IconButton(
                      icon: Icon(
                        _showPassword ? Icons.visibility_off : Icons.visibility,
                        color: const Color(0xFF94A3B8),
                      ),
                      onPressed: () =>
                          setState(() => _showPassword = !_showPassword),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _confirmController,
                  obscureText: !_showPassword,
                  decoration: _field('Confirm password', Icons.lock_outline),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: loading ? null : _resetPassword,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _green,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Update password',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
                TextButton(
                  onPressed: loading
                      ? null
                      : () => setState(() {
                            _step = 0;
                            _infoMessage = null;
                          }),
                  child: const Text('Request a new code'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
