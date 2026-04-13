import re
import glob

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    out_text = []
    idx = 0
    changed = False

    while True:
        match = re.search(r'body:\s*', text[idx:])
        if not match:
            out_text.append(text[idx:])
            break
        
        match_start = idx + match.start()
        out_text.append(text[idx:match_start])
        
        start_pos = idx + match.end()
        already_wrapped = text[start_pos:start_pos+30].find('Center(child: ConstrainedBox') != -1
        if already_wrapped:
            out_text.append('body: ')
            idx = start_pos
            continue
            
        out_text.append('body: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 800), child: ')
        changed = True
        
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
        out_text.append(')))')
        idx = body_end

    if changed:
        new_text = ''.join(out_text)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f"Wrapped successfully: {filepath}")

for path in glob.glob('lib/screens/pharmacist/*.dart'):
    if 'pharmacist_dashboard_screen.dart' in path: 
        continue
    if 'chat' in path:
        continue
    try:
        process_file(path)
    except Exception as e:
        pass

print('Done wrapping other pharmacist screens')
