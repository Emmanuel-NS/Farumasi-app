import 'dart:async';

import 'package:flutter/material.dart';
import 'package:farumasi_app/api/repositories/patient_repository.dart';
import 'package:farumasi_app/models/health_article.dart';
import 'package:farumasi_app/screens/health_article_detail_screen.dart';
import 'package:farumasi_app/widgets/sponsored_carousel.dart';
import 'package:farumasi_app/widgets/portal/portal_ui.dart';

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

// --- Content Data (Mock) ---
final List<HealthArticle> _articles = [
  HealthArticle(
    id: 'a1',
    title: "The Science of Hydration",
    subtitle: "More than just drinking water.",
    summary:
        "Why water is the most critical nutrient for your body's daily functions and how it affects your brain.",
    category: "General Health",
    readTimeMin: 4,
    imageUrl:
        "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&q=80&w=800",
    source: "Journal of Biological Chemistry",
    fullContent: """
Water is essential for life, making up about 60% of the adult human body. Every cell, tissue, and organ in your body needs water to work properly.

**1. Regulates Body Temperature**
Water that is stored in middle layers of the skin comes to the skin's surface as sweat when the body heats up. As it evaporates, it cools the body. In sport.

**2. Lubricates Joints**
Cartilage, found in joints and the disks of the spine, contains around 80 percent water. Long-term dehydration can reduce the joints’ shock-absorbing ability, leading to joint pain.

**3. Boosts Performance**
A study published in 'Sports Medicine' found that dehydration reduces performance in activities lasting longer than 30 minutes. If you don’t stay hydrated, your physical performance can suffer.

**4. Prevents Headaches**
Dehydration can trigger headaches and migraine in some individuals. Research has shown that water can relieve headaches in those who are dehydrated.
    """,
  ),
  HealthArticle(
    id: 'a2',
    title: "Mastering Sleep Hygiene",
    subtitle: "The secret to 8 hours of deep rest.",
    summary:
        "Optimizing your environment and habits for restorative deep sleep.",
    category: "Wellness",
    readTimeMin: 6,
    imageUrl:
        "https://images.unsplash.com/photo-1541781777631-fa95375ed299?auto=format&fit=crop&q=80&w=800", // Bedroom/Sleep environment
    source: "National Sleep Foundation",
    fullContent: """
Sleep services to restore the body and mind. The National Sleep Foundation recommends 7-9 hours for adults.

**The Circadian Rhythm**
Your body has a natural time-keeping clock known as your circadian rhythm. It affects your brain, body, and hormones, helping you stay awake and telling your body when it's time to sleep.

**Blue Light Exposure**
Exposure to light during the day is beneficial, but nighttime light exposure has the opposite effect. This is due to its effect on your circadian rhythm, tricking your brain into thinking it is still daytime. Blue light—which electronic devices like smartphones and computers emit in large amounts—is the worst in this regard.

**Caffeine Cuts**
Caffeine has numerous benefits and is consumed by 90% of the US population. However, when consumed late in the day, caffeine stimulates your nervous system and may stop your body from naturally relaxing at night.
    """,
  ),
];

final List<HealthArticle> _remedies = [
  HealthArticle(
    id: 'r1',
    title: "Flu & Cold Recovery",
    subtitle: "Virus Defense Protocol",
    summary: "Science-backed natural methods to shorten recovery time.",
    category: "Viral Infection",
    readTimeMin: 4,
    imageUrl:
        "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?auto=format&fit=crop&q=80&w=800", // Tea/Hot drink
    source: "Mayo Clinic",
    fullContent: """
Influenza (Flu) is a viral infection that attacks your respiratory system. While rest is paramount, these natural methods can support recovery.

**1. Honey and Tea**
Honey is a natural cough suppressant. A study in 'Archives of Pediatrics & Adolescent Medicine' found that honey was more effective than common cough suppressants for treating nighttime coughs.
*Usage*: Mix 2 teaspoons of honey with herbal tea or warm water and lemon.

**2. Steam Inhalation**
Inhaling steam helps thin mucus and drain the sinuses.
*Usage*: Pour hot water into a bowl, drape a towel over your head, and breathe deeply for 5-10 minutes.

**3. Zinc Supplementation**
Research suggests that zinc lozenges may shorten the length of a cold if taken within 24 hours of symptoms appearing.
    """,
  ),
  HealthArticle(
    id: 'r2',
    title: "Natural Diabetes Management",
    subtitle: "Lifestyle Control",
    summary: "How diet and stress management significantly impact blood sugar.",
    category: "Chronic Care",
    readTimeMin: 7,
    imageUrl:
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800", // Healthy Salad
    source: "American Diabetes Association",
    fullContent: """
Type 2 diabetes management relies heavily on lifestyle.

**1. Fiber-Rich Diet**
Fiber slows carb digestion and sugar absorption. For these reasons, it promotes a more gradual rise in blood sugar levels. 
*Action*: Focus on non-starchy vegetables, legumes, and whole grains.

**2. Apple Cider Vinegar**
Apple cider vinegar has many health benefits. Although it is made from apples, the fruit's sugar is fermented into acetic acid. Research shows it promotes lower fasting blood sugar levels.
*Usage*: Mix 1 tsp in a glass of water before a meal.

**3. Stress Management**
When stressed, your body releases glucagon and cortisol, hormones that cause blood sugar levels to rise. Exercises like yoga and mindfulness-based stress reduction (MBSR) can correct insulin secretion problems in chronic diabetes.
    """,
  ),
];

