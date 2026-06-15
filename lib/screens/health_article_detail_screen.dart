import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../api/repositories/patient_repository.dart';
import '../models/health_article.dart';
import '../providers/auth_provider.dart';
import '../core/app_navigation.dart';
import '../widgets/embedded_youtube_player.dart';
import '../widgets/shimmer_loading.dart';
import '../widgets/portal/portal_ui.dart';

class CategoryAccent {
  const CategoryAccent({
    required this.chipBg,
    required this.chipFg,
    required this.bg,
    required this.bar,
  });

  final Color chipBg;
  final Color chipFg;
  final Color bg;
  final Color bar;
}

const _categoryAccents = <String, CategoryAccent>{
  'General Health': CategoryAccent(
    chipBg: PortalColors.green,
    chipFg: Colors.white,
    bg: PortalColors.greenLight,
    bar: PortalColors.green,
  ),
  'Wellness': CategoryAccent(
    chipBg: PortalColors.green,
    chipFg: Colors.white,
    bg: PortalColors.greenLight,
    bar: PortalColors.green,
  ),
  'Remedies': CategoryAccent(
    chipBg: Color(0xFF2563EB),
    chipFg: Colors.white,
    bg: Color(0xFFEFF6FF),
    bar: Color(0xFF3B82F6),
  ),
  'Chronic Care': CategoryAccent(
    chipBg: Color(0xFF2563EB),
    chipFg: Colors.white,
    bg: Color(0xFFEFF6FF),
    bar: Color(0xFF3B82F6),
  ),
  'SRH': CategoryAccent(
    chipBg: Color(0xFFE11D48),
    chipFg: Colors.white,
    bg: Color(0xFFFFF1F2),
    bar: Color(0xFFF43F5E),
  ),
  'Mental Health': CategoryAccent(
    chipBg: Color(0xFF7C3AED),
    chipFg: Colors.white,
    bg: Color(0xFFF5F3FF),
    bar: Color(0xFF8B5CF6),
  ),
  'Nutrition': CategoryAccent(
    chipBg: Color(0xFFF97316),
    chipFg: Colors.white,
    bg: Color(0xFFFFF7ED),
    bar: Color(0xFFF97316),
  ),
  'Mother & Babies': CategoryAccent(
    chipBg: Color(0xFFEC4899),
    chipFg: Colors.white,
    bg: Color(0xFFFDF2F8),
    bar: Color(0xFFEC4899),
  ),
  'Did You Know?': CategoryAccent(
    chipBg: Color(0xFFF59E0B),
    chipFg: Colors.white,
    bg: Color(0xFFFFFBEB),
    bar: Color(0xFFF59E0B),
  ),
};

const _defaultAccent = CategoryAccent(
  chipBg: PortalColors.green,
  chipFg: Colors.white,
  bg: PortalColors.greenLight,
  bar: PortalColors.green,
);

CategoryAccent categoryAccent(String category) =>
    _categoryAccents[category] ?? _defaultAccent;

String compactNumber(int n) {
  if (n < 1000) return '$n';
  if (n < 1000000) {
    final v = n / 1000;
    return '${v.toStringAsFixed(n < 10000 ? 1 : 0)}k';
  }
  return '${(n / 1000000).toStringAsFixed(1)}M';
}

String timeAgo(DateTime d) {
  final s = DateTime.now().difference(d).inSeconds.clamp(1, 999999999);
  if (s < 60) return '${s}s ago';
  final m = s ~/ 60;
  if (m < 60) return '${m}m ago';
  final h = m ~/ 60;
  if (h < 24) return '${h}h ago';
  final days = h ~/ 24;
  if (days < 30) return '${days}d ago';
  final months = days ~/ 30;
  if (months < 12) return '${months}mo ago';
  return '${months ~/ 12}y ago';
}

String? youtubeId(String url) => parseYoutubeVideoId(url);

class HealthArticleDetailScreen extends ConsumerStatefulWidget {
  const HealthArticleDetailScreen({
    super.key,
    required this.articleId,
    this.initialArticle,
  });

