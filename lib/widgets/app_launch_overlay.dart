import 'package:flutter/material.dart';

/// Branded cold-start screen — dark background, logo center, green brand at bottom.
class AppLaunchOverlay extends StatefulWidget {
  const AppLaunchOverlay({super.key, required this.onFinished});

  final VoidCallback onFinished;

  @override
  State<AppLaunchOverlay> createState() => _AppLaunchOverlayState();
}

class _AppLaunchOverlayState extends State<AppLaunchOverlay> {
  static const _bg = Color(0xFF121212);
  static const _green = Color(0xFF1E9E68);
  static const _tagline = Color(0xFFB8E6D0);

  bool _dismissed = false;
  bool _fading = false;

  @override
  void initState() {
    super.initState();
    // Brief branded moment, then hand off to home (shimmer loads data there).
    Future<void>.delayed(const Duration(milliseconds: 420), _beginFadeOut);
  }

  void _beginFadeOut() {
    if (_dismissed || !mounted) return;
    setState(() => _fading = true);
    Future<void>.delayed(const Duration(milliseconds: 140), _finish);
  }

  void _finish() {
    if (_dismissed || !mounted) return;
    _dismissed = true;
    widget.onFinished();
  }

  void _skip() => _finish();

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return GestureDetector(
      onTap: _skip,
      behavior: HitTestBehavior.opaque,
      child: AnimatedOpacity(
        opacity: _fading ? 0.0 : 1.0,
        duration: const Duration(milliseconds: 140),
        child: ColoredBox(
          color: _bg,
          child: SizedBox.expand(
            child: Stack(
              fit: StackFit.expand,
              children: [
                Center(
                  child: Image.asset(
                    'assets/images/app_logo.png',
                    width: 112,
                    height: 112,
                    fit: BoxFit.contain,
                    filterQuality: FilterQuality.high,
                  ),
                ),
                Positioned(
                  left: 24,
                  right: 24,
                  bottom: 32 + bottomInset,
                  child: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
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
                      SizedBox(height: 8),
                      Text(
                        'Your Digital Pharmacy',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: _tagline,
                          letterSpacing: 0.3,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
