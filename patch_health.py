import re

with open('lib/screens/health_tips_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Update TabController length
text = re.sub(r'vsync:\s*this,\s*length:\s*3', 'vsync: this, length: 6', text)

addition = """final List<HealthArticle> _srh = [
  HealthArticle(
    title: "Understanding Family Planning Options",
    content: "There are multiple methods for family planning available today. Selecting the right birth control depends on your health, lifestyle, and how well it protects against sexually transmitted infections (STIs).\\n\\n**Condoms**: Provide dual protection against pregnancy and STIs.\\n**Pills & Implants**: Hormonal methods with high effectiveness.\\n**Natural Methods**: Tracking fertility awareness.",
    date: "April 26, 2026",
    imageUrl: "https://images.unsplash.com/photo-1549480112-9c17adfed579?w=600&q=80",
    category: "SRH",
  ),
  HealthArticle(
    title: "Menstrual Health & Hygiene",
    content: "Maintaining proper menstrual hygiene is critical to reproductive health. Changing pads/tampons every 4-6 hours, staying hydrated, and eating iron-rich foods can significantly reduce discomfort and prevent infections.",
    date: "April 20, 2026",
    imageUrl: "https://images.unsplash.com/photo-1510065098258-299f0e47fe20?w=600&q=80",
    category: "SRH",
  ),
];

final List<HealthArticle> _mentalHealth = [
  HealthArticle(
    title: "Managing Workplace Stress",
    content: "Burnout is a state of emotional, physical, and mental exhaustion caused by excessive and prolonged stress. Identifying the signs early is key.\\n\\n**Tip 1**: Take micro-breaks every 90 minutes.\\n**Tip 2**: Set boundaries on your availability.\\n**Tip 3**: Communicate with your team about workloads.",
    date: "March 15, 2026",
    imageUrl: "https://images.unsplash.com/photo-1555529733-0e670560f8e1?w=600&q=80",
    category: "Mental Health",
  ),
  HealthArticle(
    title: "The Power of Mindfulness",
    content: "Practicing mindfulness can reduce anxiety and depression. Simple 5-minute deep breathing exercises can lower heart rates and improve mental clarity throughout your day.",
    date: "Feb 10, 2026",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80",
    category: "Mental Health",
  ),
];

final List<HealthArticle> _nutrition = [
  HealthArticle(
    title: "Building a Balanced Plate",
    content: "The foundation of a healthy diet is a balanced plate. Fill half your plate with vegetables and fruits, one quarter with lean protein, and one quarter with whole grains. Avoid highly processed sugars to maintain steady energy levels.",
    date: "April 2, 2026",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
    category: "Nutrition",
  ),
  HealthArticle(
    title: "Hydration Guidelines",
    content: "Drinking enough water allows your body to regulate temperature, process nutrients, and lubricate joints. Aim for at least 8 cups (2 liters) of water a day, adjusting based on your activity level and climate.",
    date: "Jan 19, 2026",
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&q=80",
    category: "Nutrition",
  ),
];

final List<HealthArticle> _facts = ["""

text = text.replace('final List<HealthArticle> _facts = [', addition)

t_tabs = '''                      _buildTab("General Tips"),
                      _buildTab("Remedies"),
                      _buildTab("Did You Know?"),'''
r_tabs = '''                      _buildTab("General Tips"),
                      _buildTab("Remedies"),
                      _buildTab("SRH"),
                      _buildTab("Mental Health"),
                      _buildTab("Nutrition"),
                      _buildTab("Did You Know?"),'''
text = text.replace(t_tabs, r_tabs)

t_body = '''            _buildArticleList(_filterArticles(_articles)),
            _buildArticleList(_filterArticles(_remedies)),
            _buildArticleList(_filterArticles(_facts), isFact: true),'''
r_body = '''            _buildArticleList(_filterArticles(_articles)),
            _buildArticleList(_filterArticles(_remedies)),
            _buildArticleList(_filterArticles(_srh)),
            _buildArticleList(_filterArticles(_mentalHealth)),
            _buildArticleList(_filterArticles(_nutrition)),
            _buildArticleList(_filterArticles(_facts), isFact: true),'''
text = text.replace(t_body, r_body)

with open('lib/screens/health_tips_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print("done patching health screen")
