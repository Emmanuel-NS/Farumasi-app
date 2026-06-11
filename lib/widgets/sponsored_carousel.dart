import 'dart:async';

import 'package:flutter/material.dart';

import '../api/repositories/patient_repository.dart';
import '../models/health_article.dart';
import '../models/models.dart';
import '../screens/health_article_detail_screen.dart';

/// Matches portal `SponsoredCarousel` — pinned sponsored health strip on store/health.
class SponsoredCarousel extends StatefulWidget {
  const SponsoredCarousel({super.key, this.margin = const EdgeInsets.fromLTRB(16, 0, 16, 12)});

  final EdgeInsets margin;

  @override
  State<SponsoredCarousel> createState() => _SponsoredCarouselState();
}

class _SponsoredCarouselState extends State<SponsoredCarousel> {
  static const _rotateMs = Duration(seconds: 6);

  List<SponsoredArticle> _items = [];
  int _index = 0;
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final items = await PatientRepository.instance.fetchSponsoredArticles();
      if (!mounted) return;
      setState(() {
        _items = items;
        _index = 0;
        _loading = false;
      });
      _restartTimer();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _items = const [];
        _loading = false;
      });
    }
  }

  void _restartTimer() {
    _timer?.cancel();
    if (_items.length <= 1) return;
    _timer = Timer.periodic(_rotateMs, (_) {
      if (!mounted) return;
      setState(() => _index = (_index + 1) % _items.length);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Padding(
        padding: widget.margin,
        child: Container(
          height: 128,
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFDE68A)),
          ),
          child: const Center(
            child: SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Color(0xFF1E9E68),
              ),
            ),
          ),
        ),
      );
    }

    if (_items.isEmpty) return const SizedBox.shrink();

    final current = _items[_index];

    return Padding(
      padding: widget.margin,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => HealthArticleDetailScreen(
                  articleId: current.id,
                  initialArticle: HealthArticle(
                    id: current.id,
                    title: current.title,
                    subtitle: 'Sponsored',
                    summary: current.summary,
                    fullContent: current.summary,
                    imageUrl: current.imageUrl,
                    source: 'Farumasi',
                    category: 'General Health',
                  ),
                ),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFCD34D)),
              gradient: const LinearGradient(
                colors: [Color(0xFFFFFBEB), Colors.white, Color(0xFFEDFDF6)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.horizontal(
                        left: Radius.circular(16),
                      ),
                      child: Image.network(
                        current.imageUrl,
                        width: 120,
                        height: 112,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 120,
                          height: 112,
                          color: const Color(0xFFEDFDF6),
                          child: const Icon(
                            Icons.auto_awesome,
                            color: Color(0xFF1E9E68),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.auto_awesome,
                                    size: 12,
                                    color: Color(0xFF92400E),
                                  ),
                                  SizedBox(width: 4),
                                  Text(
                                    'SPONSORED',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF92400E),
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              current.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              current.summary,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Row(
                              children: [
                                Text(
                                  'Read more',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF1E9E68),
                                  ),
                                ),
                                Icon(
                                  Icons.chevron_right,
                                  size: 16,
                                  color: Color(0xFF1E9E68),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                if (_items.length > 1)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_items.length, (i) {
                        final active = i == _index;
                        return GestureDetector(
                          onTap: () => setState(() => _index = i),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: active ? 22 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: active
                                  ? const Color(0xFF1E9E68)
                                  : const Color(0xFFCBD5E1),
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                        );
                      }),
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
