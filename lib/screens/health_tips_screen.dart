import 'dart:async';

import 'package:flutter/material.dart';
import 'package:farumasi_app/api/repositories/patient_repository.dart';
import 'package:farumasi_app/models/health_article.dart';
import 'package:farumasi_app/screens/health_article_detail_screen.dart';
import 'package:farumasi_app/widgets/app_refresh.dart';
import 'package:farumasi_app/widgets/sponsored_carousel.dart';
import 'package:farumasi_app/widgets/portal/portal_ui.dart';
import 'package:farumasi_app/widgets/shimmer_loading.dart';

String _compactNumber(int n) {
  if (n < 1000) return '$n';
  if (n < 1000000) {
    final v = n / 1000;
    return n < 10000 ? '${v.toStringAsFixed(1)}k' : '${v.round()}k';
  }
  return '${(n / 1000000).toStringAsFixed(1)}M';
}

String _timeAgo(DateTime? d) {
  if (d == null) return '';
  final s = DateTime.now().difference(d).inSeconds;
  if (s < 60) return '${s < 1 ? 1 : s}s';
  final m = s ~/ 60;
  if (m < 60) return '${m}m';
  final h = m ~/ 60;
  if (h < 24) return '${h}h';
  final days = h ~/ 24;
  if (days < 30) return '${days}d';
  final months = days ~/ 30;
  if (months < 12) return '${months}mo';
  return '${months ~/ 12}y';
}

Widget _articleEngagementRow(HealthArticle article, {double iconSize = 14, double fontSize = 11}) {
  return Row(
    children: [
      Icon(
        article.isLiked ? Icons.favorite : Icons.favorite_border,
        size: iconSize,
        color: article.isLiked ? const Color(0xFFF87171) : Colors.white70,
      ),
      const SizedBox(width: 3),
      Text(_compactNumber(article.likeCount), style: TextStyle(fontSize: fontSize, color: Colors.white70, fontWeight: FontWeight.w600)),
      const SizedBox(width: 10),
      Icon(Icons.chat_bubble_outline, size: iconSize, color: Colors.white70),
      const SizedBox(width: 3),
      Text(_compactNumber(article.commentCount), style: TextStyle(fontSize: fontSize, color: Colors.white70, fontWeight: FontWeight.w600)),
      const SizedBox(width: 10),
      Icon(Icons.visibility_outlined, size: iconSize, color: Colors.white70),
      const SizedBox(width: 3),
      Text(_compactNumber(article.viewCount), style: TextStyle(fontSize: fontSize, color: Colors.white70, fontWeight: FontWeight.w600)),
      const SizedBox(width: 10),
      Icon(Icons.share_outlined, size: iconSize, color: Colors.white70),
      const SizedBox(width: 3),
      Text(_compactNumber(article.shareCount), style: TextStyle(fontSize: fontSize, color: Colors.white70, fontWeight: FontWeight.w600)),
    ],
  );
}

void _openArticleDetail(BuildContext context, HealthArticle article) {
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => HealthArticleDetailScreen(
        articleId: article.slug.isNotEmpty ? article.slug : article.id,
        initialArticle: article,
      ),
    ),
  );
}


const _healthTabs = [
  'All',
  'General Health',
  'Sexual Health',
  'Mother & Babies',
  "Women's Health",
  "Men's Health",
  'Nutrition',
  'Child Wellness',
  'Chronic Diseases',
  'Mental Health',
  'Others',
];

const _categoryMap = {
  'General Health': ['General Health'],
  'Wellness': ['General Health'],
  'First Aid': ['General Health'],
  'SRH': ['Sexual Health'],
  'Sexual Health': ['Sexual Health'],
  'Mother & Babies': ['Mother & Babies'],
  'Pediatrics': ['Mother & Babies', 'Child Wellness'],
  "Women's Health": ["Women's Health"],
  "Men's Health": ["Men's Health"],
  'Nutrition': ['Nutrition'],
  'Child Wellness': ['Child Wellness'],
  'Chronic Disease': ['Chronic Diseases'],
  'Chronic Care': ['Chronic Diseases'],
  'Cardiovascular': ['Chronic Diseases'],
  'Respiratory': ['Chronic Diseases'],
  'Digestive Health': ['Chronic Diseases'],
  'Infectious Diseases': ['Chronic Diseases'],
  'Skin Health': ['Chronic Diseases'],
  'Eye Health': ['Chronic Diseases'],
  'Oral Health': ['Chronic Diseases'],
  'Viral Infection': ['Chronic Diseases'],
  'Mental Health': ['Mental Health'],
  'Did You Know?': ['Others'],
};

bool _categoryMatchesTab(String category, String tab) {
  return (_categoryMap[category] ?? []).contains(tab);
}