  final String articleId;
  final HealthArticle? initialArticle;

  @override
  ConsumerState<HealthArticleDetailScreen> createState() =>
      _HealthArticleDetailScreenState();
}

class _HealthArticleDetailScreenState extends ConsumerState<HealthArticleDetailScreen> {
  HealthArticle? _article;
  List<HealthArticle> _related = [];
  List<PatientArticleComment> _comments = [];
  bool _loading = true;
  bool _notFound = false;
  bool _commentsLoading = false;
  bool _postingComment = false;
  final _commentController = TextEditingController();
  bool _viewTracked = false;

  @override
  void initState() {
    super.initState();
    _article = widget.initialArticle;
    _load();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _article == null;
      _notFound = false;
    });

    final fetched = await PatientRepository.instance.fetchArticleByIdOrSlug(widget.articleId);
    if (!mounted) return;

    if (fetched != null) {
      final article = HealthArticle.fromPatientArticle(fetched);
      setState(() {
        _article = article;
        _loading = false;
      });
      _trackView(article);
      _loadRelated(article);
      _loadComments(article.id);
      return;
    }

    if (_article != null) {
      setState(() => _loading = false);
      _loadRelated(_article!);
      return;
    }

    setState(() {
      _loading = false;
      _notFound = true;
    });
  }

  Future<void> _trackView(HealthArticle article) async {
    if (_viewTracked) return;
    _viewTracked = true;
    try {
      final updated = await PatientRepository.instance.trackArticleView(article.id);
      if (!mounted) return;
      setState(() {
        _article = _article?.copyWith(viewCount: updated.viewCount);
      });
    } catch (_) {}
  }

  Future<void> _loadRelated(HealthArticle article) async {
    try {
      final items = await PatientRepository.instance.fetchArticles(
        category: article.category,
        limit: 6,
      );
      if (!mounted) return;
      setState(() {
        _related = items
            .map(HealthArticle.fromPatientArticle)
            .where((a) => a.id != article.id)
            .take(3)
            .toList();
      });
    } catch (_) {
      if (mounted) setState(() => _related = []);
    }
  }

  Future<void> _loadComments(String id) async {
    setState(() => _commentsLoading = true);
    final comments = await PatientRepository.instance.fetchArticleComments(id);
    if (!mounted) return;
    setState(() {
      _comments = comments;
      _commentsLoading = false;
    });
  }

  bool get _isGuest => ref.read(authProvider).status != AuthStatus.authenticated;

  void _requireAuth(VoidCallback action) {
    if (_isGuest) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to continue')),
      );
      return;
    }
    action();
  }

  Future<void> _toggleLike() async {
    final article = _article;
    if (article == null) return;
    _requireAuth(() async {
      final wasLiked = article.isLiked;
      setState(() {
        _article = article.copyWith(
          isLiked: !wasLiked,
          likeCount: (article.likeCount + (wasLiked ? -1 : 1)).clamp(0, 999999999),
        );
      });
      try {
        final updated = wasLiked
            ? await PatientRepository.instance.unlikeArticle(article.id)
            : await PatientRepository.instance.likeArticle(article.id);
        if (!mounted) return;
        setState(() => _article = HealthArticle.fromPatientArticle(updated));
      } catch (_) {
        if (!mounted) return;
        setState(() => _article = article);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Couldn't update like")),
        );
      }
    });
  }

  Future<void> _toggleSave() async {
    final article = _article;
    if (article == null) return;
    _requireAuth(() async {
      final wasSaved = article.isSaved;
      setState(() => _article = article.copyWith(isSaved: !wasSaved));
      try {
        final updated = wasSaved
            ? await PatientRepository.instance.unsaveArticle(article.id)
            : await PatientRepository.instance.saveArticle(article.id);
        if (!mounted) return;
        setState(() => _article = HealthArticle.fromPatientArticle(updated));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(wasSaved ? 'Removed from saved' : 'Saved for later')),
        );
      } catch (_) {
        if (!mounted) return;
        setState(() => _article = article);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Couldn't update bookmark")),
        );
      }
    });
  }

  Future<void> _share() async {
    final article = _article;
    if (article == null) return;
    const link = 'https://app.farumasi.com/health/';
    final url = '$link${article.slug.isNotEmpty ? article.slug : article.id}';
    await Clipboard.setData(ClipboardData(text: url));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link copied to clipboard')),
      );
    }
    try {
      final updated = await PatientRepository.instance.shareArticle(article.id);
      if (!mounted) return;
      setState(() => _article = _article?.copyWith(shareCount: updated.shareCount));
    } catch (_) {}
  }

  Future<void> _postComment() async {
    final article = _article;
    if (article == null) return;
    _requireAuth(() async {
      final text = _commentController.text.trim();
      if (text.isEmpty) return;
      setState(() => _postingComment = true);
      try {
        final c = await PatientRepository.instance.addArticleComment(article.id, text);
        if (!mounted) return;
        setState(() {
          _comments = [c, ..._comments];
          _commentController.clear();
          _article = article.copyWith(commentCount: article.commentCount + 1);
        });
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Couldn't post comment")),
          );
        }
      } finally {
        if (mounted) setState(() => _postingComment = false);
      }
    });
  }

  void _goBack() => AppNavigation.backToHealth(context);

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: PortalColors.pageBgAlt,
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            ShimmerBox(width: double.infinity, height: 200, borderRadius: 16),
            SizedBox(height: 16),
            ShimmerBox(width: 120, height: 12, borderRadius: 6),
            SizedBox(height: 12),
            ShimmerBox(width: double.infinity, height: 20, borderRadius: 6),
            SizedBox(height: 8),
            ShimmerBox(width: double.infinity, height: 14, borderRadius: 6),
            SizedBox(height: 8),
            ShimmerBox(width: 260, height: 14, borderRadius: 6),
          ],
        ),
      );
    }

    if (_notFound || _article == null) {
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) _goBack();
        },
        child: Scaffold(
        backgroundColor: PortalColors.pageBgAlt,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.menu_book_outlined, size: 64, color: PortalColors.slate200),
              const SizedBox(height: 16),
              const Text('Article not found', style: TextStyle(fontWeight: FontWeight.w600, color: PortalColors.slate500)),
              TextButton(
                onPressed: _goBack,
                child: const Text('← Back to Health', style: TextStyle(color: PortalColors.green, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ),
      ),
      );
    }

    final article = _article!;
    final accent = categoryAccent(article.category);
    final ytId = article.videoUrl != null ? youtubeId(article.videoUrl!) : null;
    final isDyk = article.articleType == 'did_you_know' || article.category == 'Did You Know?';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _goBack();
      },
      child: Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (ytId != null)
              _VideoHero(ytId: ytId, title: article.title, onBack: _goBack)
            else
              _ImageHero(
                article: article,
                accent: accent,
                isDyk: isDyk,
                onBack: _goBack,
              ),
            Transform.translate(
              offset: ytId != null ? Offset.zero : const Offset(0, -56),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: ytId != null ? null : const BorderRadius.vertical(top: Radius.circular(32)),
                  boxShadow: ytId != null
                      ? null
                      : [
                          BoxShadow(
                            color: PortalColors.slate900.withValues(alpha: 0.12),
                            blurRadius: 30,
                            offset: const Offset(0, -4),
                          ),
                        ],
                ),
                constraints: const BoxConstraints(minHeight: 400),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 760),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 48),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (ytId != null) _VideoMetaRow(article: article, accent: accent),
                          _ArticleHeader(article: article),
                          _MetaRow(article: article),
                          _ActionPills(
                            article: article,
                            onLike: _toggleLike,
                            onSave: _toggleSave,
                            onShare: _share,
                          ),
                          if (article.summary.isNotEmpty) _SummaryCallout(summary: article.summary, accent: accent),
                          _ArticleBody(content: article.fullContent.isNotEmpty ? article.fullContent : article.summary, accent: accent),
                          const SizedBox(height: 48),
                          _VerifiedSourceCard(source: article.source),
                          const SizedBox(height: 40),
                          _CommentsSection(
                            article: article,
                            comments: _comments,
                            loading: _commentsLoading,
                            posting: _postingComment,
                            isGuest: _isGuest,
                            controller: _commentController,
                            onPost: _postComment,
                          ),
                          Center(
                            child: TextButton.icon(
                              onPressed: _goBack,
                              icon: const Icon(Icons.arrow_back, size: 16, color: PortalColors.green),
                              label: const Text(
                                'Back to Discover Wellness',
                                style: TextStyle(color: PortalColors.green, fontWeight: FontWeight.w600, fontSize: 14),
                              ),
                            ),
                          ),
                          if (_related.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            _RelatedSection(
                              articles: _related,
                              onOpen: (a) {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => HealthArticleDetailScreen(
                                      articleId: a.slug.isNotEmpty ? a.slug : a.id,
                                      initialArticle: a,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
    );
  }
}

class _VideoHero extends StatelessWidget {
  const _VideoHero({required this.ytId, required this.title, required this.onBack});

  final String ytId;
  final String title;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        AspectRatio(
          aspectRatio: 16 / 9,
          child: ColoredBox(
            color: Colors.black,
            child: EmbeddedYoutubePlayer(
              videoId: ytId,
              title: title,
            ),
          ),
        ),
        Positioned(
          top: 16,
          left: 16,
          child: _BackPill(onBack: onBack),
        ),
      ],
    );
  }
}

