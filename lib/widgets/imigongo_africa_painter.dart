import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Hand-drawn imigongo-style Africa map — concentric angular contour lines.
class ImigongoAfricaPainter extends CustomPainter {
  ImigongoAfricaPainter({
    this.lineColor = const Color(0xFFF2E8DA),
    this.accentColor = const Color(0xFFB84A1F),
    this.fillColor = const Color(0xFF1A1410),
  });

  final Color lineColor;
  final Color accentColor;
  final Color fillColor;

  /// Simplified Africa silhouette (normalized 0–1, origin top-left).
  static const _africa = <Offset>[
    Offset(0.44, 0.11),
    Offset(0.48, 0.09),
    Offset(0.53, 0.08),
    Offset(0.58, 0.07),
    Offset(0.62, 0.08),
    Offset(0.66, 0.10),
    Offset(0.69, 0.13),
    Offset(0.71, 0.17),
    Offset(0.72, 0.22),
    Offset(0.73, 0.28),
    Offset(0.72, 0.34),
    Offset(0.70, 0.40),
    Offset(0.68, 0.46),
    Offset(0.66, 0.52),
    Offset(0.63, 0.58),
    Offset(0.60, 0.64),
    Offset(0.56, 0.70),
    Offset(0.52, 0.75),
    Offset(0.48, 0.79),
    Offset(0.44, 0.82),
    Offset(0.40, 0.84),
    Offset(0.36, 0.82),
    Offset(0.32, 0.78),
    Offset(0.28, 0.72),
    Offset(0.26, 0.66),
    Offset(0.24, 0.58),
    Offset(0.23, 0.50),
    Offset(0.22, 0.42),
    Offset(0.21, 0.34),
    Offset(0.20, 0.28),
    Offset(0.21, 0.22),
    Offset(0.24, 0.17),
    Offset(0.28, 0.13),
    Offset(0.33, 0.11),
    Offset(0.38, 0.10),
  ];

  static const _madagascar = <Offset>[
    Offset(0.74, 0.66),
    Offset(0.78, 0.64),
    Offset(0.80, 0.68),
    Offset(0.79, 0.74),
    Offset(0.75, 0.76),
    Offset(0.72, 0.72),
  ];

  /// Regional hubs for imigongo radiating patterns (normalized).
  static const _hubs = <Offset>[
    Offset(0.48, 0.74), // Southern Africa
    Offset(0.24, 0.40), // West Africa bulge
    Offset(0.67, 0.14), // Horn of Africa
    Offset(0.52, 0.30), // Central / Rift
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final mapRect = _fitMapRect(size);
    final africa = _toCanvas(_africa, mapRect);
    final madagascar = _toCanvas(_madagascar, mapRect);
    final africaPath = _closedPath(africa);
    final madPath = _closedPath(madagascar);
    final clipPath = Path.combine(PathOperation.union, africaPath, madPath);

    canvas.drawPath(
      africaPath,
      Paint()..color = fillColor.withValues(alpha: 0.92),
    );
    canvas.drawPath(
      madPath,
      Paint()..color = fillColor.withValues(alpha: 0.90),
    );

    canvas.save();
    canvas.clipPath(clipPath);

    _drawConcentricContours(canvas, africa, layers: 16);
    _drawConcentricContours(canvas, madagascar, layers: 6);

    for (final hubNorm in _hubs) {
      final hub = Offset(
        mapRect.left + hubNorm.dx * mapRect.width,
        mapRect.top + hubNorm.dy * mapRect.height,
      );
      _drawHubRays(canvas, hub, mapRect, clipPath);
    }

    _drawAngularBands(canvas, africa, mapRect);
    canvas.restore();

    final outline = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(1.2, size.shortestSide * 0.004)
      ..color = lineColor.withValues(alpha: 0.95);
    canvas.drawPath(africaPath, outline);
    canvas.drawPath(madPath, outline..strokeWidth = outline.strokeWidth * 0.85);
  }

  Rect _fitMapRect(Size size) {
    const aspect = 0.82;
    final maxW = size.width * 0.92;
    final maxH = size.height * 0.88;
    var w = maxW;
    var h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return Rect.fromCenter(
      center: Offset(size.width * 0.5, size.height * 0.52),
      width: w,
      height: h,
    );
  }

  List<Offset> _toCanvas(List<Offset> norm, Rect rect) {
    return norm
        .map(
          (p) => Offset(
            rect.left + p.dx * rect.width,
            rect.top + p.dy * rect.height,
          ),
        )
        .toList();
  }

  Path _closedPath(List<Offset> points) {
    final path = Path();
    if (points.isEmpty) return path;
    path.moveTo(points.first.dx, points.first.dy);
    for (var i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }
    path.close();
    return path;
  }

  Offset _centroid(List<Offset> points) {
    var x = 0.0;
    var y = 0.0;
    for (final p in points) {
      x += p.dx;
      y += p.dy;
    }
    final n = points.length;
    return Offset(x / n, y / n);
  }

  List<Offset> _shrink(List<Offset> points, double factor, Offset center) {
    return points
        .map(
          (p) => Offset(
            center.dx + (p.dx - center.dx) * factor,
            center.dy + (p.dy - center.dy) * factor,
          ),
        )
        .toList();
  }

