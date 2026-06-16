import 'package:flutter/material.dart';

import 'farumasi_logo.dart';

/// Branded launch motion — white background, brand at bottom, max ~2.2s, skippable.
class AppLaunchOverlay extends StatefulWidget {
  const AppLaunchOverlay({super.key, required this.onFinished});

  final VoidCallback onFinished;

  @override
  State<AppLaunchOverlay> createState() => _AppLaunchOverlayState();
}

class _AppLaunchOverlayState extends State<AppLaunchOverlay>
    with SingleTickerProviderStateMixin {
  static const _green = Color(0xFF1E9E68);

  late final AnimationController _controller;
  late final Animation<double> _logoScale;
  late final Animation<double> _logoOpacity;
  late final Animation<double> _brandOpacity;
  late final Animation<double> _fadeOut;
  bool _dismissed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );

    _logoScale = Tween<double>(begin: 0.6, end: 1.0).animate(
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
    _brandOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.2, 0.55, curve: Curves.easeOut),
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

  @override
  Widget build(BuildContext context) {
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
              child: Material(
                color: Colors.white,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Center(
                      child: Transform.scale(
                        scale: _logoScale.value,
                        child: Opacity(
                          opacity: _logoOpacity.value,
                          child: const FarumasiLogo(size: 88, onDark: false),
                        ),
                      ),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 48,
                      child: Opacity(
                        opacity: _brandOpacity.value,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'FARUMASI',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: _green,
                                letterSpacing: 2.2,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Your Digital Pharmacy',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade600,
                              ),
                            ),
                            if (_controller.value < 0.75) ...[
                              const SizedBox(height: 20),
                              Text(
                                'Tap to continue',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade400,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