class _ImageHero extends StatelessWidget {
  const _ImageHero({
    required this.article,
    required this.accent,
    required this.isDyk,
    required this.onBack,
  });

  final HealthArticle article;
  final CategoryAccent accent;
  final bool isDyk;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final extraCats = article.categories.where((c) => c != article.category).take(2);

    return SizedBox(
      height: 420,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (article.imageUrl.isNotEmpty)
            Image.network(
              article.imageUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => ColoredBox(color: accent.bg),
            )
          else
            ColoredBox(
              color: accent.bg,
              child: Center(
                child: Icon(
                  isDyk ? Icons.lightbulb_outline : Icons.menu_book_outlined,
                  size: 112,
                  color: isDyk ? const Color(0xFFFCD34D) : PortalColors.green.withValues(alpha: 0.35),
                ),
              ),
            ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.5),
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.55),
                  Colors.black.withValues(alpha: 0.75),
                ],
                stops: const [0, 0.38, 0.8, 1],
              ),
            ),
          ),
          Positioned(top: 16, left: 16, child: _BackPill(onBack: onBack)),
          Positioned(
            left: 20,
            right: 20,
            bottom: 68,
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                _CategoryChip(label: article.category, accent: accent),
                ...extraCats.map(
                  (c) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: Colors.white30),
                    ),
                    child: Text(
                      c.toUpperCase(),
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 0.6),
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.access_time, size: 12, color: Colors.white.withValues(alpha: 0.8)),
                      const SizedBox(width: 6),
                      Text(
                        '${article.readTimeMin} min read',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white.withValues(alpha: 0.9)),
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

