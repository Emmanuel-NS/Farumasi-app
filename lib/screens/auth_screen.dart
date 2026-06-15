import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/router.dart';
import '../providers/auth_provider.dart';
import '../services/google_auth_service.dart';
import '../widgets/complete_profile_sheet.dart';
import 'data_privacy_screen.dart';
import 'forgot_password_screen.dart';
import 'terms_conditions_screen.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  bool _isLogin = true;
  String _selectedRole = 'User';
  bool _showPassword = false;
  bool _agreedToTerms = false;

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _awaitingOtp = false;
  final _otpController = TextEditingController();

  static const _green = Color(0xFF1E9E68);
  static const _greenDark = Color(0xFF167B51);

  @override
  void initState() {
    super.initState();
    if (kDebugMode) {
      _emailController.text = 'patient@farumasi.com';
      _passwordController.text = 'Patient@12345';
      _agreedToTerms = true;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _completeAuth() {
    final authState = ref.read(authProvider);
    if (authState.status != AuthStatus.authenticated) return;

    // When opened via Navigator.push (cart, store, etc.) — pop back to caller.
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop(true);
      return;
    }

    final role = authState.user?.role;
    context.go(
      role == 'RIDER' ? AppRoutes.riderDashboard : AppRoutes.home,
    );
  }

  Future<void> _submit() async {
    if (!_agreedToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Please accept the Terms of Service and Privacy Policy to continue.',
          ),
          backgroundColor: Color(0xFF92400E),
        ),
      );
      return;
    }
    if (!_formKey.currentState!.validate()) return;

    if (_isLogin) {
      await ref.read(authProvider.notifier).login(
            emailOrPhone: _emailController.text.trim(),
            password: _passwordController.text,
          );
    } else {
      final pending = await ref.read(authProvider.notifier).register(
            name: _nameController.text.trim(),
            email: _emailController.text.trim(),
            phone: _phoneController.text.trim().isEmpty
                ? null
                : _phoneController.text.trim(),
            password: _passwordController.text,
            role: _selectedRole == 'Rider' ? 'RIDER' : 'PATIENT',
          );
      if (!mounted) return;
      if (pending != null) {
        setState(() => _awaitingOtp = true);
        return;
      }
    }

    if (!mounted) return;
    final authState = ref.read(authProvider);
    if (authState.status == AuthStatus.authenticated) {
      _completeAuth();
      return;
    }
    if (authState.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authState.error!),
          backgroundColor: Colors.red.shade800,
        ),
      );
    }
  }

  Future<void> _verifyOtp() async {
    final code = _otpController.text.trim();
    if (code.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter the verification code')),
      );
      return;
    }
    final ok = await ref.read(authProvider.notifier).verifyRegistration(code);
    if (!mounted) return;
    if (ok) {
      setState(() => _awaitingOtp = false);
      _completeAuth();
      return;
    }
    final err = ref.read(authProvider).error;
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: Colors.red.shade800),
      );
    }
  }

  Future<void> _signInWithGoogle() async {
    if (!_agreedToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please accept the Terms of Service and Privacy Policy first.'),
        ),
      );
      return;
    }
    try {
      final account = await GoogleAuthService.signIn();
      if (account == null) return;

      final email = account.email.trim();
      if (email.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Google account has no email address.')),
        );
        return;
      }

      final name = account.displayName?.trim().isNotEmpty == true
          ? account.displayName!.trim()
          : email.split('@').first;

      await ref.read(authProvider.notifier).signInWithGoogle(
            email: email,
            fullName: name,
            googleId: account.id,
          );
      if (!mounted) return;
      if (ref.read(authProvider).status == AuthStatus.authenticated) {
        final authUser = ref.read(authProvider).user;
        if (authUser != null) {
          final profileOk = await showCompleteProfileSheet(context, user: authUser);
          if (!mounted || !profileOk) return;
        }
        _completeAuth();
        return;
      }
      final err = ref.read(authProvider).error;
      if (err != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: Colors.red.shade800),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Google sign-in failed: $e')),
      );
    }
  }

  void _openForgotPassword() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
    );
  }

  bool _isValidLoginIdentifier(String? v) {
    if (v == null || v.trim().isEmpty) return false;
    if (v.contains('@')) return v.contains('.');
    return RegExp(r'\d{9,}').hasMatch(v.replaceAll(RegExp(r'\D'), ''));
  }

  void _switchRole(String role) {
    setState(() {
      _selectedRole = role;
      if (kDebugMode) {
        if (role == 'Rider') {
          _emailController.text = 'rider@farumasi.com';
          _passwordController.text = 'Rider@12345';
        } else {
          _emailController.text = 'patient@farumasi.com';
          _passwordController.text = 'Patient@12345';
        }
      }
    });
  }

  InputDecoration _fieldDecoration({
    required String hint,
    required IconData icon,
    Widget? suffix,
  }) {
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

  Widget _brandPanel() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_green, _greenDark, Color(0xFF0F5132)],
        ),
      ),
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const FarumasiLogo(size: 24, onDark: true),
              ),
              const SizedBox(width: 12),
              const Text(
                'FARUMASI',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 20,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const Spacer(),
          const Text(
            'Healthcare at\nyour fingertips.',
            style: TextStyle(
              color: Colors.white,
              fontSize: 34,
              fontWeight: FontWeight.w900,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Order medicines, upload prescriptions, and track deliveries — all in one place across Rwanda.',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.75),
              fontSize: 15,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          ...[
            'Browse approved medicines',
            'Upload & manage prescriptions',
            'Real-time order tracking',
          ].map(
            (f) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check, color: Colors.white, size: 14),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      f,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 14,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Spacer(),
          Text(
            '© ${DateTime.now().year} Farumasi Ltd · Kigali, Rwanda',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.4),
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  Widget _formPanel({required bool wide}) {
    final loading = ref.watch(authProvider.select((s) => s.isLoading));

    return SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(
            horizontal: wide ? 48 : 24,
            vertical: 24,
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (!wide) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: _green,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const FarumasiLogo(size: 22, onDark: true),
                        ),
                        const SizedBox(width: 10),
                        const Text(
                          'FARUMASI',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            color: _green,
                            fontSize: 18,
                            letterSpacing: 1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),
                  ],
                  Text(
                    _awaitingOtp
                        ? 'Verify your account'
                        : (_isLogin ? 'Welcome back' : 'Create your account'),
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _awaitingOtp
                        ? 'Enter the code sent to your email or phone'
                        : (_isLogin
                            ? 'Sign in with email or phone number'
                            : "Join Farumasi — it's free"),
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        _tabChip('Sign In', _isLogin, () => setState(() => _isLogin = true)),
                        _tabChip('Register', !_isLogin, () => setState(() => _isLogin = false)),
                      ],
                    ),
                  ),
                  if (!_isLogin) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          _roleChip('Patient', _selectedRole == 'User'),
                          _roleChip('Rider', _selectedRole == 'Rider'),
                        ],
                      ),
                    ),
                  ],
                  if (_awaitingOtp) ...[
                    TextFormField(
                      controller: _otpController,
                      keyboardType: TextInputType.number,
                      decoration: _fieldDecoration(
                        hint: 'Verification code',
                        icon: Icons.verified_outlined,
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        onPressed: loading ? null : _verifyOtp,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _green,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: const Text('Verify & Continue',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    TextButton(
                      onPressed: loading
                          ? null
                          : () => ref.read(authProvider.notifier).resendRegistrationOtp(),
                      child: const Text('Resend code'),
                    ),
                    TextButton(
                      onPressed: () => setState(() => _awaitingOtp = false),
                      child: const Text('Back'),
                    ),
                  ] else ...[
                  if (!_isLogin) ...[
                    TextFormField(
                      controller: _nameController,
                      decoration: _fieldDecoration(
                        hint: 'Full name',
                        icon: Icons.person_outline,
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Enter your name' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: _fieldDecoration(
                        hint: 'Phone (optional)',
                        icon: Icons.phone_outlined,
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(
                    controller: _emailController,
                    keyboardType: _isLogin ? TextInputType.text : TextInputType.emailAddress,
                    decoration: _fieldDecoration(
                      hint: _isLogin ? 'Email or phone number' : 'Email address',
                      icon: _isLogin ? Icons.alternate_email : Icons.email_outlined,
                    ),
                    validator: (v) {
                      if (_isLogin) {
                        return _isValidLoginIdentifier(v)
                            ? null
                            : 'Enter a valid email or phone';
                      }
                      return (v == null || v.trim().isEmpty) ? 'Enter your email' : null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: !_showPassword,
                    decoration: _fieldDecoration(
                      hint: 'Password',
                      icon: Icons.lock_outline,
                      suffix: IconButton(
                        icon: Icon(
                          _showPassword ? Icons.visibility_off : Icons.visibility,
                          color: const Color(0xFF94A3B8),
                        ),
                        onPressed: () => setState(() => _showPassword = !_showPassword),
                      ),
                    ),
                    validator: (v) =>
                        (v == null || v.length < 8) ? 'Min 8 characters' : null,
                  ),
                  if (!_isLogin) ...[
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _confirmPasswordController,
                      obscureText: !_showPassword,
                      decoration: _fieldDecoration(
                        hint: 'Confirm password',
                        icon: Icons.lock_outline,
                      ),
                      validator: (v) {
                        if (v != _passwordController.text) {
                          return 'Passwords do not match';
                        }
                        return null;
                      },
                    ),
                  ],
                  const SizedBox(height: 16),
                  _termsCheckbox(),
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: (loading || !_agreedToTerms) ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _green,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: _green.withValues(alpha: 0.45),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
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
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  _isLogin ? 'Sign In' : 'Create Account',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(Icons.arrow_forward, size: 18),
                              ],
                            ),
                    ),
                  ),
                  if (_isLogin) ...[
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: loading ? null : _openForgotPassword,
                        child: const Text(
                          'Forgot password?',
                          style: TextStyle(
                            color: _green,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                  ],
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: loading ? null : _signInWithGoogle,
                    icon: Image.network(
                      'https://www.google.com/favicon.ico',
                      width: 18,
                      height: 18,
                      errorBuilder: (_, __, ___) =>
                          const Icon(Icons.g_mobiledata, size: 22),
                    ),
                    label: const Text('Continue with Google'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF475569),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ],
                  const Divider(height: 32),
                  OutlinedButton.icon(
                    onPressed: () {
                      if (Navigator.canPop(context)) {
                        Navigator.pop(context);
                      } else {
                        context.go(AppRoutes.home);
                      }
                    },
                    icon: const Icon(Icons.storefront_outlined, size: 18),
                    label: const Text('Browse store without an account'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF475569),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _tabChip(String label, bool selected, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 14,
              color: selected ? _green : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }

  Widget _roleChip(String label, bool selected) {
    final isPatient = label == 'Patient';
    return Expanded(
      child: GestureDetector(
        onTap: () => _switchRole(isPatient ? 'User' : 'Rider'),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? _green : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 12,
              color: selected ? Colors.white : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }

  Widget _termsCheckbox() {
    return InkWell(
      onTap: () => setState(() => _agreedToTerms = !_agreedToTerms),
      borderRadius: BorderRadius.circular(8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 24,
            height: 24,
            child: Checkbox(
              value: _agreedToTerms,
              activeColor: _green,
              onChanged: (v) => setState(() => _agreedToTerms = v ?? false),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  'I agree to the ',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const TermsConditionsScreen()),
                  ),
                  child: const Text(
                    'Terms of Service',
                    style: TextStyle(
                      color: _green,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
                Text(
                  ' and ',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const DataPrivacyScreen()),
                  ),
                  child: const Text(
                    'Privacy Policy',
                    style: TextStyle(
                      color: _green,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.status != AuthStatus.authenticated) return;
      if (previous?.status == AuthStatus.authenticated) return;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _completeAuth();
      });
    });

    final wide = MediaQuery.sizeOf(context).width >= 900;

    return Scaffold(
      backgroundColor: Colors.white,
      body: wide
          ? Row(
              children: [
                Expanded(flex: 45, child: _brandPanel()),
                Expanded(flex: 55, child: _formPanel(wide: true)),
              ],
            )
          : _formPanel(wide: false),
    );
  }
}

class FarumasiLogo extends StatelessWidget {
  const FarumasiLogo({
    super.key,
    required this.size,
    this.color = const Color(0xFF1E9E68),
    this.onDark = false,
  });

  final double size;
  final Color color;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.15),
      decoration: BoxDecoration(
        color: onDark ? Colors.white : Colors.transparent,
        shape: BoxShape.circle,
      ),
      child: CustomPaint(
        painter: _LeafyFPainter(color: onDark ? const Color(0xFF1E9E68) : color),
      ),
    );
  }
}

class _LeafyFPainter extends CustomPainter {
  _LeafyFPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.08
      ..strokeCap = StrokeCap.round;

    final arcPath = Path()
      ..addArc(Rect.fromLTWH(0, 0, w, h), 0.8, 5.0);
    canvas.drawPath(arcPath, strokePaint);

    final topWing = Path()
      ..moveTo(w * 0.28, h * 0.55)
      ..quadraticBezierTo(w * 0.20, h * 0.20, w * 0.85, h * 0.22)
      ..quadraticBezierTo(w * 0.55, h * 0.35, w * 0.45, h * 0.45)
      ..close();
    canvas.drawPath(topWing, fillPaint);

    final bottomWing = Path()
      ..moveTo(w * 0.32, h * 0.65)
      ..quadraticBezierTo(w * 0.45, h * 0.50, w * 0.80, h * 0.50)
      ..quadraticBezierTo(w * 0.60, h * 0.60, w * 0.40, h * 0.70)
      ..close();
    canvas.drawPath(bottomWing, fillPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