class HealthTipsScreen extends StatefulWidget {
  const HealthTipsScreen({super.key});

  @override
  State<HealthTipsScreen> createState() => _HealthTipsScreenState();
}

class _HealthTipsScreenState extends State<HealthTipsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _activeTab = 'All';
  bool _savedOnly = false;
  String _sortBy = 'newest';
  String _typeFilter = 'all';
  bool _loading = true;
  bool _apiLoaded = false;
  List<HealthArticle> _liveArticles = const [];
  final Set<String> _savedIds = {};
  List<HealthArticle>? _cachedAllArticles;
  List<HealthArticle>? _cachedFilteredArticles;
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    _warmFromCache();
    _loadArticlesFromApi();
  }

  Future<void> _warmFromCache() async {
    final cached = await PatientRepository.instance.loadCachedArticles();
    if (!mounted || cached.isEmpty) return;
    setState(() {
      _liveArticles = cached.map(HealthArticle.fromPatientArticle).toList();
      _loading = false;
      _invalidateArticleCache();
    });
  }

  Future<void> _loadArticlesFromApi() async {
    setState(() => _loading = true);
    try {
      final apiArticles = await PatientRepository.instance.fetchArticles(
        sortBy: _sortBy,
        articleType: _typeFilter == 'all' ? null : _typeFilter,
        savedOnly: _savedOnly,
        limit: 40,
      );
      if (!mounted) return;
      setState(() {
        _liveArticles = apiArticles.map(HealthArticle.fromPatientArticle).toList();
        _apiLoaded = true;
        _loading = false;
        _invalidateArticleCache();
        for (final a in _liveArticles.where((a) => a.isSaved)) {
          _savedIds.add(a.id);
        }
      });
    } catch (_) {
      final cached = await PatientRepository.instance.loadCachedArticles();
      if (!mounted) return;
      setState(() {
        _liveArticles = cached.map(HealthArticle.fromPatientArticle).toList();
        _apiLoaded = false;
        _loading = false;
        _invalidateArticleCache();
        for (final a in _liveArticles.where((a) => a.isSaved)) {
          _savedIds.add(a.id);
        }
      });
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _invalidateArticleCache() {
    _cachedAllArticles = null;
    _cachedFilteredArticles = null;
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      setState(() {
        _searchQuery = value;
        _cachedFilteredArticles = null;
      });
    });
  }

  List<HealthArticle> get _allArticles {
    _cachedAllArticles ??= List<HealthArticle>.from(_liveArticles);
    return _cachedAllArticles!;
  }

  List<HealthArticle> get _filteredArticles {
    if (_cachedFilteredArticles != null) return _cachedFilteredArticles!;
    var list = _allArticles;
    if (_activeTab == 'Others') {
      list = list.where((a) => !(_categoryMap.containsKey(a.category))).toList();
    } else if (_activeTab != 'All') {
      list = list.where((a) => _categoryMatchesTab(a.category, _activeTab)).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((a) {
        return a.title.toLowerCase().contains(q) ||
            a.summary.toLowerCase().contains(q) ||
            a.category.toLowerCase().contains(q) ||
            a.subtitle.toLowerCase().contains(q) ||
            a.categories.any((c) => c.toLowerCase().contains(q));
      }).toList();
    }
    if (_savedOnly && !_apiLoaded) {
      list = list.where((a) => _savedIds.contains(a.id) || a.isSaved).toList();
    }
    _cachedFilteredArticles = list;
    return list;
  }

  void _reloadFromApi() {
    _invalidateArticleCache();
    _loadArticlesFromApi();
  }

  void _setFilter(VoidCallback update) {
    setState(() {
      update();
      _cachedFilteredArticles = null;
    });
  }

  void _toggleSaved(String id) {
    _setFilter(() {
      if (_savedIds.contains(id)) {
        _savedIds.remove(id);
      } else {
        _savedIds.add(id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final articles = _filteredArticles;
    final featured = articles.take(4).toList();
    final width = MediaQuery.sizeOf(context).width;
    final crossCount = width > 900 ? 3 : width > 600 ? 2 : 1;

    final gridAspect = crossCount == 1 ? 1.38 : (crossCount == 2 ? 1.08 : 0.95);

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: ColoredBox(
        color: PortalColors.pageBgAlt,
        child: _loading
            ? ListView(
                padding: const EdgeInsets.all(16),
                children: const [
                  ShimmerArticleCard(),
                  ShimmerArticleCard(),
                  ShimmerArticleCard(),
                  ShimmerArticleCard(),
                ],
              )
            : articles.isEmpty
                ? Column(
                    children: [
                      _buildHeader(articles.length),
                      Expanded(
                        child: PortalEmptyState(
                          icon: Icons.search_off,
                          message: _savedOnly ? 'No saved articles yet' : 'No articles found',
                        ),
                      ),
                    ],
                  )
                : AppRefreshScroll(
                    onRefresh: _loadArticlesFromApi,
                    child: CustomScrollView(
                    physics: AppRefreshScroll.scrollPhysics(const AlwaysScrollableScrollPhysics()),
                    slivers: [
                      SliverToBoxAdapter(child: _buildHeader(articles.length)),
                      if (!_apiLoaded && !_loading && articles.isNotEmpty)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(16, 0, 16, 8),
                            child: Text(
                              'Offline — showing your last saved articles.',
                              style: TextStyle(fontSize: 12, color: Color(0xFF1E40AF)),
                            ),
                          ),
                        ),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                        sliver: SliverList(
                          delegate: SliverChildListDelegate([
                            if (!_savedOnly) const SponsoredCarousel(),
                            if (featured.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              _FeaturedRail(
                                articles: featured,
                                savedIds: _savedIds,
                                onToggleSaved: _toggleSaved,
                              ),
                              const SizedBox(height: 20),
                            ],
                            Row(
                              children: [
                                const Text(
                                  'More to read',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: PortalColors.slate900,
                                  ),
                                ),
                                const Spacer(),
                                Text(
                                  '${articles.length} articles',
                                  style: const TextStyle(fontSize: 11, color: PortalColors.slate400),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                          ]),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                        sliver: SliverGrid(
                          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: crossCount,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: gridAspect,
                          ),
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final article = articles[index];
                                return _ModernArticleCard(
                                  article: article,
                                  isSaved: _savedIds.contains(article.id),
                                  onToggleSaved: () => _toggleSaved(article.id),
                                );
                              },
                              childCount: articles.length,
                            ),
                          ),
                        ),
                    ],
                  ),
                  ),
      ),
    );
  }

  Widget _buildHeader(int count) {
    return Container(
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Health Tips',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: PortalColors.green,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Trusted health articles for Rwanda',
                        style: TextStyle(fontSize: 12, color: PortalColors.slate500),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: PortalColors.greenLight,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome, size: 12, color: PortalColors.green),
                      SizedBox(width: 4),
                      Text(
                        '$count articles',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: PortalColors.green,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Container(
              height: 45,
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: PortalColors.slate200),
              ),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search articles, tips, guidesâ€¦',
                  hintStyle: TextStyle(fontSize: 14, color: PortalColors.slate400),
                  prefixIcon: Icon(Icons.search, size: 18, color: PortalColors.slate400),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: Icon(Icons.close, size: 18, color: PortalColors.slate400),
                          onPressed: () {
                            _searchController.clear();
                            _setFilter(() => _searchQuery = '');
                          },
                        )
                      : null,
                  border: InputBorder.none,
                ),
                onChanged: _onSearchChanged,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () {
                    _setFilter(() => _savedOnly = !_savedOnly);
                    _reloadFromApi();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: _savedOnly ? const Color(0xFFF59E0B) : Colors.white,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: _savedOnly ? const Color(0xFFF59E0B) : PortalColors.slate200,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _savedOnly ? Icons.bookmark : Icons.bookmark_border,
                          size: 14,
                          color: _savedOnly ? Colors.white : PortalColors.slate700,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _savedOnly ? 'Saved' : 'Saved',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _savedOnly ? Colors.white : PortalColors.slate700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _TypeFilterDropdown(
                    value: _typeFilter,
                    onChanged: (v) {
                      _setFilter(() => _typeFilter = v);
                      _reloadFromApi();
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _SortDropdown(
                    value: _sortBy,
                    onChanged: (v) {
                      _setFilter(() => _sortBy = v);
                      _reloadFromApi();
                    },
                  ),
                ),
              ],
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            child: Row(
              children: _healthTabs.map((tab) {
                final selected = _activeTab == tab;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => _setFilter(() => _activeTab = tab),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: selected ? PortalColors.green : Colors.white,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: selected ? PortalColors.green : PortalColors.slate200,
                        ),
                        boxShadow: selected
                            ? [
                                BoxShadow(
                                  color: PortalColors.green.withValues(alpha: 0.25),
                                  blurRadius: 8,
                                  offset: Offset(0, 4),
                                ),
                              ]
                            : null,
                      ),
                      child: Text(
                        tab,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: selected ? Colors.white : PortalColors.green,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _SortDropdown extends StatelessWidget {
  const _SortDropdown({required this.value, required this.onChanged});

  final String value;
  final ValueChanged<String> onChanged;

  static const _options = {
    'newest': 'Newest',
    'oldest': 'Oldest',
    'likes': 'Most Liked',
    'views': 'Most Viewed',
    'shares': 'Most Shared',
    'comments': 'Most Commented',
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: PortalColors.slate200),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _options.containsKey(value) ? value : 'newest',
          isDense: true,
          isExpanded: true,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: PortalColors.slate700,
          ),
          items: _options.entries
              .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value, overflow: TextOverflow.ellipsis)))
              .toList(),
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ),
    );
  }
}