class _BackPill extends StatelessWidget {
  const _BackPill({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.35),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onBack,
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(10, 8, 16, 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.arrow_back, size: 16, color: Colors.white.withValues(alpha: 0.95)),
              const SizedBox(width: 6),
              const Text('Health', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.label, required this.accent});

  final String label;
  final CategoryAccent accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(color: accent.chipBg, borderRadius: BorderRadius.circular(999)),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: accent.chipFg, letterSpacing: 0.8),
      ),
    );
  }
}

class _VideoMetaRow extends StatelessWidget {
  const _VideoMetaRow({required this.article, required this.accent});

  final HealthArticle article;
  final CategoryAccent accent;

  @override
  Widget build(BuildContext context) {
    final extraCats = article.categories.where((c) => c != article.category).take(2);
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 20, 0, 16),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          _CategoryChip(label: article.category, accent: accent),
          ...extraCats.map(
            (c) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: PortalColors.slate100,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                c.toUpperCase(),
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: PortalColors.slate600, letterSpacing: 0.6),
              ),
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.access_time, size: 14, color: PortalColors.slate400),
              const SizedBox(width: 6),
              Text('${article.readTimeMin} min read', style: const TextStyle(fontSize: 13, color: PortalColors.slate400)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ArticleHeader extends StatelessWidget {
  const _ArticleHeader({required this.article});

  final HealthArticle article;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: article.videoUrl != null ? 0 : 32, bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (article.publishedAt != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                DateFormat('d MMMM y').format(article.publishedAt!),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: PortalColors.slate400,
                  letterSpacing: 1.4,
                ),
              ),
            ),
          Text(
            article.title,
            style: const TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.w800,
              height: 1.2,
              color: PortalColors.slate900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            article.subtitle,
            style: const TextStyle(fontSize: 17, color: PortalColors.slate500, height: 1.5),
          ),
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.article});

  final HealthArticle article;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      margin: const EdgeInsets.only(bottom: 8),
      decoration: const BoxDecoration(
        border: Border.symmetric(horizontal: BorderSide(color: PortalColors.slate100)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(color: PortalColors.greenLight, shape: BoxShape.circle),
            child: const Icon(Icons.menu_book_outlined, size: 14, color: PortalColors.green),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              article.source,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PortalColors.slate600),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(' | ', style: TextStyle(color: PortalColors.slate200, fontSize: 13)),
          const Icon(Icons.access_time, size: 14, color: PortalColors.slate400),
          const SizedBox(width: 4),
          Text('${article.readTimeMin} min', style: const TextStyle(fontSize: 13, color: PortalColors.slate400)),
          const Spacer(),
          _Stat(icon: Icons.visibility_outlined, value: compactNumber(article.viewCount)),
          const SizedBox(width: 12),
          _Stat(
            icon: Icons.favorite,
            value: compactNumber(article.likeCount),
            iconColor: article.isLiked ? Colors.red : PortalColors.slate400,
          ),
          const SizedBox(width: 12),
          _Stat(icon: Icons.chat_bubble_outline, value: compactNumber(article.commentCount)),
          const SizedBox(width: 12),
          _Stat(icon: Icons.share_outlined, value: compactNumber(article.shareCount)),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.value, this.iconColor});

  final IconData icon;
  final String value;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: iconColor ?? PortalColors.slate400),
        const SizedBox(width: 4),
        Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PortalColors.slate400)),
      ],
    );
  }
}

