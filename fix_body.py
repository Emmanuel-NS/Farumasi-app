import re

with open('lib/screens/driver_profile_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

out_text = []
idx = 0

while True:
    match = re.search(r'body:\s*', text[idx:])
    if not match:
        out_text.append(text[idx:])
        break
    
    match_start = idx + match.start()
    out_text.append(text[idx:match_start])
    
    start_pos = idx + match.end()
    
    # We want to insert 'Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 600), child: '
    out_text.append('body: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 600), child: ')
    
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
            if char in ["'", '\"']:
                in_string = True
                string_char = char
            elif char in ['(', '{', '[']:
                open_brackets += 1
            elif char in [')', '}', ']']:
                open_brackets -= 1
                if open_brackets < 0:
                    body_end = i
                    break
            elif char == ',' and open_brackets == 0:
                body_end = i
                break
                
    if body_end == -1:
        body_end = len(text)
        
    body_str = text[start_pos:body_end]
    
    out_text.append(body_str.strip())
    out_text.append('))')
    idx = body_end

new_text = ''.join(out_text)

with open('lib/screens/driver_profile_screen.dart', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Wrapped successfully!")
