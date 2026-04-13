import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

tabs = [
    'Widget _buildOverviewTab() {',
    'Widget _buildRequestsTab() {',
    'Widget _buildOrdersTab() {',
    'Widget _buildInventoryTab() {',
    'Widget _buildMoreTab() {',
]

for tab in tabs:
    # We find the start of the return statement
    start_search = text.find(tab)
    if start_search == -1:
        continue
        
    ret_str = 'return '
    ret_idx = text.find(ret_str, start_search)
    
    if ret_idx == -1:
        continue
    
    start_pos = ret_idx + len(ret_str)
    
    open_brackets = 0
    in_string = False
    escape = False
    string_char = None
    
    body_end = -1
    for i in range(start_pos, len(text)):
        char = text[i]
        
        if escape:
            escape = False
            continue
            
        if char == '\\\\':
            escape = True
            continue
            
        if in_string:
            if char == string_char:
                in_string = False
        else:
            if char in ["'", '"']:
                in_string = True
                string_char = char
            elif char in ['(', '{', '[']:
                open_brackets += 1
            elif char in [')', '}', ']']:
                open_brackets -= 1
            elif char == ';' and open_brackets == 0:
                body_end = i
                break

    if body_end != -1:
        # Wrap the returned widget
        widget_text = text[start_pos:body_end].strip()
        # Ensure it's not already wrapped! Avoid double wrap
        if not widget_text.startswith('Center(child: ConstrainedBox'):
            new_widget_text = 'Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1200), child: ' + widget_text + '))'
            text = text[:start_pos] + new_widget_text + text[body_end:]

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print("Tabs wrapped successfully!")