class _ActionPills extends StatelessWidget {
  const _ActionPills({
    required this.article,
    required this.onLike,
    required this.onSave,
    required this.onShare,
  });

  final HealthArticle article;
  final VoidCallback onLike;
  final VoidCallback onSave;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 32),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          _PillButton(
            label: '${article.isLiked ? 'Liked' : 'Like'} · ${compactNumber(article.likeCount)}',
            icon: Icons.favorite,
            filled: article.isLiked,
            filledColor: Colors.red,
            onTap: onLike,
          ),
          _PillButton(
            label: article.isSaved ? 'Saved' : 'Save',
            icon: Icons.bookmark,
            filled: article.isSaved,
            filledColor: const Color(0xFFF59E0B),
            onTap: onSave,
          ),
          _PillButton(
            label: 'Share',
            icon: Icons.share_outlined,
            onTap: onShare,
          ),
        ],
      ),
    );
  }
}

class _PillButton extends StatelessWidget {
  const _PillButton({
    required this.label,
    required this.icon,
    required this.onTap,
    this.filled = false,
    this.filledColor,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool filled;
  final Color? filledColor;

  @override
  Widget build(BuildContext context) {
    final bg = filled ? (filledColor ?? PortalColors.green) : PortalColors.slate100;
    final fg = filled ? Colors.white : PortalColors.slate700;
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: fg),
              const SizedBox(width: 6),
              Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: fg)),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryCallout extends StatelessWidget {
  const _SummaryCallout({required this.summary, required this.accent});

  final String summary;
  final CategoryAccent accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 32),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: accent.bg, borderRadius: BorderRadius.circular(16)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(width: 3, height: 48, decoration: BoxDecoration(color: accent.bar, borderRadius: BorderRadius.circular(999))),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              summary,
              style: const TextStyle(fontSize: 16, color: PortalColors.slate700, height: 1.85, fontStyle: FontStyle.italic, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

class _ArticleBody extends StatelessWidget {
  const _ArticleBody({required this.content, required this.accent});

  final String content;
  final CategoryAccent accent;

  @override
  Widget build(BuildContext context) {
    final lines = content.split('\n');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < lines.length; i++) ...[
          if (lines[i].trim().isEmpty)
            const SizedBox(height: 12)
          else if (RegExp(r'^\*\*(.+?)\*\*$').hasMatch(lines[i].trim()))
            _SectionHeader(
              title: RegExp(r'^\*\*(.+?)\*\*$').firstMatch(lines[i].trim())!.group(1)!,
              accent: accent,
            )
          else
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: _RichLine(text: lines[i]),
            ),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.accent});

