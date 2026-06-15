import 'package:flutter/material.dart';

import 'farumasi_logo.dart';
import 'imigongo_doodle_background.dart';

/// Branded launch motion — max ~2.2s, skippable, only on cold start.
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
  late final Animation<double> _mapReveal;
  late final Animation<double> _taglineSlide;
  late final Animation<double> _fadeOut;
  bool _dismissed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );

    _logoScale = Tween<double>(begin: 0.55, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.42, curve: Curves.easeOutBack),
      ),
    );
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.32, curve: Curves.easeOut),
      ),
    );
    _mapReveal = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.12, 0.65, curve: Curves.easeOutCubic),
      ),
    );
    _taglineSlide = Tween<double>(begin: 18.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.25, 0.62, curve: Curves.easeOutCubic),
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
                color: Colors.transparent,
                child: DecoratedBox(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [_green, _greenDark, Color(0xFF0F5132)],
                    ),
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Opacity(
                        opacity: 0.35 + _mapReveal.value * 0.55,
                        child: const ImigongoDoodleBackground(
                          variant: ImigongoDoodleVariant.hero,
                        ),
                      ),
                      Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Transform.scale(
                              scale: _logoScale.value,
                              child: Opacity(
                                opacity: _logoOpacity.value,
                                child: const FarumasiLogo(size: 88, onDark: true),
                              ),
                            ),
                            const SizedBox(height: 20),
                            Opacity(
                              opacity: _logoOpacity.value,
                              child: const Text(
                                'FARUMASI',
                                style: TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                  letterSpacing: 2,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Transform.translate(
                              offset: Offset(0, _taglineSlide.value),
                              child: Opacity(
                                opacity: _logoOpacity.value * 0.85,
                                child: Text(
                                  'Your Digital Pharmacy',
                                  style: TextStyle(
                                    fontSize: 15,
                                    color: Colors.white.withValues(alpha: 0.78),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (_controller.value < 0.75)
                        Positioned(
                          bottom: 28,
                          left: 0,
                          right: 0,
                          child: Opacity(
                            opacity: 0.7,
                            child: Text(
                              'Tap to continue',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white.withValues(alpha: 0.85),
                              ),
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
      },
    );
  }
}
