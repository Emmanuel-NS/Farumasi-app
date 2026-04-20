import re
file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('childAspectRatio: isWebWide ? 2.5 : 0.95, // Adjusted', 'childAspectRatio: isWebWide ? 1.35 : 0.95,')

with open(file, 'w', encoding='utf-8') as f:
    f.write(text)
print('Grid Adjusted!')
