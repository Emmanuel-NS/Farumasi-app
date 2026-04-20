import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

# Let's replace within _buildOverviewTab exactly
overview_start = text.find('  Widget _buildOverviewTab() {')
next_method_start = text.find('  // --- TAB 1: REQUESTS', overview_start)
overview_code = text[overview_start:next_method_start]

# 1. wrap SingleChildScrollView
overview_code = overview_code.replace('return SingleChildScrollView(', 'return LayoutBuilder(builder: (context, constraints) { bool isWebWide = constraints.maxWidth >= 600; return SingleChildScrollView(')

# 2. padding
overview_code = overview_code.replace('padding: const EdgeInsets.symmetric(horizontal: 24),', 'padding: EdgeInsets.symmetric(horizontal: isWebWide ? 40 : 24, vertical: isWebWide ? 24 : 0),')

# 3. grid props
overview_code = overview_code.replace('crossAxisCount: 2,', 'crossAxisCount: isWebWide ? 4 : 2,')
overview_code = overview_code.replace('childAspectRatio: 0.95, // Adjusted to fix 16px vertical overflow', 'childAspectRatio: isWebWide ? 2.5 : 0.95,')

# 4. close LayoutBuilder correctly
# find the last return block end. It's the last     ); followed by   }
parts = overview_code.split('    );\n  }\n')
new_overview_code = parts[0] + '    );\n  });\n  }\n'

with open(file, 'w', encoding='utf-8') as f:
    f.write(text[:overview_start] + new_overview_code + text[next_method_start:])
print('Done!')
