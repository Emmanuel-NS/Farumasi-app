import 'package:flutter/material.dart';

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
    summary: "Why water is the most critical nutrient for your body's daily functions and how it affects your brain.",
    category: "General Health",
    readTimeMin: 4,
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&q=80&w=800",
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
    """
  ),
  HealthArticle(
    id: 'a2',
    title: "Mastering Sleep Hygiene",
    subtitle: "The secret to 8 hours of deep rest.",
    summary: "Optimizing your environment and habits for restorative deep sleep.",
    category: "Wellness",
    readTimeMin: 6,
    imageUrl: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&q=80&w=800",
    source: "National Sleep Foundation",
    fullContent: """
Sleep services to restore the body and mind. The National Sleep Foundation recommends 7-9 hours for adults.

**The Circadian Rhythm**
Your body has a natural time-keeping clock known as your circadian rhythm. It affects your brain, body, and hormones, helping you stay awake and telling your body when it's time to sleep.

**Blue Light Exposure**
Exposure to light during the day is beneficial, but nighttime light exposure has the opposite effect. This is due to its effect on your circadian rhythm, tricking your brain into thinking it is still daytime. Blue light—which electronic devices like smartphones and computers emit in large amounts—is the worst in this regard.

**Caffeine Cuts**
Caffeine has numerous benefits and is consumed by 90% of the US population. However, when consumed late in the day, caffeine stimulates your nervous system and may stop your body from naturally relaxing at night.
    """
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
    imageUrl: "https://images.unsplash.com/photo-1513224502586-d254786b1063?auto=format&fit=crop&q=80&w=800",
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
    """
  ),
  HealthArticle(
    id: 'r2', 
    title: "Natural Diabetes Management", 
    subtitle: "Lifestyle Control", 
    summary: "How diet and stress management significantly impact blood sugar.", 
    category: "Chronic Care", 
    readTimeMin: 7,
    imageUrl: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&q=80&w=800", // Food image
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
    """
  ),
];

final List<HealthArticle> _facts = [
  HealthArticle(
    id: 'f1',
    title: "Raw Onions & Lungs",
    subtitle: "Nature's Antihistamine",
    summary: "Eating raw onions can help clear airways due to rich Quercetin content.",
    category: "Did You Know?",
    readTimeMin: 2,
    imageUrl: "https://images.unsplash.com/photo-1618512496245-c3f28328c313?auto=format&fit=crop&q=80&w=800",
    source: "Am. J. Physiol.",
    fullContent: """
**Did you know that eating raw onions can help with respiratory issues?**

### The Science
Onions, specifically red onions, are one of the highest food sources of **Quercetin**. Quercetin is a powerful antioxidant flavonoid that acts as a natural antihistamine and anti-inflammatory agent.

### The Research
A study published in the 'American Journal of Physiology' found that Quercetin helps relax the airway muscles (bronchodilation). This can be particularly beneficial for people suffering from asthma or bronchitis.

### How to Consume
To get the maximum benefit, onions should be eaten raw. Cooking can degrade some of the compounds.
    """
  ),
  HealthArticle(
    id: 'f2',
    title: "Garlic as Antibiotic",
    subtitle: "Ancient Defense",
    summary: "Garlic releases Allicin when crushed, a mighty antimicrobial compound.",
    category: "Did You Know?",
    readTimeMin: 2,
    imageUrl: "https://images.unsplash.com/photo-1615485925763-867862880b1a?auto=format&fit=crop&q=80&w=800",
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

class _HealthTipsScreenState extends State<HealthTipsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 120,
              floating: true,
              pinned: true,
              elevation: 0,
              backgroundColor: Colors.white,
              foregroundColor: Colors.green.shade900,
              flexibleSpace: FlexibleSpaceBar(
                titlePadding: EdgeInsets.only(left: 16, bottom: 62),
                title: Text(
                  "Discover Wellness",
                  style: TextStyle(color: Colors.green.shade900, fontWeight: FontWeight.bold, fontSize: 22),
                ),
                background: Stack(
                  children: [
                    Positioned(
                      right: -30,
                      top: -30,
                      child: Opacity(
                        opacity: 0.1,
                        child: Icon(Icons.spa, size: 180, color: Colors.green),
                      ),
                    )
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
                    unselectedLabelColor: Colors.green.shade700,
                    indicator: BoxDecoration(
                      borderRadius: BorderRadius.circular(30),
                      color: Colors.green,
                      boxShadow: [BoxShadow(color: Colors.green.withOpacity(0.3), blurRadius: 8, offset: Offset(0, 4))]
                    ),
                    indicatorSize: TabBarIndicatorSize.label,
                    padding: EdgeInsets.zero,
                    labelPadding: EdgeInsets.symmetric(horizontal: 8),
                    tabs: [
                      _buildTab("General Tips"),
                      _buildTab("Remedies"),
                      _buildTab("Did You Know?"),
                      _buildTab("Ask Pharmacist"), 
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
            _buildArticleList(_articles),
            _buildArticleList(_remedies), // Reusing modern card layout for remedies too
            _buildArticleList(_facts, isFact: true),
            _AskPharmacistTab(),
          ],
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
          border: Border.all(color: Colors.green.shade100),
        ),
        child: Text(text, style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildArticleList(List<HealthArticle> items, {bool isFact = false}) {
    return ListView.separated(
      padding: EdgeInsets.all(20),
      itemCount: items.length,
      separatorBuilder: (c, i) => SizedBox(height: 20),
      itemBuilder: (context, index) {
        final item = items[index];
        if (isFact) return _DidYouKnowCard(article: item);
        return _ModernArticleCard(article: item);
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
    return Scaffold(
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
                  icon: Icon(Icons.arrow_back, color: Colors.green.shade900),
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
                  errorBuilder: (c,e,s) => Container(color: Colors.green.shade100, child: Icon(Icons.broken_image, size: 50, color: Colors.green)),
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
                        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(20)),
                        child: Text(article.category.toUpperCase(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green.shade800, letterSpacing: 1)),
                      ),
                      Spacer(),
                      Icon(Icons.access_time, size: 16, color: Colors.grey),
                      SizedBox(width: 4),
                      Text("${article.readTimeMin} min read", style: TextStyle(color: Colors.grey, fontSize: 13)),
                    ],
                  ),
                  SizedBox(height: 20),
                  Text(article.title, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, height: 1.2, color: Colors.black87)),
                  SizedBox(height: 8),
                  Text(article.subtitle, style: TextStyle(fontSize: 18, color: Colors.grey.shade600, height: 1.5)),
                  
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24.0),
                    child: Divider(thickness: 1, color: Colors.grey.shade200),
                  ),
                  
                  Text(article.fullContent, style: TextStyle(fontSize: 17, height: 1.8, color: Colors.grey.shade800)),
                  
                  SizedBox(height: 40),
                  Container(
                    padding: EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50, 
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200)
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.menu_book, color: Colors.green),
                        SizedBox(width: 12),
                        Flexible(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text("Source", style: TextStyle(fontSize: 12, color: Colors.grey)),
                              Text(article.source, style: TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                        )
                      ],
                    ),
                  ),
                  SizedBox(height: 50),
                ],
              ),
            ),
          )
        ],
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
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ArticleDetailScreen(article: article))),
      child: Container(
        height: 260,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 15, offset: Offset(0, 8))],
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
                    errorBuilder: (c,e,s) => Container(color: Colors.grey.shade200, child: Icon(Icons.image_not_supported, color: Colors.grey)),
                  ),
                ),
              ),
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.black.withOpacity(0.85), Colors.transparent],
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      stops: [0.0, 0.6]
                    )
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
                      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                      child: Text(article.category, style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                    SizedBox(height: 8),
                    Text(
                      article.title, 
                      style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
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
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ArticleDetailScreen(article: article))),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.orange.shade100),
          boxShadow: [BoxShadow(color: Colors.orange.shade50, blurRadius: 10, offset: Offset(0, 6))],
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
                       Text("DID YOU KNOW?", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.orange.shade800, letterSpacing: 1.2)),
                     ],
                   ),
                   Icon(Icons.arrow_forward_ios, size: 12, color: Colors.orange.shade300)
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
                         Text(article.title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
                         SizedBox(height: 8),
                         Text(article.summary, style: TextStyle(fontSize: 14, color: Colors.black54, height: 1.5), maxLines: 3, overflow: TextOverflow.ellipsis),
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
                         errorBuilder: (c,e,s) => Container(width: 90, height: 90, color: Colors.orange.shade100, child: Icon(Icons.broken_image, color: Colors.orange)),
                       ),
                     ),
                   )
                 ],
               ),
             )
          ],
        ),
      ),
    );
  }
}

class _AskPharmacistTab extends StatefulWidget {
  @override
  State<_AskPharmacistTab> createState() => _AskPharmacistTabState();
}

class _AskPharmacistTabState extends State<_AskPharmacistTab> {
  final _msgController = TextEditingController();
  String _selectedTopic = 'General Inquiry';
  bool _isSending = false;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.green.shade600,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.green.shade200, blurRadius: 10, offset: Offset(0, 5))]
            ),
            child: Row(
              children: [
                CircleAvatar(backgroundColor: Colors.white, radius: 24, child: Icon(Icons.support_agent, color: Colors.green, size: 28)),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Pharmacist Support", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      Text("Ask us anything about your medications or symptoms.", style: TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                )
              ],
            ),
          ),
          SizedBox(height: 32),
          Text("Topic", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedTopic,
            decoration: InputDecoration(
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14)
            ),
            items: ["General Inquiry", "Medication Side Effects", "Dosage Instructions", "Symptom Check"].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
            onChanged: (v) => setState(() => _selectedTopic = v!),
          ),
          SizedBox(height: 24),
          Text("How can we help?", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          SizedBox(height: 8),
          TextField(
            controller: _msgController,
            maxLines: 5,
            decoration: InputDecoration(
              hintText: "Describe your symptoms or question here in detail...",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              alignLabelWithHint: true,
            ),
          ),
          SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isSending ? null : () async {
                if (_msgController.text.isEmpty) return;
                setState(() => _isSending = true);
                await Future.delayed(Duration(seconds: 2));
                if(mounted) {
                  setState(() { _isSending = false; _msgController.clear(); });
                  showDialog(context: context, builder: (_) => AlertDialog(
                    title: Icon(Icons.check_circle, color: Colors.green, size: 50),
                    content: Text("Request Sent! A pharmacist will reply to your account email shortly.", textAlign: TextAlign.center),
                    actions: [TextButton(onPressed: () => Navigator.pop(context), child: Text("OK"))],
                  ));
                }
              },
              icon: _isSending ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Icon(Icons.send),
              label: Text(_isSending ? "Sending..." : "Submit Request"),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade800,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
              ),
            ),
          )
        ],
      ),
    );
  }
}
