import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

def replace_list_with_grid(tab_func_name, list_regex, ext):
    start = text.find(tab_func_name)
    end = text.find('Widget _', start + 10)
    if start == -1 or end == -1: end = len(text)
    
    sub = text[start:end]
    new_sub = re.sub(
        r'ListView\.builder\([\s\S]*?itemBuilder:\s*\(context,\s*index\)\s*\{',
        r'''GridView.builder(
      padding: const EdgeInsets.all(24),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: MediaQuery.of(context).size.width > 900 ? 2 : 1,
        mainAxisExtent: ''' + str(ext) + ''',
        crossAxisSpacing: 24,
        mainAxisSpacing: 16,
      ),
      itemCount: list.length,
      itemBuilder: (context, index) {''',
        sub
    )
    return text[:start] + new_sub + text[end:]

text = replace_list_with_grid('Widget _buildRequestsTab', r'ListView', 280)
text = replace_list_with_grid('Widget _buildOrdersTab', r'ListView', 280)

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)