  final String title;
  final CategoryAccent accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 32, bottom: 8),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(color: accent.bg, borderRadius: BorderRadius.circular(14)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(width: 3, height: 22, decoration: BoxDecoration(color: accent.bar, borderRadius: BorderRadius.circular(999))),
          const SizedBox(width: 12),
          Expanded(
            child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: PortalColors.slate900, height: 1.3)),
          ),
        ],
      ),
    );
  }
}

class _RichLine extends StatelessWidget {
  const _RichLine({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final parts = text.split(RegExp(r'(\*\*[^*]+\*\*)'));
    return RichText(
      text: TextSpan(
        style: const TextStyle(fontSize: 16, color: PortalColors.slate600, height: 1.9),
        children: parts.map((part) {
          final m = RegExp(r'^\*\*(.+?)\*\*$').firstMatch(part);
          if (m != null) {
            return TextSpan(text: m.group(1), style: const TextStyle(fontWeight: FontWeight.w600, color: PortalColors.slate800));
          }
          return TextSpan(text: part);
        }).toList(),
      ),
    );
  }
}

class _VerifiedSourceCard extends StatelessWidget {
  const _VerifiedSourceCard({required this.source});

  final String source;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [PortalColors.greenLight, Colors.white],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: PortalColors.slate100),
        boxShadow: [
          BoxShadow(color: PortalColors.slate900.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: PortalColors.green,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: PortalColors.green.withValues(alpha: 0.35), blurRadius: 12, offset: const Offset(0, 4)),
              ],
            ),
            child: const Icon(Icons.verified_user, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'VERIFIED SOURCE',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: PortalColors.green, letterSpacing: 0.8),
                ),
                const SizedBox(height: 2),
                Text(source, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: PortalColors.slate900)),
                const SizedBox(height: 4),
                const Text(
                  'Reviewed by medical professionals for clinical accuracy.',
                  style: TextStyle(fontSize: 13, color: PortalColors.slate400, height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentsSection extends StatelessWidget {
  const _CommentsSection({
    required this.article,
    required this.comments,
    required this.loading,
    required this.posting,
    required this.isGuest,
    required this.controller,
    required this.onPost,
  });

  final HealthArticle article;
  final List<PatientArticleComment> comments;
  final bool loading;
  final bool posting;
  final bool isGuest;
  final TextEditingController controller;
  final VoidCallback onPost;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.chat_bubble_outline, size: 18, color: PortalColors.green),
            const SizedBox(width: 8),
            Text(
              'Comments (${compactNumber(article.commentCount)})',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: PortalColors.slate900),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                enabled: !isGuest && !posting,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: isGuest ? 'Sign in to comment' : 'Share your thoughts…',
                  filled: true,
                  fillColor: isGuest ? PortalColors.slate100 : Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: PortalColors.slate200),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: PortalColors.slate200),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: PortalColors.green),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: controller,
              builder: (context, value, _) {
                final canPost = !isGuest && !posting && value.text.trim().isNotEmpty;
                return Material(
                  color: canPost ? PortalColors.green : PortalColors.slate200,
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: canPost ? onPost : null,
                    customBorder: const CircleBorder(),
                    child: SizedBox(
                      width: 40,
                      height: 40,
                      child: posting
                          ? const Padding(
                              padding: EdgeInsets.all(10),
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Icon(Icons.send_rounded, size: 18, color: isGuest ? PortalColors.slate400 : Colors.white),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 20),
        if (loading)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: PortalColors.slate400)),
                  SizedBox(width: 8),
                  Text('Loading comments…', style: TextStyle(color: PortalColors.slate400, fontSize: 14)),
                ],
              ),
            ),
          )
        else if (comments.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Text('Be the first to comment.', style: TextStyle(color: PortalColors.slate400, fontSize: 14)),
            ),
          )
        else
          Column(
            children: comments.map((c) => _CommentTile(comment: c)).toList(),
          ),
      ],
    );
  }
}

