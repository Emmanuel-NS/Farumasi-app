import 'dart:async';

import 'package:flutter/material.dart';

import 'lite_network_image.dart';

/// Store sliver hero: photo when the network is fast; Rwandan imigongo art offline/slow.
class StoreHeroBackground extends StatefulWidget {
  const StoreHeroBackground({
    super.key,
    this.baseColor = const Color(0xFF1E9E68),
    this.darkColor = const Color(0xFF167B51),
    this.heroImageUrl =
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=75',
  });

  final Color baseColor;
  final Color darkColor;
  final String heroImageUrl;

  @override
  State<StoreHeroBackground> createState() => _StoreHeroBackgroundState();
}

class _StoreHeroBackgroundState extends State<StoreHeroBackground> {
  bool _showPhoto = false;

  @override
  void initState() {
    super.initState();
    _probeNetworkImage();
  }

  Future<void> _probeNetworkImage() async {
    try {
      final provider = NetworkImage(widget.heroImageUrl);
      await precacheImage(provider, context).timeout(
        const Duration(milliseconds: 1800),
        onTimeout: () => throw TimeoutException('slow network'),
      );
      if (mounted) setState(() => _showPhoto = true);
    } catch (_) {
      if (mounted) setState(() => _showPhoto = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_showPhoto) {
      return Stack(
        fit: StackFit.expand,
        children: [
          LiteNetworkImage(
            url: widget.heroImageUrl,
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
            memCacheWidth: 900,
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.35),
                  Colors.black.withValues(alpha: 0.12),
                  widget.baseColor.withValues(alpha: 0.45),
                ],
              ),
            ),
          ),
        ],
      );
    }

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
      child: CustomPaint(
        painter: ImigongoPainter(),
      ),
    );
  }
}

/// Geometric imigongo-inspired pattern (Rwanda) — black, ochre, cream on green base.
class ImigongoPainter extends CustomPainter {
  ImigongoPainter();

  static const _black = Color(0xFF1A1410);
  static const _ochre = Color(0xFFB84A1F);
  static const _cream = Color(0xFFF2E8DA);
  static const _rust = Color(0xFF8C3B1A);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Horizontal imigongo bands
    final bandH = h / 5;
    for (var row = 0; row < 5; row++) {
      final top = row * bandH;
      final rect = Rect.fromLTWH(0, top, w, bandH);
      final bg = row.isEven ? _black.withValues(alpha: 0.88) : _ochre.withValues(alpha: 0.82);
      canvas.drawRect(rect, Paint()..color = bg);
      _drawBandPattern(canvas, rect, row);
    }

    // Soft vignette
    canvas.drawRect(
      Rect.fromLTWH(0, 0, w, h),
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: 0.15),
            Colors.transparent,
            Colors.black.withValues(alpha: 0.25),
          ],
        ).createShader(Rect.fromLTWH(0, 0, w, h)),
    );
  }

  void _drawBandPattern(Canvas canvas, Rect band, int row) {
    final paint = Paint()..style = PaintingStyle.fill;
    final chevronH = band.height * 0.55;
    final unit = band.width / 8;

    for (var i = 0; i < 8; i++) {
      final x = band.left + i * unit;
      final colors = row % 3 == 0
          ? [_cream, _ochre, _cream]
          : row % 3 == 1
              ? [_cream, _black, _rust]
              : [_ochre, _cream, _black];
      final c = colors[i % 3];

      if (i.isEven) {
        paint.color = c;
        final path = Path()
          ..moveTo(x, band.bottom)
          ..lineTo(x + unit * 0.5, band.bottom - chevronH)
          ..lineTo(x + unit, band.bottom)
          ..close();
        canvas.drawPath(path, paint);
      } else {
        paint.color = c.withValues(alpha: 0.9);
        final path = Path()
          ..moveTo(x, band.top)
          ..lineTo(x + unit * 0.5, band.top + chevronH * 0.85)
          ..lineTo(x + unit, band.top)
          ..close();
        canvas.drawPath(path, paint);
      }

      // Diamond accents
      if (i % 2 == 1) {
        paint.color = _cream.withValues(alpha: 0.85);
        final cx = x + unit * 0.5;
        final cy = band.top + band.height * 0.5;
        final d = unit * 0.18;
        canvas.drawPath(
          Path()
            ..moveTo(cx, cy - d)
            ..lineTo(cx + d, cy)
            ..lineTo(cx, cy + d)
            ..lineTo(cx - d, cy)
            ..close(),
          paint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
