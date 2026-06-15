import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'farumasi_logo.dart';

/// Scattered imigongo-style tribal doodles — WhatsApp-style chat wallpaper or store hero.
enum ImigongoDoodleVariant { chat, hero }

class ImigongoDoodleBackground extends StatelessWidget {
  const ImigongoDoodleBackground({
    super.key,
    this.variant = ImigongoDoodleVariant.chat,
    this.child,
    this.baseColor,
    this.gradientColors,
  });

  final ImigongoDoodleVariant variant;
  final Widget? child;
  final Color? baseColor;
  final List<Color>? gradientColors;

  static const chatBg = Color(0xFFE2EBE6);
  static const heroGreen = Color(0xFF1E9E68);
  static const heroGreenDark = Color(0xFF167B51);
  static const heroGreenDeep = Color(0xFF0F5132);

  @override
  Widget build(BuildContext context) {
    final isHero = variant == ImigongoDoodleVariant.hero;
    final bg = baseColor ?? (isHero ? heroGreen : chatBg);

    return DecoratedBox(
      decoration: isHero
          ? BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: gradientColors ??
                    const [heroGreen, heroGreenDark, heroGreenDeep],
              ),
            )
          : BoxDecoration(color: bg),
      child: Stack(
        fit: StackFit.expand,
        children: [
          CustomPaint(
            painter: ImigongoDoodlePainter(
              variant: variant,
              backgroundColor: isHero ? Colors.transparent : bg,
            ),
          ),
          if (child != null) child!,
        ],
      ),
    );
  }
}

class ImigongoDoodlePainter extends CustomPainter {
  ImigongoDoodlePainter({
    required this.variant,
    this.backgroundColor = ImigongoDoodleBackground.chatBg,
  });

  final ImigongoDoodleVariant variant;
  final Color backgroundColor;

  static const _tile = 220.0;
  static const _cream = Color(0xFFF2E8DA);
  static const _tan = Color(0xFFD4C4A8);
  static const _sage = Color(0xFF8FB89A);
  static const _moss = Color(0xFF5A8F6E);
  static const _greenLine = Color(0xFF6FAF88);

  static final _stamps = _buildStamps();

