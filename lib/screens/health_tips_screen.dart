import 'package:flutter/material.dart';
import 'package:farumasi_app/widgets/responsive_web_wrapper.dart';

// --- Data Models ---

class HealthArticle {
  final String id;
  final String title;
  final String subtitle;
  final String summary;
  final String fullContent;
  final String imageUrl;
  final String source;
  final String category;
  final int readTimeMin;

  const HealthArticle({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.summary,
    required this.fullContent,
    required this.imageUrl,
    required this.source,
    required this.category,
    this.readTimeMin = 5,
  });
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

class HealthTipsScreen extends StatefulWidget {
  const HealthTipsScreen({super.key});

  @override
  State<HealthTipsScreen> createState() => _HealthTipsScreenState();
}

class _HealthTipsScreenState extends State<HealthTipsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 7, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  // Filter a specific list based on search query
  List<HealthArticle> _filterArticles(List<HealthArticle> list) {
    if (_searchQuery.isEmpty) return list;
    final query = _searchQuery.toLowerCase();
    return list.where((item) {
      return item.title.toLowerCase().contains(query) ||
          item.summary.toLowerCase().contains(query) ||
          item.category.toLowerCase().contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: ResponsiveWebWrapper(
        child: Scaffold(
          backgroundColor: Colors.grey.shade50,
          body: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 180, // Increased height for search bar
              floating: true,
              pinned: true,
              elevation: 0,
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFF1E9E68),
              flexibleSpace: FlexibleSpaceBar(
                titlePadding: EdgeInsets.only(left: 16, bottom: 120),
                title: Text(
                  "Discover Wellness",
                  style: TextStyle(
                    color: const Color(0xFF1E9E68),
                    fontWeight: FontWeight.bold,
                    fontSize: 22,
                  ),
                ),
                background: Stack(
                  children: [
                    Positioned(
                      right: -30,
                      top: -30,
                      child: Opacity(
                        opacity: 0.1,
                        child: Icon(Icons.spa, size: 180, color: const Color(0xFF1E9E68)),
                      ),
                    ),
                    // Search Bar
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 70, // Positioned above the tab bar
                      child: Container(
                        height: 45,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Search tips, remedies, facts...',
                            prefixIcon: Icon(Icons.search, color: Colors.grey),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: Icon(Icons.clear, color: Colors.grey),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                  )
                                : null,
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(vertical: 10),
                          ),
                          onChanged: (value) {
                            setState(() => _searchQuery = value);
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              bottom: PreferredSize(
                preferredSize: Size.fromHeight(60),
                child: Container(
                  height: 60,
                  alignment: Alignment.centerLeft,
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: TabBar(
                    controller: _tabController,
                    isScrollable: true,
                    labelColor: Colors.white,
                    unselectedLabelColor: const Color(0xFF1E9E68),
                    indicator: BoxDecoration(
                      borderRadius: BorderRadius.circular(30),
                      color: const Color(0xFF1E9E68),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF1E9E68).withOpacity(0.3),
                          blurRadius: 8,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    indicatorSize: TabBarIndicatorSize.label,
                    padding: EdgeInsets.zero,
                    labelPadding: EdgeInsets.symmetric(horizontal: 8),
                    tabs: [
                        _buildTab("General Tips"),
                        _buildTab("Remedies"),
                        _buildTab("SRH"),
                        _buildTab("Mental Health"),
                        _buildTab("Nutrition"),
                        _buildTab("Mother & Babies"),
                        _buildTab("Did You Know?"),
                      ],
                  ),
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
            controller: _tabController,
            children: [
              _buildArticleList(_filterArticles(_articles)),
              _buildArticleList(_filterArticles(_remedies)),
              _buildArticleList(_filterArticles(_srh)),
              _buildArticleList(_filterArticles(_mentalHealth)),
              _buildArticleList(_filterArticles(_nutrition)),
              _buildArticleList(_filterArticles(_motherAndBabies)),
              _buildArticleList(_filterArticles(_facts), isFact: true),
            ],
          ),
      ),
    ),
    ),
    );
  }

  Widget _buildTab(String text) {
    return Tab(
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: const Color(0xFF1E9E68)),
        ),
        child: Text(text, style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildArticleList(List<HealthArticle> items, {bool isFact = false}) {
    if (items.isEmpty) {
       return Center(
         child: Column(
           mainAxisAlignment: MainAxisAlignment.center,
           children: [
             Icon(Icons.search_off, size: 64, color: Colors.grey.shade300),
             SizedBox(height: 16),
             Text(
               "No results found",
               style: TextStyle(color: Colors.grey.shade500, fontSize: 16),
             ),
           ],
         ),
       );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        if (isFact) {
          final isWide = constraints.maxWidth > 700;
          return ListView.separated(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: EdgeInsets.symmetric(
              vertical: 20,
              horizontal: isWide ? (constraints.maxWidth - 600) / 2 : 20,
            ),
            itemCount: items.length,
            separatorBuilder: (c, i) => const SizedBox(height: 20),
            itemBuilder: (context, index) {
              return _DidYouKnowCard(article: items[index]);
            },
          );
        }

        if (constraints.maxWidth > 700) {
          return GridView.builder(
            padding: EdgeInsets.all(20),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 450,
              mainAxisSpacing: 20,
              crossAxisSpacing: 20,
              childAspectRatio: 1.1,
            ),
            itemCount: items.length,
            itemBuilder: (context, index) {
              return _ModernArticleCard(article: items[index]);
            },
          );
        }

        return ListView.separated(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: EdgeInsets.all(20),
          itemCount: items.length,
          separatorBuilder: (c, i) => const SizedBox(height: 20),
          itemBuilder: (context, index) {
            return _ModernArticleCard(article: items[index]);
          },
        );
      },
    );
  }
}

// --- Detail Screen ---

class ArticleDetailScreen extends StatelessWidget {
  final HealthArticle article;
  const ArticleDetailScreen({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    return ResponsiveWebWrapper(
      child: Scaffold(
        backgroundColor: Colors.white,
        body: CustomScrollView(
          slivers: [
            SliverAppBar(
            pinned: true,
            expandedHeight: 300,
            leading: Padding(
              padding: const EdgeInsets.all(8.0),
              child: CircleAvatar(
                backgroundColor: Colors.white.withOpacity(0.9),
                child: IconButton(
                  icon: Icon(Icons.arrow_back, color: const Color(0xFF1E9E68)),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Hero(
                tag: 'img-${article.id}',
                child: Image.network(
                  article.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (c, e, s) => Container(
                    color: const Color(0xFF1E9E68),
                    child: Icon(
                      Icons.broken_image,
                      size: 50,
                      color: const Color(0xFF1E9E68),
                    ),
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E9E68),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          article.category.toUpperCase(),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF1E9E68),
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                      Spacer(),
                      Icon(Icons.access_time, size: 16, color: Colors.grey),
                      SizedBox(width: 4),
                      Text(
                        "${article.readTimeMin} min read",
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      ),
                    ],
                  ),
                  SizedBox(height: 20),
                  Text(
                    article.title,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      height: 1.2,
                      color: Colors.black87,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    article.subtitle,
                    style: TextStyle(
                      fontSize: 18,
                      color: Colors.grey.shade600,
                      height: 1.5,
                    ),
                  ),

                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24.0),
                    child: Divider(thickness: 1, color: Colors.grey.shade200),
                  ),

                  Text(
                    article.fullContent,
                    style: TextStyle(
                      fontSize: 17,
                      height: 1.8,
                      color: Colors.grey.shade800,
                    ),
                  ),

                  SizedBox(height: 40),
                  Container(
                    padding: EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.menu_book, color: const Color(0xFF1E9E68)),
                        SizedBox(width: 12),
                        Flexible(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Source",
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                              Text(
                                article.source,
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 50),
                ],
              ),
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
  final HealthArticle article;
  const _ModernArticleCard({required this.article});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ArticleDetailScreen(article: article),
        ),
      ),
      child: Container(
        height: 260,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 15,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            children: [
              Positioned.fill(
                child: Hero(
                  tag: 'img-${article.id}',
                  child: Image.network(
                    article.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (c, e, s) => Container(
                      color: Colors.grey.shade200,
                      child: Icon(
                        Icons.image_not_supported,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                ),
              ),
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.black.withOpacity(0.85),
                        Colors.transparent,
                      ],
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      stops: [0.0, 0.6],
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 20,
                left: 20,
                right: 20,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        article.category,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      article.title,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    SizedBox(height: 4),
                    Text(
                      article.subtitle,
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
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

class _DidYouKnowCard extends StatelessWidget {
  final HealthArticle article;
  const _DidYouKnowCard({required this.article});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ArticleDetailScreen(article: article),
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.orange.shade100),
          boxShadow: [
            BoxShadow(
              color: Colors.orange.shade50,
              blurRadius: 10,
              offset: Offset(0, 6),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            Container(
              padding: EdgeInsets.symmetric(vertical: 10, horizontal: 16),
              color: Colors.orange.shade50,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.lightbulb, color: Colors.orange, size: 20),
                      SizedBox(width: 8),
                      Text(
                        "DID YOU KNOW?",
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                          color: Colors.orange.shade800,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                  Icon(
                    Icons.arrow_forward_ios,
                    size: 12,
                    color: Colors.orange.shade300,
                  ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          article.title,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          article.summary,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.black54,
                            height: 1.5,
                          ),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  SizedBox(width: 16),
                  Hero(
                    tag: 'img-${article.id}',
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        article.imageUrl,
                        width: 90,
                        height: 90,
                        fit: BoxFit.cover,
                        errorBuilder: (c, e, s) => Container(
                          width: 90,
                          height: 90,
                          color: Colors.orange.shade100,
                          child: Icon(Icons.broken_image, color: Colors.orange),
                        ),
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
}


