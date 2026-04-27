import os

for root, dirs, files in os.walk('lib'):
    for f in files:
        if f.endswith('.dart'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            if "'Farumasi " in content or '"Farumasi ' in content:
                new_content = content.replace("'Farumasi ", "'FARUMASI ").replace('"Farumasi ', '"FARUMASI ')
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print("Updated " + path)
