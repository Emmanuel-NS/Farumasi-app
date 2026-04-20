import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Darken text colours for better contrast globally
text = text.replace('Colors.grey.shade500', 'Colors.grey.shade700')
text = text.replace('Colors.grey.shade400', 'Colors.grey.shade600')
text = text.replace('Colors.grey.shade300', 'Colors.grey.shade400')

# 2. Fix the Sidebar Overflow
sidebar_pattern = r'(Widget _buildPersistentSidebar.*?child:.*?)(Column\()'

if re.search(sidebar_pattern, text, flags=re.DOTALL):
    text = re.sub(
        sidebar_pattern,
        r'\1LayoutBuilder(builder: (context, constraints) {\n          return SingleChildScrollView(\n            child: ConstrainedBox(\n              constraints: BoxConstraints(minHeight: constraints.maxHeight),\n              child: IntrinsicHeight(\n                child: \2',
        text,
        count=1,
        flags=re.DOTALL
    )

    # Need to append )))); to the end of the sidebar function
    # It ends with const SizedBox(height: 16);\n        ],\n      ),\n    );\n  }
    end_pattern = r'const SizedBox\(height: 16\);\s*\],\s*\),\s*\);\s*\}'
    # We only want to replace the first occurrence after the sidebar definition
    start_idx = text.find('Widget _buildPersistentSidebar')
    match = re.search(end_pattern, text[start_idx:])
    if match:
        actual_match = text[start_idx + match.start() : start_idx + match.end()]
        new_end = actual_match.replace('    );\n  }', '    ))));\n  }')
        text = text[:start_idx + match.start()] + new_end + text[start_idx + match.end():]

with open(file, 'w', encoding='utf-8') as f:
    f.write(text)

print("Accessibility and Sidebar Overflow Fixed!")
