import 'package:flutter/material.dart';

/// Offline-safe store header — no network images (avoids broken hero when offline).
class StoreHeroBackground extends StatelessWidget {
  const StoreHeroBackground({
    super.key,
    this.baseColor = const Color(0xFF1E9E68),
    this.darkColor = const Color(0xFF167B51),
  });

  final Color baseColor;
  final Color darkColor;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            baseColor,
            darkColor,
            const Color(0xFF0F5132),
          ],
        ),
      ),
      child: CustomPaint(
        painter: _HeroPatternPainter(baseColor: baseColor),
      ),
    );
  }
}

class _HeroPatternPainter extends CustomPainter {
  _HeroPatternPainter({required this.baseColor});

  final Color baseColor;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.06)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    for (var i = -2; i < 8; i++) {
      final path = Path()
        ..moveTo(size.width * (0.1 * i), size.height)
        ..quadraticBezierTo(
          size.width * 0.5,
          size.height * 0.2,
          size.width * (1 + 0.08 * i),
          -size.height * 0.2,
        );
      canvas.drawPath(path, paint);
    }
    canvas.drawCircle(
      Offset(size.width * 0.85, size.height * 0.25),
      size.width * 0.18,
      Paint()..color = baseColor.withValues(alpha: 0.25),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
