import re

def read_build():
    path = 'lib/screens/pharmacist/inventory_edit_screen.dart'
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    start = -1
    for i, l in enumerate(lines):
        if "Widget build(BuildContext context) {" in l:
            start = i
            break
            
    if start != -1:
        print("".join(lines[start:start+150]))

read_build()