final List<HealthArticle> _srh = [
  HealthArticle(
    id: "id_39",
    source: "Medical Review Board",
    title: "Understanding Family Planning Options",
    subtitle: "Learn more about this topic",
    summary: "Brief overview of the topic.",
    fullContent: "There are multiple methods for family planning available today. Selecting the right birth control depends on your health, lifestyle, and how well it protects against sexually transmitted infections (STIs).\n\n**Condoms**: Provide dual protection against pregnancy and STIs.\n**Pills & Implants**: Hormonal methods with high effectiveness.\n**Natural Methods**: Tracking fertility awareness.",
    imageUrl: "https://images.unsplash.com/photo-1549480112-9c17adfed579?w=600&q=80",
    category: "SRH",
  ),
  HealthArticle(
    id: "id_28",
    source: "Medical Review Board",
    title: "Menstrual Health & Hygiene",
    subtitle: "Learn more about this topic",
    summary: "Brief overview of the topic.",
    fullContent: "Maintaining proper menstrual hygiene is critical to reproductive health. Changing pads/tampons every 4-6 hours, staying hydrated, and eating iron-rich foods can significantly reduce discomfort and prevent infections.",
    imageUrl: "https://images.unsplash.com/photo-1510065098258-299f0e47fe20?w=600&q=80",
    category: "SRH",
  ),
];

final List<HealthArticle> _mentalHealth = [
  HealthArticle(
    id: "id_27",
    source: "Medical Review Board",
    title: "Managing Workplace Stress",
    subtitle: "Learn more about this topic",
    summary: "Brief overview of the topic.",
    fullContent: "Burnout is a state of emotional, physical, and mental exhaustion caused by excessive and prolonged stress. Identifying the signs early is key.\n\n**Tip 1**: Take micro-breaks every 90 minutes.\n**Tip 2**: Set boundaries on your availability.\n**Tip 3**: Communicate with your team about workloads.",
    imageUrl: "https://images.unsplash.com/photo-1555529733-0e670560f8e1?w=600&q=80",
    category: "Mental Health",
  ),
  HealthArticle(
    id: "id_26",
    source: "Medical Review Board",
    title: "The Power of Mindfulness",
    subtitle: "Learn more about this topic",
    summary: "Brief overview of the topic.",
    fullContent: "Practicing mindfulness can reduce anxiety and depression. Simple 5-minute deep breathing exercises can lower heart rates and improve mental clarity throughout your day.",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80",
    category: "Mental Health",
  ),
];

final List<HealthArticle> _nutrition = [
  HealthArticle(
    id: "id_27",
    source: "Medical Review Board",
    title: "Building a Balanced Plate",
    subtitle: "Learn more about this topic",
    summary: "Brief overview of the topic.",
    fullContent: "The foundation of a healthy diet is a balanced plate. Fill half your plate with vegetables and fruits, one quarter with lean protein, and one quarter with whole grains. Avoid highly processed sugars to maintain steady energy levels.",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
    category: "Nutrition",
  ),
  HealthArticle(
    id: "id_22",
    source: "Medical Review Board",
    title: "Hydration Guidelines",
    subtitle: "Learn more about this topic",
    summary: "Brief overview of the topic.",
    fullContent: "Drinking enough water allows your body to regulate temperature, process nutrients, and lubricate joints. Aim for at least 8 cups (2 liters) of water a day, adjusting based on your activity level and climate.",
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&q=80",
    category: "Nutrition",
  ),
];

final List<HealthArticle> _motherAndBabies = [
  HealthArticle(
    id: 'mb1',
    title: "Postpartum Care Essentials",
    subtitle: "Taking care of yourself after childbirth",
    summary: "Key steps and symptoms to watch out for during postpartum recovery.",
    fullContent: "Recovering from childbirth takes time and patience. Ensure you get plenty of rest, stay nutrient-rich, and monitor any concerning symptoms. Always speak with your healthcare provider about post-birth bleeding, physical recovery, and your mental well-being.",
    category: "Mother & Babies",
    readTimeMin: 4,
    imageUrl: "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=80&w=800",
    source: "Maternal Health Association",
  ),
  HealthArticle(
    id: 'mb2',
    title: "First Foods for Your Baby",
    subtitle: "Navigating the transition to solids",
    summary: "A quick guide on when and how to start feeding your baby solid foods safely.",
    fullContent: "The American Academy of Pediatrics recommends starting solid foods around 6 months of age, when the baby shows signs of readiness (like sitting up and showing interest). Introduce one single-ingredient food at a time, such as pureed vegetables or iron-fortified cereals.",
    category: "Mother & Babies",
    readTimeMin: 3,
    imageUrl: "https://images.unsplash.com/photo-1453227588063-bb302b62f50b?auto=format&fit=crop&q=80&w=800",
    source: "Pediatrics Institute",
  ),
];

