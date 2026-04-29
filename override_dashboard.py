import re

path = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace add product
text = re.sub(
    r'final result = await Navigator\.push\([^;]*?builder: \(c\) => const InventoryEditScreen\(\),[^;]*?\);\s*if \(result != null && result is Medicine\) \{(.*?)\}',
    r'''setState(() { _editingMedicine = null; _isEditingInventoryItem = true; });''',
    text,
    flags=re.DOTALL
)

# Replace edit product
text = re.sub(
    r'final result = await Navigator\.push\([^;]*?builder: \(\_\) => InventoryEditScreen\(medicine: med\),[^;]*?\);\s*if \(result != null && result is Medicine\) \{(.*?)\}',
    r'''setState(() { _editingMedicine = med; _isEditingInventoryItem = true; });''',
    text,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Done patching dashboard.")
