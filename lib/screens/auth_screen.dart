import 'package:flutter/material.dart';
import '../services/state_service.dart';
import 'pharmacist/pharmacist_dashboard_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;
  String _selectedRole = 'User'; // 'User' or 'Pharmacist'
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Default fill for User
    _emailController.text = 'user@farumasi.rw';
    _passwordController.text = 'password123';
  }

  void _switchRole(String role) {
    setState(() {
      _selectedRole = role;
      if (role == 'Pharmacist') {
        _emailController.text = 'pharmacist@farumasi.rw';
        _passwordController.text = 'admin123';
      } else {
        _emailController.text = 'user@farumasi.rw';
        _passwordController.text = 'password123';
      }
    });
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      // 1. Check for Pharmacist Credentials based on Role
      if (_selectedRole == 'Pharmacist') {
         // Simple validation for demo
         if (_emailController.text == 'pharmacist@farumasi.rw' && _passwordController.text == 'admin123') {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (context) => const PharmacistDashboardScreen()),
            );
            return;
         } else {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invalid Pharmacist Credentials')));
            return;
         }
      }

      // 2. Regular User Login
      StateService().login(
        _emailController.text,
        name: _isLogin ? null : _nameController.text,
      );
      Navigator.pop(context); // Go back to existing screen (Home) or replace if it was the initial route
      // If AuthScreen was pushed on top of Home, pop is fine. 
      // If Home checks auth state, it will update.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.green.shade800, Colors.green.shade400],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 450),
                child: Card(
                  elevation: 8,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              FarumasiLogo(size: 60, color: Colors.green),
                              SizedBox(width: 12),
                              // Flexible allows text to wrap if screen is very narrow
                              Flexible(
                                child: Text(
                                  "FARUMASI",
                                  style: TextStyle(
                                    fontSize: 32,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.green.shade800,
                                    letterSpacing: 1.2,
                                  ),
                                  overflow: TextOverflow.fade,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () => _switchRole('User'),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      decoration: BoxDecoration(
                                        color: _selectedRole == 'User' ? Colors.green : Colors.transparent,
                                        borderRadius: BorderRadius.circular(8),
                                        boxShadow: _selectedRole == 'User' 
                                          ? [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))]
                                          : [],
                                      ),
                                      child: Text(
                                        "User",
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: _selectedRole == 'User' ? Colors.white : Colors.grey.shade600,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () => _switchRole('Pharmacist'),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      decoration: BoxDecoration(
                                        color: _selectedRole == 'Pharmacist' ? Colors.green : Colors.transparent,
                                        borderRadius: BorderRadius.circular(8),
                                        boxShadow: _selectedRole == 'Pharmacist' 
                                          ? [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))]
                                          : [],
                                      ),
                                      child: Text(
                                        "Pharmacist",
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: _selectedRole == 'Pharmacist' ? Colors.white : Colors.grey.shade600,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _isLogin ? 'Welcome Back!' : 'Join Farumasi',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.green.shade800,
                            ),
                          ),
                          SizedBox(height: 24),
                          if (!_isLogin) ...[
                            TextFormField(
                              controller: _nameController,
                              decoration: InputDecoration(
                                labelText: 'Full Name',
                                prefixIcon: Icon(
                                  Icons.person,
                                  color: Colors.green,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: Colors.green,
                                    width: 2,
                                  ),
                                ),
                              ),
                              validator: (value) => value!.isEmpty
                                  ? 'Please enter your name'
                                  : null,
                            ),
                            SizedBox(height: 16),
                          ],
                          TextFormField(
                            controller: _emailController,
                            decoration: InputDecoration(
                              labelText: 'Email Address',
                              prefixIcon: Icon(
                                Icons.email,
                                color: Colors.green,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: Colors.green,
                                  width: 2,
                                ),
                              ),
                            ),
                            validator: (value) =>
                                value!.isEmpty ? 'Enter valid email' : null,
                          ),
                          SizedBox(height: 16),
                          TextFormField(
                            controller: _passwordController,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              prefixIcon: Icon(Icons.lock, color: Colors.green),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: Colors.green,
                                  width: 2,
                                ),
                              ),
                            ),
                            obscureText: true,
                            validator: (value) =>
                                value!.length < 6 ? 'Min 6 characters' : null,
                          ),
                          if (!_isLogin) ...[
                            SizedBox(height: 16),
                            TextFormField(
                              controller: _confirmPasswordController,
                              decoration: InputDecoration(
                                labelText: 'Confirm Password',
                                prefixIcon: Icon(
                                  Icons.lock_outline,
                                  color: Colors.green,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: Colors.green,
                                    width: 2,
                                  ),
                                ),
                              ),
                              obscureText: true,
                              validator: (value) {
                                if (value != _passwordController.text) {
                                  return 'Passwords do not match';
                                }
                                return null;
                              },
                            ),
                          ],
                          SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _submit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green.shade600,
                                foregroundColor: Colors.white,
                                padding: EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                elevation: 2,
                              ),
                              child: Text(
                                _isLogin ? 'LOGIN' : 'SIGN UP',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                          ),
                          SizedBox(height: 16),
                          TextButton(
                            onPressed: () {
                              setState(() => _isLogin = !_isLogin);
                              _formKey.currentState?.reset();
                            },
                            child: Text.rich(
                              // Changed from RichText to Text.rich for better constraint handling
                              TextSpan(
                                text: _isLogin
                                    ? "Don't have an account? "
                                    : "Already have an account? ",
                                style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontSize: 13,
                                ), // Reduced size slightly
                                children: [
                                  TextSpan(
                                    text: _isLogin ? 'Sign Up' : 'Login',
                                    style: TextStyle(
                                      color: Colors.green,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          if (_isLogin) ...[
                            TextButton(
                              onPressed: () {},
                              child: Text(
                                "Forgot Password?",
                                style: TextStyle(color: Colors.green),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
} // Closes _AuthScreenState check where Card was closed

class FarumasiLogo extends StatelessWidget {
  final double size;
  final Color color;
  final bool onDark;

  const FarumasiLogo({
    super.key,
    required this.size,
    this.color = Colors.green,
    this.onDark = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.15),
      decoration: BoxDecoration(
        color: onDark ? Colors.white : Colors.transparent,
        shape: BoxShape.circle,
        boxShadow: onDark
            ? [
                const BoxShadow(
                  blurRadius: 8,
                  color: Colors.black26,
                  offset: Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: CustomPaint(
        painter: _LeafyFPainter(color: onDark ? Colors.green.shade700 : color),
      ),
    );
  }
}

class _LeafyFPainter extends CustomPainter {
  final Color color;
  _LeafyFPainter({required this.color});

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

    // 1. Arc Circle (The encircling swoosh)
    final arcPath = Path();
    arcPath.addArc(
      Rect.fromLTWH(0, 0, w, h),
      0.8, // Start angle (bottom rightish)
      5.0, // Sweep angle (leave gap on left)
    );
    canvas.drawPath(arcPath, strokePaint);

    // 2. The "F" shapes (Leaf-like Wings)

    // Top Wing (Forms top bar and curve of F)
    final topWing = Path();
    topWing.moveTo(w * 0.28, h * 0.55); // Start at stem bottom-left
    topWing.quadraticBezierTo(
      w * 0.20,
      h * 0.20,
      w * 0.85,
      h * 0.22,
    ); // Curve up to top right tip
    topWing.quadraticBezierTo(
      w * 0.55,
      h * 0.35,
      w * 0.45,
      h * 0.45,
    ); // Curve back under
    topWing.close();
    canvas.drawPath(topWing, fillPaint);

    // Bottom Wing (Forms middle bar)
    final bottomWing = Path();
    bottomWing.moveTo(w * 0.32, h * 0.65); // Start below top wing
    bottomWing.quadraticBezierTo(
      w * 0.45,
      h * 0.50,
      w * 0.80,
      h * 0.50,
    ); // Curve out
    bottomWing.quadraticBezierTo(
      w * 0.60,
      h * 0.60,
      w * 0.40,
      h * 0.70,
    ); // Curve back
    bottomWing.close();
    canvas.drawPath(bottomWing, fillPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