final List<HealthArticle> _facts = [
  HealthArticle(
    id: 'f1',
    title: "Raw Onions & Lungs",
    subtitle: "Nature's Antihistamine",
    summary:
        "Eating raw onions can help clear airways due to rich Quercetin content.",
    category: "Did You Know?",
    readTimeMin: 2,
    imageUrl:
        "https://images.unsplash.com/photo-1620574387735-3624d75b2dbc?auto=format&fit=crop&q=80&w=800", // Red Onions
    source: "Am. J. Physiol.",
    fullContent: """
**Did you know that eating raw onions can help with respiratory issues?**

### The Science
Onions, specifically red onions, are one of the highest food sources of **Quercetin**. Quercetin is a powerful antioxidant flavonoid that acts as a natural antihistamine and anti-inflammatory agent.

### The Research
A study published in the 'American Journal of Physiology' found that Quercetin helps relax the airway muscles (bronchodilation). This can be particularly beneficial for people suffering from asthma or bronchitis.

### How to Consume
To get the maximum benefit, onions should be eaten raw. Cooking can degrade some of the compounds.
    """,
  ),
  HealthArticle(
    id: 'f2',
    title: "Garlic as Antibiotic",
    subtitle: "Ancient Defense",
    summary:
        "Garlic releases Allicin when crushed, a mighty antimicrobial compound.",
    category: "Did You Know?",
    readTimeMin: 2,
    imageUrl:
        "https://images.unsplash.com/photo-1615485925763-867862880b1a?auto=format&fit=crop&q=80&w=800",
    source: "J. Antimicrobial Chemotherapy",
    fullContent: """
**Did you know garlic was used in World War I to treat gangrene?**

### The Science
When a garlic clove is crushed or chewed, it releases a compound called **Allicin**. This unstable compound serves as a defense mechanism for the plant against pests, but for humans, it has potent antibacterial properties.

### The Research
Studies have shown garlic to be effective against a wide spectrum of bacteria, including Salmonella and E. coli. One study found that garlic extract could inhibit the growth of these bacteria to a similar degree as standard antibiotics.

### Tip
Let crushed garlic sit for 10 minutes before cooking. This allows the enzymatic reaction that creates Allicin to fully occur.
    """,
  ),
];

// --- Main Screen ---

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
    _loadArticlesFromApi();
  }

  Future<void> _loadArticlesFromApi() async {
    setState(() => _loading = true);
    try {
      final apiArticles = await PatientRepository.instance.fetchArticles(
        sortBy: _sortBy,
        articleType: _typeFilter == 'all' ? null : _typeFilter,
        savedOnly: _savedOnly,
        limit: 100,
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
      if (!mounted) return;
      setState(() {
        _liveArticles = _articles;
        _apiLoaded = false;
        _loading = false;
        _invalidateArticleCache();
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
    _cachedAllArticles ??= () {
      final seen = <String>{};
      final out = <HealthArticle>[];
      final source = _apiLoaded
          ? _liveArticles
          : [
              ..._liveArticles,
              ..._remedies,
              ..._srh,
              ..._mentalHealth,
              ..._nutrition,
              ..._motherAndBabies,
              ..._facts,
            ];
      for (final a in source) {
        if (seen.add(a.id)) out.add(a);
      }
      return out;
    }();
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

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: ColoredBox(
        color: PortalColors.pageBgAlt,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildHeader(articles.length),
            if (!_apiLoaded && !_loading)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: const Color(0xFFFFF7ED),
                child: const Text(
                  'Showing offline sample articles — connect to the API for live content.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF9A3412)),
                ),
              ),
            Expanded(
              child: _loading
                  ? const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(color: PortalColors.green),
                          SizedBox(height: 12),
                          Text('Loading articles…', style: TextStyle(color: PortalColors.slate500)),
                        ],
                      ),
                    )
                  : articles.isEmpty
                  ? PortalEmptyState(
                      icon: Icons.search_off,
                      message: _savedOnly ? 'No saved articles yet' : 'No articles found',
                    )
                  : CustomScrollView(
                      slivers: [
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
                              mainAxisSpacing: 16,
                              crossAxisSpacing: 16,
                              childAspectRatio: 0.8,
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
          ],
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
                  hintText: 'Search articles, tips, guides…',
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
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                GestureDetector(
                  onTap: () {
                    _setFilter(() => _savedOnly = !_savedOnly);
                    _reloadFromApi();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
                          _savedOnly ? 'Saved only' : 'Saved',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _savedOnly ? Colors.white : PortalColors.slate700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                _TypeFilterDropdown(
                  value: _typeFilter,
                  onChanged: (v) {
                    _setFilter(() => _typeFilter = v);
                    _reloadFromApi();
                  },
                ),
                _SortDropdown(
                  value: _sortBy,
                  onChanged: (v) {
                    _setFilter(() => _sortBy = v);
                    _reloadFromApi();
                  },
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
      constraints: const BoxConstraints(maxWidth: 148),
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

