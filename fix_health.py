import re

with open('lib/screens/health_tips_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace injected attributes that caused errors
text = re.sub(
    r'categoryType: "Article",\s*author: "Health Editor",\s*title: (.*?),\s*content: (.*?),',
    r'title: \1,\n    subtitle: "Learn more about this topic",\n    summary: "Brief overview of the topic.",\n    fullContent: \2,',
    text,
    flags=re.DOTALL
)

with open('lib/screens/health_tips_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print('Fixed parameters')