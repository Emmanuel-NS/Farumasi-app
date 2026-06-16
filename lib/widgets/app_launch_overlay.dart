import 'package:flutter/material.dart';

import 'farumasi_logo.dart';

/// Branded launch screen — white background, logo center, green brand at bottom.
class AppLaunchOverlay extends StatefulWidget {
  const AppLaunchOverlay({super.key, required this.onFinished});

  final VoidCallback onFinished;

  @override
  State<AppLaunchOverlay> createState() => _AppLaunchOverlayState();
}

class _AppLaunchOverlayState extends State<AppLaunchOverlay>
    with SingleTickerProviderStateMixin {
  static const _green = Color(0xFF1E9E68);
  static const _greenDark = Color(0xFF167B51);

  late final AnimationController _controller;
  late final Animation<double> _logoScale;
  late final Animation<double> _logoOpacity;
  late final Animation<double> _fadeOut;
  bool _dismissed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );

    _logoScale = Tween<double>(begin: 0.55, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.45, curve: Curves.easeOutBack),
      ),
    );
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.35, curve: Curves.easeOut),
      ),
    );
    _fadeOut = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.82, 1.0, curve: Curves.easeIn),
      ),
    );

    _controller.forward().whenComplete(_finish);
  }

  void _finish() {
    if (_dismissed || !mounted) return;
    _dismissed = true;
    widget.onFinished();
  }

  void _skip() {
    if (_dismissed) return;
    _controller.stop();
    _finish();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _bottomBrand() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text(
          'FARUMASI',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            color: _green,
            letterSpacing: 3,
            height: 1.1,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Your Digital Pharmacy',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: _greenDark,
            letterSpacing: 0.3,
            height: 1.2,
          ),
        ),
        if (_controller.value < 0.75) ...[
          const SizedBox(height: 28),
          Text(
            'Tap to continue',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: _green.withValues(alpha: 0.45),
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return GestureDetector(
          onTap: _skip,
          behavior: HitTestBehavior.opaque,
          child: IgnorePointer(
            ignoring: _fadeOut.value < 0.05,
            child: Opacity(
              opacity: _fadeOut.value.clamp(0.0, 1.0),
              child: ColoredBox(
                color: Colors.white,
                child: SizedBox.expand(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Center(
                        child: Transform.scale(
                          scale: _logoScale.value,
                          child: Opacity(
                            opacity: _logoOpacity.value,
                            child: const FarumasiLogo(size: 96, onDark: false),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 24,
                        right: 24,
                        bottom: 32 + bottomInset,
                        child: _bottomBrand(),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
