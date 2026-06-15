import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../api/repositories/patient_repository.dart';

/// Memory- and bandwidth-friendly network image with disk cache.
class LiteNetworkImage extends StatelessWidget {
  const LiteNetworkImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.placeholder,
    this.error,
    this.memCacheWidth,
  });

  final String? url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final Widget? placeholder;
  final Widget? error;
  final int? memCacheWidth;

  @override
  Widget build(BuildContext context) {
    final resolved = PatientRepository.resolveMediaUrl(url);
    if (resolved.isEmpty) {
      return error ?? _defaultError();
    }

    final dpr = MediaQuery.devicePixelRatioOf(context);
    final cacheW = memCacheWidth ??
        (width != null ? (width! * dpr).round().clamp(120, 800) : 480);

    Widget image = CachedNetworkImage(
      imageUrl: resolved,
      width: width,
      height: height,
      fit: fit,
      memCacheWidth: cacheW,
      maxWidthDiskCache: 900,
      maxHeightDiskCache: 900,
      fadeInDuration: const Duration(milliseconds: 180),
      placeholder: (_, __) => placeholder ?? _defaultPlaceholder(),
      errorWidget: (_, __, ___) => error ?? _defaultError(),
    );

    if (borderRadius != null) {
      image = ClipRRect(borderRadius: borderRadius!, child: image);
    }
    return image;
  }

  Widget _defaultPlaceholder() {
    return Container(
      color: const Color(0xFFF1F5F9),
      alignment: Alignment.center,
      child: const SizedBox(
        width: 18,
        height: 18,
        child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1E9E68)),
      ),
    );
  }

  Widget _defaultError() {
    return Container(
      color: const Color(0xFFF1F5F9),
      alignment: Alignment.center,
      child: Icon(Icons.image_outlined, color: Colors.grey.shade400, size: 22),
    );
  }
}
