import re
file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'(\s*const SizedBox\(height: 80\);\s*],\s*\),\s*\);\s*\})\s*(Widget _buildUpcomingSessions\(\) \{)'

match = re.search(pattern, text)
print(bool(match))
if match:
    new_text = text[:match.start(1)] + '          const SizedBox(height: 80);\n        ],\n      );\n    });\n  }\n\n  ' + match.group(2) + text[match.end(2):]
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print('Regex Replaced')
