import 'package:flutter/material.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

/// Extracts a YouTube video id from common URL formats.
String? parseYoutubeVideoId(String url) {
  final trimmed = url.trim();
  if (trimmed.isEmpty) return null;

  final fromPackage = YoutubePlayerController.convertUrlToId(trimmed);
  if (fromPackage != null && fromPackage.length == 11) return fromPackage;

  final uri = Uri.tryParse(trimmed);
  if (uri != null) {
    if (uri.host.contains('youtu.be') && uri.pathSegments.isNotEmpty) {
      final id = uri.pathSegments.first;
      if (RegExp(r'^[a-zA-Z0-9_-]{11}$').hasMatch(id)) return id;
    }
    final v = uri.queryParameters['v'];
    if (v != null && RegExp(r'^[a-zA-Z0-9_-]{11}$').hasMatch(v)) return v;
  }

  final match = RegExp(
    r'(?:youtube\.com/(?:watch\?v=|embed/|shorts/|live/)|youtu\.be/)([a-zA-Z0-9_-]{11})',
  ).firstMatch(trimmed);
  return match?.group(1);
}

/// Inline YouTube player — uses iframe API with privacy-enhanced origin so
/// mobile WebViews don't show "Video unavailable" (YouTube errors 15/152/153).
class EmbeddedYoutubePlayer extends StatefulWidget {
  const EmbeddedYoutubePlayer({
    super.key,
    required this.videoId,
    this.title = 'Video',
  });

  final String videoId;
  final String title;

  @override
  State<EmbeddedYoutubePlayer> createState() => _EmbeddedYoutubePlayerState();
}

class _EmbeddedYoutubePlayerState extends State<EmbeddedYoutubePlayer> {
  late final YoutubePlayerController _controller;

  @override
  void initState() {
    super.initState();
    _controller = YoutubePlayerController.fromVideoId(
      videoId: widget.videoId,
      autoPlay: false,
      params: const YoutubePlayerParams(
        origin: 'https://www.youtube-nocookie.com',
        strictRelatedVideos: true,
        showControls: true,
        showFullscreenButton: true,
        enableCaption: true,
        playsInline: true,
        mute: false,
      ),
    );
  }

  @override
  void dispose() {
    _controller.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return YoutubePlayer(
      controller: _controller,
      aspectRatio: 16 / 9,
      backgroundColor: Colors.black,
    );
  }
}