  static List<_DoodleStamp> _buildStamps() {
    final stamps = <_DoodleStamp>[];

    const logoSpots = <(double, double)>[
      (0.08, 0.10),
      (0.22, 0.05),
      (0.38, 0.12),
      (0.54, 0.06),
      (0.70, 0.11),
      (0.86, 0.08),
      (0.14, 0.34),
      (0.46, 0.28),
      (0.78, 0.32),
      (0.92, 0.44),
      (0.10, 0.56),
      (0.34, 0.50),
      (0.62, 0.54),
      (0.84, 0.62),
      (0.20, 0.76),
      (0.52, 0.72),
      (0.74, 0.80),
      (0.06, 0.90),
      (0.40, 0.88),
      (0.66, 0.94),
      (0.90, 0.86),
    ];

    for (var i = 0; i < logoSpots.length; i++) {
      final spot = logoSpots[i];
      stamps.add(
        _DoodleStamp(
          spot.$1,
          spot.$2,
          (i * 0.41) % 2.8 - 0.6,
          0.62 + (i % 4) * 0.09,
          _DoodleKind.logo,
          i % 5,
        ),
      );
    }

    const patternKinds = [
      _DoodleKind.zigzag,
      _DoodleKind.diamondRow,
      _DoodleKind.concentric,
      _DoodleKind.sun,
      _DoodleKind.nestedDiamond,
      _DoodleKind.spiral,
      _DoodleKind.hatch,
      _DoodleKind.semicircle,
      _DoodleKind.cross,
      _DoodleKind.stalk,
      _DoodleKind.target,
      _DoodleKind.pill,
      _DoodleKind.capsule,
      _DoodleKind.syringe,
      _DoodleKind.stethoscope,
      _DoodleKind.heartbeat,
      _DoodleKind.bottle,
      _DoodleKind.medicalCross,
      _DoodleKind.chevronRow,
      _DoodleKind.wavyLine,
      _DoodleKind.triangleStack,
      _DoodleKind.mesh,
    ];

    for (var row = 0; row < 8; row++) {
      for (var col = 0; col < 8; col++) {
        final nx = 0.03 + col * 0.122;
        final ny = 0.03 + row * 0.122;
        final hash = row * 17 + col * 31;
        if (hash % 5 == 0) continue;

        stamps.add(
          _DoodleStamp(
            nx,
            ny,
            (hash % 9) * 0.38 - 1.2,
            0.68 + (hash % 5) * 0.1,
            patternKinds[hash % patternKinds.length],
            hash % 5,
          ),
        );
      }
    }

    return stamps;
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (variant == ImigongoDoodleVariant.chat) {
      canvas.drawRect(Offset.zero & size, Paint()..color = backgroundColor);
    }

    final isHero = variant == ImigongoDoodleVariant.hero;
    final opacity = isHero ? 0.58 : 0.36;
    final stroke = isHero ? 1.85 : 1.45;
    final colors = [_cream, _tan, _sage, _moss, _greenLine];

    final cols = (size.width / _tile).ceil() + 1;
    final rows = (size.height / _tile).ceil() + 1;

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        final ox = col * _tile;
        final oy = row * _tile;
        final jitterX = (row.isOdd ? _tile * 0.45 : 0.0);
        final jitterY = (col.isOdd ? _tile * 0.22 : 0.0);

        for (final stamp in _stamps) {
          final color = colors[stamp.colorIdx % colors.length]
              .withValues(alpha: opacity);
          final paint = Paint()
            ..color = color
            ..style = PaintingStyle.stroke
            ..strokeWidth = stroke
            ..strokeCap = StrokeCap.round
            ..strokeJoin = StrokeJoin.round;

          final cx = ox + stamp.nx * _tile + jitterX;
          final cy = oy + stamp.ny * _tile + jitterY;
          if (cx < -48 || cy < -48 || cx > size.width + 48 || cy > size.height + 48) {
            continue;
          }

          canvas.save();
          canvas.translate(cx, cy);
          canvas.rotate(stamp.rotation);
          canvas.scale(stamp.scale);

          switch (stamp.kind) {
            case _DoodleKind.zigzag:
              _zigzag(canvas, paint);
            case _DoodleKind.diamondRow:
              _diamondRow(canvas, paint);
            case _DoodleKind.concentric:
              _concentric(canvas, paint);
            case _DoodleKind.sun:
              _sun(canvas, paint);
            case _DoodleKind.nestedDiamond:
              _nestedDiamond(canvas, paint);
            case _DoodleKind.spiral:
              _spiral(canvas, paint);
            case _DoodleKind.hatch:
              _hatch(canvas, paint);
            case _DoodleKind.semicircle:
              _semicircle(canvas, paint);
            case _DoodleKind.cross:
              _cross(canvas, paint);
            case _DoodleKind.stalk:
              _stalk(canvas, paint);
            case _DoodleKind.target:
              _target(canvas, paint);
            case _DoodleKind.logo:
              _logo(canvas, color, stroke);
            case _DoodleKind.pill:
              _pill(canvas, paint);
            case _DoodleKind.capsule:
              _capsule(canvas, paint);
            case _DoodleKind.syringe:
              _syringe(canvas, paint);
            case _DoodleKind.stethoscope:
              _stethoscope(canvas, paint);
            case _DoodleKind.heartbeat:
              _heartbeat(canvas, paint);
            case _DoodleKind.bottle:
              _bottle(canvas, paint);
            case _DoodleKind.medicalCross:
              _medicalCross(canvas, paint);
            case _DoodleKind.chevronRow:
              _chevronRow(canvas, paint);
            case _DoodleKind.wavyLine:
              _wavyLine(canvas, paint);
            case _DoodleKind.triangleStack:
              _triangleStack(canvas, paint);
            case _DoodleKind.mesh:
              _mesh(canvas, paint);
          }
          canvas.restore();
        }
      }
    }
  }

  void _zigzag(Canvas canvas, Paint paint) {
    final path = Path();
    const w = 34.0;
    const h = 7.0;
    path.moveTo(-w / 2, 0);
    for (var i = 0; i < 5; i++) {
      path.lineTo(-w / 2 + (i + 0.5) * w / 5, i.isEven ? -h : h);
      path.lineTo(-w / 2 + (i + 1) * w / 5, i.isEven ? -h : h);
    }
    canvas.drawPath(path, paint);
  }

  void _diamondRow(Canvas canvas, Paint paint) {
    for (var i = 0; i < 4; i++) {
      final dx = -22.0 + i * 14.0;
      final path = Path()
        ..moveTo(dx, -5)
        ..lineTo(dx + 5, 0)
        ..lineTo(dx, 5)
        ..lineTo(dx - 5, 0)
        ..close();
      canvas.drawPath(path, paint);
    }
  }

  void _concentric(Canvas canvas, Paint paint) {
    for (var r = 3.0; r <= 12.0; r += 4.5) {
      canvas.drawCircle(Offset.zero, r, paint);
    }
  }

  void _sun(Canvas canvas, Paint paint) {
    canvas.drawCircle(Offset.zero, 4, paint);
    for (var i = 0; i < 8; i++) {
      final angle = i * math.pi / 4;
      canvas.drawLine(
        Offset(math.cos(angle) * 7, math.sin(angle) * 7),
        Offset(math.cos(angle) * 14, math.sin(angle) * 14),
        paint,
      );
    }
  }

  void _nestedDiamond(Canvas canvas, Paint paint) {
    for (var s = 3.0; s <= 12.0; s += 4.5) {
      final path = Path()
        ..moveTo(0, -s)
        ..lineTo(s, 0)
        ..lineTo(0, s)
        ..lineTo(-s, 0)
        ..close();
      canvas.drawPath(path, paint);
    }
  }

  void _spiral(Canvas canvas, Paint paint) {
    final path = Path()..moveTo(-11, -11);
    path
      ..lineTo(11, -11)
      ..lineTo(11, 11)
      ..lineTo(-3, 11)
      ..lineTo(-3, -3)
      ..lineTo(7, -3)
      ..lineTo(7, 7)
      ..lineTo(-11, 7);
    canvas.drawPath(path, paint);
  }

  void _hatch(Canvas canvas, Paint paint) {
    final path = Path()
      ..moveTo(-9, -11)
      ..lineTo(9, 11)
      ..moveTo(-1, -11)
      ..lineTo(17, 11)
      ..moveTo(-17, -11)
      ..lineTo(1, 11);
    canvas.drawPath(path, paint);
    canvas.drawRect(const Rect.fromLTWH(-11, -12, 22, 24), paint);
  }

  void _semicircle(Canvas canvas, Paint paint) {
    canvas.drawArc(
      const Rect.fromLTWH(-12, -7, 24, 24),
      math.pi,
      math.pi,
      false,
      paint,
    );
    canvas.drawArc(
      const Rect.fromLTWH(-8, -3, 16, 16),
      math.pi,
      math.pi,
      false,
      paint,
    );
  }

  void _cross(Canvas canvas, Paint paint) {
    canvas.drawLine(const Offset(0, -12), const Offset(0, 12), paint);
    canvas.drawLine(const Offset(-12, 0), const Offset(12, 0), paint);
  }

  void _stalk(Canvas canvas, Paint paint) {
    canvas.drawLine(const Offset(0, 12), const Offset(0, -12), paint);
    canvas.drawLine(const Offset(0, -3), const Offset(-9, -11), paint);
    canvas.drawLine(const Offset(0, 2), const Offset(9, -7), paint);
    canvas.drawLine(const Offset(0, 7), const Offset(-7, 12), paint);
  }

  void _target(Canvas canvas, Paint paint) {
    for (var i = 0; i < 3; i++) {
      final inset = i * 3.5;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(-10 + inset, -7 + inset, 20 - inset * 2, 14 - inset),
          const Radius.circular(2),
        ),
        paint,
      );
    }
  }

  void _pill(Canvas canvas, Paint paint) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(-12, -5, 24, 10), const Radius.circular(5)),
      paint,
    );
    canvas.drawLine(const Offset(-4, -5), const Offset(-4, 5), paint);
    canvas.drawLine(const Offset(4, -5), const Offset(4, 5), paint);
  }

  void _capsule(Canvas canvas, Paint paint) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(-14, -6, 28, 12), const Radius.circular(6)),
      paint,
    );
    canvas.drawLine(const Offset(0, -6), const Offset(0, 6), paint);
  }

  void _syringe(Canvas canvas, Paint paint) {
    canvas.drawRect(const Rect.fromLTWH(-4, -12, 8, 16), paint);
    canvas.drawLine(const Offset(0, 4), const Offset(0, 12), paint);
    canvas.drawLine(const Offset(-3, 12), const Offset(3, 12), paint);
    canvas.drawLine(const Offset(-2, -12), const Offset(2, -12), paint);
    canvas.drawLine(const Offset(0, -12), const Offset(0, -16), paint);
  }

  void _stethoscope(Canvas canvas, Paint paint) {
    final path = Path()
      ..moveTo(-10, -8)
      ..quadraticBezierTo(0, 4, 10, -8)
      ..lineTo(10, 4);
    canvas.drawPath(path, paint);
    canvas.drawCircle(const Offset(10, 8), 4, paint);
    canvas.drawCircle(const Offset(-10, -10), 3, paint);
  }

  void _heartbeat(Canvas canvas, Paint paint) {
    final path = Path()
      ..moveTo(-16, 2)
      ..lineTo(-10, 2)
      ..lineTo(-7, -8)
      ..lineTo(-2, 10)
      ..lineTo(3, -4)
      ..lineTo(7, 2)
      ..lineTo(16, 2);
    canvas.drawPath(path, paint);
  }

  void _bottle(Canvas canvas, Paint paint) {
    canvas.drawRect(const Rect.fromLTWH(-5, -12, 10, 4), paint);
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(-8, -8, 16, 18), const Radius.circular(3)),
      paint,
    );
    canvas.drawLine(const Offset(-8, -2), const Offset(8, -2), paint);
  }

  void _medicalCross(Canvas canvas, Paint paint) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(-3, -10, 6, 20), const Radius.circular(1)),
      paint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(-10, -3, 20, 6), const Radius.circular(1)),
      paint,
    );
  }

  void _chevronRow(Canvas canvas, Paint paint) {
    for (var i = 0; i < 4; i++) {
      final dx = -15.0 + i * 10.0;
      final path = Path()
        ..moveTo(dx - 3, -4)
        ..lineTo(dx + 1, 0)
        ..lineTo(dx - 3, 4);
      canvas.drawPath(path, paint);
    }
  }

  void _wavyLine(Canvas canvas, Paint paint) {
    final path = Path()..moveTo(-16, 0);
    for (var i = 0; i < 8; i++) {
      final x = -16.0 + i * 4.5;
      path.quadraticBezierTo(x + 2.2, i.isEven ? -4 : 4, x + 4.5, 0);
    }
    canvas.drawPath(path, paint);
  }

  void _triangleStack(Canvas canvas, Paint paint) {
    for (var i = 0; i < 3; i++) {
      final s = 12.0 - i * 3.5;
      final path = Path()
        ..moveTo(0, -s)
        ..lineTo(s, s * 0.7)
        ..lineTo(-s, s * 0.7)
        ..close();
      canvas.drawPath(path, paint);
    }
  }

  void _mesh(Canvas canvas, Paint paint) {
    for (var i = -1; i <= 1; i++) {
      canvas.drawLine(Offset(-12.0, i * 8.0), Offset(12.0, i * 8.0), paint);
      canvas.drawLine(Offset(i * 8.0, -10.0), Offset(i * 8.0, 10.0), paint);
    }
  }

  void _logo(Canvas canvas, Color color, double stroke) {
    LeafyFIconPainter.drawIcon(
      canvas,
      const Rect.fromLTWH(-10, -10, 20, 20),
      color,
      strokeWidth: stroke * 0.75,
    );
  }

  @override
  bool shouldRepaint(covariant ImigongoDoodlePainter oldDelegate) {
    return oldDelegate.variant != variant ||
        oldDelegate.backgroundColor != backgroundColor;
  }
}

enum _DoodleKind {
  zigzag,
  diamondRow,
  concentric,
  sun,
  nestedDiamond,
  spiral,
  hatch,
  semicircle,
  cross,
  stalk,
  target,
  logo,
  pill,
  capsule,
  syringe,
  stethoscope,
  heartbeat,
  bottle,
  medicalCross,
  chevronRow,
  wavyLine,
  triangleStack,
  mesh,
}

class _DoodleStamp {
  const _DoodleStamp(
    this.nx,
    this.ny,
    this.rotation,
    this.scale,
    this.kind,
    this.colorIdx,
  );

  final double nx;
  final double ny;
  final double rotation;
  final double scale;
  final _DoodleKind kind;
  final int colorIdx;
}