  void _drawConcentricContours(
    Canvas canvas,
    List<Offset> outline, {
    required int layers,
  }) {
    final center = _centroid(outline);
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeJoin = StrokeJoin.miter
      ..isAntiAlias = true;

    for (var i = 0; i < layers; i++) {
      final t = i / layers;
      final factor = 1.0 - t * 0.96;
      final ring = _shrink(outline, factor, center);
      final zigzag = _angularize(ring, amplitude: 2.0 + t * 3.5, phase: i * 0.7);

      stroke
        ..strokeWidth = (1.8 - t * 0.9).clamp(0.6, 1.8)
        ..color = i.isEven
            ? lineColor.withValues(alpha: (0.92 - t * 0.5).clamp(0.35, 0.92))
            : accentColor.withValues(alpha: (0.55 - t * 0.3).clamp(0.2, 0.55));

      canvas.drawPath(_closedPath(zigzag), stroke);
    }
  }

  /// Adds short straight segments so rings look hand-cut (imigongo).
  List<Offset> _angularize(
    List<Offset> ring, {
    required double amplitude,
    required double phase,
  }) {
    if (ring.length < 3) return ring;
    final out = <Offset>[];
    for (var i = 0; i < ring.length; i++) {
      final prev = ring[(i - 1 + ring.length) % ring.length];
      final cur = ring[i];
      final next = ring[(i + 1) % ring.length];
      final mid = Offset((prev.dx + next.dx) * 0.5, (prev.dy + next.dy) * 0.5);
      final dir = Offset(cur.dx - mid.dx, cur.dy - mid.dy);
      final len = math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy);
      final wave = math.sin(phase + i * 0.9) * amplitude;
      if (len < 0.001) {
        out.add(cur);
      } else {
        out.add(
          Offset(
            cur.dx + (dir.dx / len) * wave,
            cur.dy + (dir.dy / len) * wave,
          ),
        );
      }
    }
    return out;
  }

  void _drawHubRays(Canvas canvas, Offset hub, Rect mapRect, Path clip) {
    final maxR = mapRect.shortestSide * 0.42;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1
      ..color = lineColor.withValues(alpha: 0.45);

    for (var a = 0; a < 12; a++) {
      final angle = (a / 12) * math.pi * 2 + 0.2;
      final steps = 5;
      final path = Path()..moveTo(hub.dx, hub.dy);
      for (var s = 1; s <= steps; s++) {
        final r = maxR * (s / steps);
        final jag = (s.isOdd ? 1.0 : -1.0) * 6.0;
        final px = hub.dx + math.cos(angle) * r + math.cos(angle + math.pi / 2) * jag;
        final py = hub.dy + math.sin(angle) * r + math.sin(angle + math.pi / 2) * jag;
        path.lineTo(px, py);
      }
      canvas.drawPath(path, paint);
    }
  }

  void _drawAngularBands(Canvas canvas, List<Offset> africa, Rect mapRect) {
    final fill = Paint()..style = PaintingStyle.fill;
    final center = _centroid(africa);
    for (var band = 0; band < 4; band++) {
      final inner = _shrink(africa, 0.55 + band * 0.08, center);
      final outer = _shrink(africa, 0.62 + band * 0.08, center);
      if (inner.length != outer.length) continue;
      for (var i = 0; i < inner.length; i++) {
        if (i % 3 != band % 3) continue;
        final c = band.isEven ? accentColor : lineColor;
        fill.color = c.withValues(alpha: 0.12);
        final path = Path()
          ..moveTo(inner[i].dx, inner[i].dy)
          ..lineTo(outer[i].dx, outer[i].dy)
          ..lineTo(
            outer[(i + 1) % outer.length].dx,
            outer[(i + 1) % outer.length].dy,
          )
          ..lineTo(
            inner[(i + 1) % inner.length].dx,
            inner[(i + 1) % inner.length].dy,
          )
          ..close();
        canvas.drawPath(path, fill);
      }
    }
  }

  @override
  bool shouldRepaint(covariant ImigongoAfricaPainter oldDelegate) {
    return oldDelegate.lineColor != lineColor ||
        oldDelegate.accentColor != accentColor ||
        oldDelegate.fillColor != fillColor;
  }
}

/// Animated reveal of the Africa imigongo map (lightweight, no network).
class ImigongoAfricaHero extends StatefulWidget {
  const ImigongoAfricaHero({
    super.key,
    this.baseColor = const Color(0xFF1E9E68),
    this.darkColor = const Color(0xFF167B51),
  });

  final Color baseColor;
  final Color darkColor;

  @override
  State<ImigongoAfricaHero> createState() => _ImigongoAfricaHeroState();
}

class _ImigongoAfricaHeroState extends State<ImigongoAfricaHero>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _reveal;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _reveal = CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            widget.baseColor,
            widget.darkColor,
            const Color(0xFF0F5132),
          ],
        ),
      ),
      child: AnimatedBuilder(
        animation: _reveal,
        builder: (context, child) {
          return ClipRect(
            child: Align(
              alignment: Alignment.bottomCenter,
              heightFactor: 0.35 + _reveal.value * 0.65,
              child: Opacity(
                opacity: 0.4 + _reveal.value * 0.6,
                child: child,
              ),
            ),
          );
        },
        child: CustomPaint(
          painter: ImigongoAfricaPainter(),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}