class _TypeFilterDropdown extends StatelessWidget {
  const _TypeFilterDropdown({required this.value, required this.onChanged});

  final String value;
  final ValueChanged<String> onChanged;

  static const _options = {
    'all': 'All Types',
    'article': 'Article',
    'tip': 'Tip',
    'guide': 'Guide',
    'news': 'News',
    'did_you_know': 'Did You Know',
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: PortalColors.slate200),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _options.containsKey(value) ? value : 'all',
          isDense: true,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: PortalColors.slate700,
          ),
          items: _options.entries
              .map((e) => DropdownMenuItem(value: e.key, child: Text('Type: ${e.value}')))
              .toList(),
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ),
    );
  }
}

class _FeaturedRail extends StatelessWidget {
  const _FeaturedRail({
    required this.articles,
    required this.savedIds,
    required this.onToggleSaved,
  });

  final List<HealthArticle> articles;
  final Set<String> savedIds;
  final ValueChanged<String> onToggleSaved;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B),
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.auto_awesome, size: 12, color: Colors.white),
                  SizedBox(width: 4),
                  Text(
                    'FEATURED',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '${articles.length} highlights',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: PortalColors.slate900,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 220,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: articles.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, i) => _FeaturedCard(
              article: articles[i],
              isSaved: savedIds.contains(articles[i].id),
              onToggleSaved: () => onToggleSaved(articles[i].id),
            ),
          ),
        ),
      ],
    );
  }
}

