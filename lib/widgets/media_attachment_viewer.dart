import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/repositories/patient_repository.dart';

void showFullScreenImage(BuildContext context, String imageUrl, {String? title}) {
  final resolved = PatientRepository.resolveMediaUrl(imageUrl);
  if (resolved.isEmpty) return;

  Navigator.of(context).push(
    MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (ctx) => _FullScreenImagePage(url: resolved, title: title),
    ),
  );
}

Future<void> openAttachmentExternally(String url, {String? name}) async {
  final resolved = PatientRepository.resolveMediaUrl(url);
  if (resolved.isEmpty) return;
  final uri = Uri.tryParse(resolved);
  if (uri == null) return;
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class _FullScreenImagePage extends StatelessWidget {
  const _FullScreenImagePage({required this.url, this.title});

  final String url;
  final String? title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(title ?? 'Photo', style: const TextStyle(fontSize: 16)),
        actions: [
          IconButton(
            tooltip: 'Open in browser',
            onPressed: () => openAttachmentExternally(url, name: title),
            icon: const Icon(Icons.open_in_new),
          ),
        ],
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 4,
          child: Image.network(
            url,
            fit: BoxFit.contain,
            loadingBuilder: (context, child, progress) {
              if (progress == null) return child;
              return const Center(
                child: CircularProgressIndicator(color: Colors.white),
              );
            },
            errorBuilder: (_, __, ___) => const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.broken_image, color: Colors.white54, size: 48),
                SizedBox(height: 12),
                Text('Could not load image', style: TextStyle(color: Colors.white70)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class AttachmentFileChip extends StatelessWidget {
  const AttachmentFileChip({
    super.key,
    required this.name,
    required this.url,
    this.isPatientBubble = false,
    this.sizeLabel,
  });

  final String name;
  final String url;
  final bool isPatientBubble;
  final String? sizeLabel;

  @override
  Widget build(BuildContext context) {
    final bg = isPatientBubble ? Colors.white.withValues(alpha: 0.15) : const Color(0xFFF1F5F9);
    final fg = isPatientBubble ? Colors.white : const Color(0xFF334155);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => openAttachmentExternally(url, name: name),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.description_outlined, size: 22, color: fg),
              const SizedBox(width: 8),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: fg),
                    ),
                    if (sizeLabel != null)
                      Text(sizeLabel!, style: TextStyle(fontSize: 10, color: fg.withValues(alpha: 0.7))),
                    Text(
                      'Tap to open',
                      style: TextStyle(fontSize: 10, color: fg.withValues(alpha: 0.7)),
                    ),
                  ],
                ),
              ),
              Icon(Icons.open_in_new, size: 16, color: fg.withValues(alpha: 0.8)),
            ],
          ),
        ),
      ),
    );
  }
}
