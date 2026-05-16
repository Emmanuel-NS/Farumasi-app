import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

import_stmt = "import 'pharmacist_health_posts_screen.dart';\n"
if import_stmt not in text:
    text = text.replace("import 'inventory_edit_screen.dart';", import_stmt + "import 'inventory_edit_screen.dart';")

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print("Import inserted")
