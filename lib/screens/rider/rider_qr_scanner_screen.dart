// lib/screens/rider/rider_qr_scanner_screen.dart
// QR code scanner screen for confirming FARUMASI deliveries.
// Uses mobile_scanner package. Fallback demo mode for testing.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../models/rider_models.dart';
import '../../providers/rider_provider.dart';
import 'rider_delivery_success_screen.dart';

class RiderQRScannerScreen extends ConsumerStatefulWidget {
  final RiderDeliveryOrder order;

  const RiderQRScannerScreen({super.key, required this.order});

  @override
  ConsumerState<RiderQRScannerScreen> createState() =>
      _RiderQRScannerScreenState();
}

class _RiderQRScannerScreenState
    extends ConsumerState<RiderQRScannerScreen> {
  final MobileScannerController _ctrl = MobileScannerController();
  bool _hasScanned = false;
  bool _isProcessing = false;
  String? _errorMessage;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasScanned || _isProcessing) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null || code.isEmpty) return;
    _processQR(code);
  }

  void _processQR(String code) {
    if (_hasScanned || _isProcessing) return;
    setState(() => _isProcessing = true);
    _ctrl.stop();

    final result = ref.read(riderProvider.notifier).confirmQR(code);
    setState(() => _hasScanned = true);

    if (result.success) {
      // Navigate to success screen, clearing scanner from stack
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => RiderDeliverySuccessScreen(
            order: widget.order,
          ),
        ),
      );
    } else {
      setState(() {
        _errorMessage = result.message;
        _isProcessing = false;
        _hasScanned = false;
      });
      _ctrl.start();
    }
  }

  /// Demo helper – simulates scanning the correct QR.
  void _useDemoCode() {
    _processQR(widget.order.qrCode);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // ── Camera scanner view ────────────────────────────────────────
          MobileScanner(
            controller: _ctrl,
            onDetect: _onDetect,
          ),

          // ── Overlay ────────────────────────────────────────────────────
          CustomPaint(
            painter: _ScanOverlayPainter(),
            child: const SizedBox.expand(),
          ),

          SafeArea(
            child: Column(
              children: [
                // ── Top bar ────────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.black45,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close_rounded,
                              color: Colors.white, size: 22),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.black45,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          widget.order.orderCode,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // ── Center instruction ─────────────────────────────────
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 40),
                  child: Text(
                    'Scan the patient\'s QR code',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Position the QR code inside the frame',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7),
                    fontSize: 13,
                  ),
                ),

                const Spacer(flex: 3),

                // ── Bottom panel ───────────────────────────────────────
                Container(
                  padding:
                      const EdgeInsets.fromLTRB(20, 20, 20, 12),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(
                        top: Radius.circular(24)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Patient info
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8F5EE),
                              borderRadius:
                                  BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.person_outline_rounded,
                              color: Color(0xFF1E9E68),
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.order.customerNameMasked,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                  color: Colors.black87,
                                ),
                              ),
                              Text(
                                widget.order.orderCode,
                                style: TextStyle(
                                    color: Colors.grey.shade500,
                                    fontSize: 12),
                              ),
                            ],
                          ),
                        ],
                      ),

                      if (_errorMessage != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius:
                                BorderRadius.circular(12),
                            border: Border.all(
                                color: Colors.red.shade200),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.error_outline,
                                  color: Colors.red.shade600,
                                  size: 18),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: TextStyle(
                                    color: Colors.red.shade700,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      const SizedBox(height: 16),

                      // Demo button (for testing without real QR)
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(
                                color: Color(0xFF1E9E68)),
                            foregroundColor:
                                const Color(0xFF1E9E68),
                            padding: const EdgeInsets.symmetric(
                                vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(12),
                            ),
                          ),
                          onPressed:
                              _isProcessing ? null : _useDemoCode,
                          icon: const Icon(
                              Icons.qr_code_rounded,
                              size: 18),
                          label: const Text(
                            'Use Demo Code (for testing)',
                            style: TextStyle(
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),

                      const SizedBox(height: 8),

                      if (_isProcessing)
                        const Padding(
                          padding: EdgeInsets.all(8),
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Color(0xFF1E9E68),
                          ),
                        ),

                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text(
                          'Cancel',
                          style: TextStyle(
                              color: Colors.grey.shade600),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Scan overlay painter ─────────────────────────────────────────────────────

class _ScanOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.black54;
    const cutoutSize = 260.0;
    final cutoutLeft = (size.width - cutoutSize) / 2;
    final cutoutTop = size.height * 0.25;
    final cutoutRect = Rect.fromLTWH(
        cutoutLeft, cutoutTop, cutoutSize, cutoutSize);

    // Dark overlay
    final fullRect = Rect.fromLTWH(0, 0, size.width, size.height);
    final path = Path()
      ..addRect(fullRect)
      ..addRRect(
          RRect.fromRectAndRadius(cutoutRect, const Radius.circular(16)));
    canvas.drawPath(
        path, paint..blendMode = BlendMode.srcOver);

    // Corner guides
    final cornerPaint = Paint()
      ..color = const Color(0xFF1E9E68)
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const cornerLength = 28.0;
    final r = const Radius.circular(4);
    const o = 0.0;

    // Top-left
    canvas.drawLine(
        Offset(cutoutLeft + o, cutoutTop + cornerLength),
        Offset(cutoutLeft + o, cutoutTop + o),
        cornerPaint);
    canvas.drawLine(
        Offset(cutoutLeft + o, cutoutTop + o),
        Offset(cutoutLeft + cornerLength, cutoutTop + o),
        cornerPaint);

    // Top-right
    canvas.drawLine(
        Offset(cutoutLeft + cutoutSize - cornerLength, cutoutTop + o),
        Offset(cutoutLeft + cutoutSize + o, cutoutTop + o),
        cornerPaint);
    canvas.drawLine(
        Offset(cutoutLeft + cutoutSize + o, cutoutTop + o),
        Offset(
            cutoutLeft + cutoutSize + o, cutoutTop + cornerLength),
        cornerPaint);

    // Bottom-left
    canvas.drawLine(
        Offset(cutoutLeft + o,
            cutoutTop + cutoutSize - cornerLength),
        Offset(cutoutLeft + o, cutoutTop + cutoutSize + o),
        cornerPaint);
    canvas.drawLine(
        Offset(cutoutLeft + o, cutoutTop + cutoutSize + o),
        Offset(cutoutLeft + cornerLength, cutoutTop + cutoutSize + o),
        cornerPaint);

    // Bottom-right
    canvas.drawLine(
        Offset(cutoutLeft + cutoutSize - cornerLength,
            cutoutTop + cutoutSize + o),
        Offset(
            cutoutLeft + cutoutSize + o, cutoutTop + cutoutSize + o),
        cornerPaint);
    canvas.drawLine(
        Offset(
            cutoutLeft + cutoutSize + o, cutoutTop + cutoutSize + o),
        Offset(cutoutLeft + cutoutSize + o,
            cutoutTop + cutoutSize - cornerLength),
        cornerPaint);

    final _ = r; // suppress unused warning
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
