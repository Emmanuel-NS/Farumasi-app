import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Decorative wave curves for green headers (store SliverAppBar, etc.).
class WaveHeaderOverlay extends StatelessWidget {
  const WaveHeaderOverlay({
    super.key,
    this.color = Colors.white,
    this.opacity = 0.14,
  });

  final Color color;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        painter: _WaveHeaderPainter(color: color.withValues(alpha: opacity)),
        size: Size.infinite,
      ),
    );
  }
}

class _WaveHeaderPainter extends CustomPainter {
  _WaveHeaderPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2;

    void drawWave(double yFactor, double amplitude) {
      final path = Path();
      final baseY = size.height * yFactor;
      path.moveTo(0, baseY);
      for (var x = 0.0; x <= size.width; x += 8) {
        final y = baseY +
            amplitude *
                (0.55 * math.sin(x / size.width * math.pi * 2) +
                    0.35 * math.sin(x / 42));
        path.lineTo(x, y);
      }
      canvas.drawPath(path, stroke);
    }

    drawWave(0.72, 10);
    drawWave(0.82, 7);
    drawWave(0.92, 5);

    final fillPaint = Paint()
      ..color = color.withValues(alpha: color.opacity * 0.35)
      ..style = PaintingStyle.fill;

    final blob = Path()
      ..moveTo(size.width * 0.62, 0)
      ..quadraticBezierTo(
        size.width * 0.78,
        size.height * 0.22,
        size.width,
        size.height * 0.12,
      )
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(blob, fillPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
