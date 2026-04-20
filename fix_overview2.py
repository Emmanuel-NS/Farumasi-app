import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

overview_match = re.search(r'(  Widget _buildOverviewTab\(\) \{\n.*?)(  // --- TAB 1: REQUESTS)', text, re.DOTALL)
if overview_match:
    tab_code = overview_match.group(1)
    
    # Wrap with LayoutBuilder
    # change SingleChildScrollView( to LayoutBuilder(builder: (context, constraints) { bool isWebWide = constraints.maxWidth >= 600; return SingleChildScrollView(
    tab_code = tab_code.replace('return SingleChildScrollView(', 'return LayoutBuilder(builder: (context, constraints) { bool isWebWide = constraints.maxWidth >= 600; return SingleChildScrollView(')
    
    # change childAspectRatio: 0.95, // Adjusted to childAspectRatio: isWebWide ? 1.5 : 0.95, // Adjusted
    tab_code = tab_code.replace('childAspectRatio: 0.95, // Adjusted to fix 16px vertical overflow', 'childAspectRatio: isWebWide ? 2.5 : 0.95,')
    
    # change crossAxisCount: 2, to crossAxisCount: isWebWide ? 4 : 2,
    tab_code = tab_code.replace('crossAxisCount: 2,', 'crossAxisCount: isWebWide ? 4 : 2,')
    
    # change padding: const EdgeInsets.symmetric(horizontal: 24), to padding: EdgeInsets.symmetric(horizontal: isWebWide ? 40 : 24, vertical: isWebWide ? 24 : 0),
    tab_code = tab_code.replace('padding: const EdgeInsets.symmetric(horizontal: 24),', 'padding: EdgeInsets.symmetric(horizontal: isWebWide ? 40 : 24, vertical: isWebWide ? 24 : 0),')
    
    tab_code += '    });\n  }\n\n'
    
    # Remove the extra } at the end of the original if we append the new closing
    tab_code = tab_code.replace('    );\n  }\n', '    );\n')
    
    new_text = text.replace(overview_match.group(1), tab_code)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Replaced!")
else:
    print("Not found")
