
import 'package:flutter/material.dart';

class ResponsiveWebWrapper extends StatelessWidget {
  final Widget child;
  final double maxWidth;

  const ResponsiveWebWrapper({
    super.key,
    required this.child,
    this.maxWidth = 1000.0,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    );
  }
}
