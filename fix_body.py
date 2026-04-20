import re
file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1
content = content.replace('  Widget _buildOverviewTab() {\n    return SingleChildScrollView(',
                          '  Widget _buildOverviewTab() {\n    return LayoutBuilder(builder: (context, constraints) { bool isWebWide = constraints.maxWidth >= 600; return SingleChildScrollView(')
# 2
content = content.replace('padding: const EdgeInsets.symmetric(horizontal: 24),',
                          'padding: EdgeInsets.symmetric(horizontal: isWebWide ? 40 : 24, vertical: isWebWide ? 24 : 0),')
                          
# 3
content = content.replace('crossAxisCount: 2,\n            childAspectRatio: 0.95, // Adjusted to fix 16px vertical overflow',
                          'crossAxisCount: isWebWide ? 4 : 2,\n            childAspectRatio: isWebWide ? 2.5 : 0.95,')

# 4: look for the end of the method
end_str = '''          ],
        ),
      );
    }'''
end_replacement = '''          ],
        ),
      );\n    });\n  }'''

content = content.replace(end_str, end_replacement, 1)

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
