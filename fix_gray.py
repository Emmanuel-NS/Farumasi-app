import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('Color(0xFF64748B)', 'Color(0xFF334155)')
text = text.replace('Color(0xFF94A3B8)', 'Color(0xFF475569)')
text = text.replace('Colors.grey.shade500', 'Colors.grey.shade800')
text = text.replace('Colors.grey.shade600', 'Colors.grey.shade800')
text = text.replace('Colors.grey.shade400', 'Colors.grey.shade700')

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)