class _CommentTile extends StatelessWidget {
  const _CommentTile({required this.comment});

  final PatientArticleComment comment;

  @override
  Widget build(BuildContext context) {
    final name = (comment.userName ?? 'Patient').trim();
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: PortalColors.slate100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: PortalColors.greenLight,
                child: Text(initial, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: PortalColors.green)),
              ),
              const SizedBox(width: 8),
              Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PortalColors.slate800)),
              const SizedBox(width: 6),
              Text('· ${timeAgo(comment.createdAt)}', style: const TextStyle(fontSize: 11, color: PortalColors.slate400)),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(left: 36, top: 4),
            child: Text(comment.content, style: const TextStyle(fontSize: 14, color: PortalColors.slate700, height: 1.35)),
          ),
        ],
      ),
    );
  }
}

class _RelatedSection extends StatelessWidget {
  const _RelatedSection({required this.articles, required this.onOpen});

  final List<HealthArticle> articles;
  final ValueChanged<HealthArticle> onOpen;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text('More to read', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: PortalColors.slate900)),
            const Spacer(),
            TextButton(
              onPressed: () => AppNavigation.backToHealth(context),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('See all', style: TextStyle(color: PortalColors.green, fontWeight: FontWeight.w600, fontSize: 13)),
                  Icon(Icons.chevron_right, size: 18, color: PortalColors.green),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...articles.map(
          (article) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _RelatedCard(article: article, onTap: () => onOpen(article)),
          ),
        ),
      ],
    );
  }
}

class _RelatedCard extends StatelessWidget {
  const _RelatedCard({required this.article, required this.onTap});

  final HealthArticle article;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = categoryAccent(article.category);
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: PortalColors.slate100),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                height: 150,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (article.imageUrl.isNotEmpty)
                      Image.network(article.imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => ColoredBox(color: accent.bg))
                    else
                      ColoredBox(color: accent.bg, child: const Icon(Icons.menu_book_outlined, size: 40, color: PortalColors.slate300)),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [Colors.black.withValues(alpha: 0.55), Colors.transparent],
                          stops: const [0, 0.55],
                        ),
                      ),
                    ),
                    Positioned(
                      left: 12,
                      bottom: 12,
                      child: _CategoryChip(label: article.category, accent: accent),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      article.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: PortalColors.slate900, height: 1.3),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.access_time, size: 12, color: PortalColors.slate400),
                        const SizedBox(width: 4),
                        Text('${article.readTimeMin} min', style: const TextStyle(fontSize: 12, color: PortalColors.slate400)),
                        const Spacer(),
                        Icon(Icons.favorite, size: 12, color: PortalColors.slate400),
                        const SizedBox(width: 2),
                        Text(compactNumber(article.likeCount), style: const TextStyle(fontSize: 11, color: PortalColors.slate400)),
                        const SizedBox(width: 8),
                        Icon(Icons.visibility_outlined, size: 12, color: PortalColors.slate400),
                        const SizedBox(width: 2),
                        Text(compactNumber(article.viewCount), style: const TextStyle(fontSize: 11, color: PortalColors.slate400)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
