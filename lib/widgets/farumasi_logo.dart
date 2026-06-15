import 'package:flutter/material.dart';

/// FARUMASI leafy-F logo — matches the patient portal SVG and top bar.
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
        boxShadow: onDark
            ? const [
                BoxShadow(
                  blurRadius: 8,
                  color: Colors.black26,
                  offset: Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: CustomPaint(
        painter: LeafyFIconPainter(
          color: onDark ? const Color(0xFF1E9E68) : color,
        ),
      ),
    );
  }
}

/// Leafy-F icon — shared by logo widget and imigongo doodle wallpaper.
class LeafyFIconPainter extends CustomPainter {
  LeafyFIconPainter({required this.color, this.strokeWidth});

  final Color color;
  final double? strokeWidth;

  static void drawIcon(
    Canvas canvas,
    Rect rect,
    Color color, {
    double? strokeWidth,
  }) {
    canvas.save();
    canvas.translate(rect.left, rect.top);
    LeafyFIconPainter(color: color, strokeWidth: strokeWidth)
        .paint(canvas, rect.size);
    canvas.restore();
  }

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
      ..strokeWidth = strokeWidth ?? w * 0.08
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
  bool shouldRepaint(covariant LeafyFIconPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.strokeWidth != strokeWidth;
  }
}