class _FeaturedCard extends StatelessWidget {
  const _FeaturedCard({
    required this.article,
    required this.isSaved,
    required this.onToggleSaved,
  });

  final HealthArticle article;
  final bool isSaved;
  final VoidCallback onToggleSaved;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _openArticleDetail(context, article),
      child: Container(
        width: 160,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: PortalColors.slate900,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              article.imageUrl,
              fit: BoxFit.cover,
              cacheWidth: 480,
              errorBuilder: (_, __, ___) => Container(color: PortalColors.green),
            ),
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [Color(0xEB000000), Colors.transparent],
                ),
              ),
            ),
            Positioned(
              top: 8,
              left: 8,
              right: 8,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: Colors.white30),
                      ),
                      child: Text(
                        article.category,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: onToggleSaved,
                    icon: Icon(
                      isSaved ? Icons.bookmark : Icons.bookmark_border,
                      size: 16,
                      color: isSaved ? Color(0xFFFCD34D) : Colors.white70,
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
            Positioned(
              left: 10,
              right: 10,
              bottom: 10,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    article.title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _articleEngagementRow(article, iconSize: 10, fontSize: 9),
                      const Spacer(),
                      Text(
                        _timeAgo(article.publishedAt).isNotEmpty
                            ? _timeAgo(article.publishedAt)
                            : '${article.readTimeMin}m',
                        style: const TextStyle(fontSize: 9, color: Colors.white70),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- Cards ---

class _ModernArticleCard extends StatelessWidget {
  const _ModernArticleCard({
    required this.article,
    this.isSaved = false,
    this.onToggleSaved,
  });

  final HealthArticle article;
  final bool isSaved;
  final VoidCallback? onToggleSaved;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _openArticleDetail(context, article),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: PortalColors.slate900,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.07),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Hero(
              tag: 'img-${article.id}',
              child: Image.network(
                article.imageUrl,
                fit: BoxFit.cover,
                cacheWidth: 640,
                errorBuilder: (_, __, ___) => Container(color: PortalColors.slate200),
              ),
            ),
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [Color(0xEB000000), Color(0x40000000), Colors.transparent],
                  stops: [0.0, 0.5, 0.85],
                ),
              ),
            ),
            Positioned(
              top: 12,
              left: 12,
              right: 12,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: Colors.white30),
                      ),
                      child: Text(
                        article.category,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  if (onToggleSaved != null)
                    IconButton(
                      onPressed: onToggleSaved,
                      icon: Icon(
                        isSaved ? Icons.bookmark : Icons.bookmark_border,
                        color: isSaved ? Color(0xFFFCD34D) : Colors.white70,
                        size: 18,
                      ),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black38,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.schedule, size: 12, color: Colors.white70),
                        const SizedBox(width: 4),
                        Text(
                          '${article.readTimeMin}m',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 14,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    article.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      height: 1.25,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    article.summary,
                    style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.3),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  _articleEngagementRow(article),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

