import re

with open('lib/screens/pharmacist/pharmacist_health_posts_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('color: Colors.black.withOpacity(0.02)', 'color: Colors.black.withValues(alpha: 0.02)')
text = text.replace('color: _primaryGreen.withOpacity(0.1)', 'color: _primaryGreen.withValues(alpha: 0.1)')

with open('lib/screens/pharmacist/pharmacist_health_posts_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print('Opacity replaced')
