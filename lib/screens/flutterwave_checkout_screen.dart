import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// In-app Flutterwave hosted checkout.
class FlutterwaveCheckoutScreen extends StatefulWidget {
  const FlutterwaveCheckoutScreen({
    super.key,
    required this.checkoutUrl,
    this.onComplete,
  });

  final String checkoutUrl;
  final VoidCallback? onComplete;

  @override
  State<FlutterwaveCheckoutScreen> createState() =>
      _FlutterwaveCheckoutScreenState();
}

class _FlutterwaveCheckoutScreenState extends State<FlutterwaveCheckoutScreen> {
  late final WebViewController _controller;
  var _loading = true;

  bool _isReturnUrl(String url) {
    final u = url.toLowerCase();
    return u.contains('payment-return') ||
        u.contains('payment_return=1') ||
        u.contains('status=successful') ||
        u.contains('status=cancelled');
  }

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (_) => setState(() => _loading = false),
          onNavigationRequest: (request) {
            if (_isReturnUrl(request.url)) {
              widget.onComplete?.call();
              if (mounted) Navigator.of(context).pop(true);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text(
          'Secure payment',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading)
            const Center(
              child: CircularProgressIndicator(color: Color(0xFF1E9E68)),
            ),
        ],
      ),
    );
  }
}
