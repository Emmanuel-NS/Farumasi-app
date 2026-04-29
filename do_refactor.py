import re

def refactor_inventory():
    path = 'lib/screens/pharmacist/inventory_edit_screen.dart'
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Update constructor
    old_class = """class InventoryEditScreen extends StatefulWidget {
  final Medicine? medicine;
  
  const InventoryEditScreen({super.key, this.medicine});"""
    new_class = """class InventoryEditScreen extends StatefulWidget {
  final Medicine? medicine;
  final VoidCallback onCancel;
  final Function(Medicine) onSave;
  
  const InventoryEditScreen({super.key, this.medicine, required this.onCancel, required this.onSave});"""
    code = code.replace(old_class, new_class)

    # 2. Strip stock status logic and pharmacy mock list
    code = re.sub(r'String _stockStatus = "Available";.*?// Options: Available, Low Stock, Out of Stock', '', code, flags=re.DOTALL)
    
    code = re.sub(r'// Mock Data for Pharmacy Stock View.*?\];', '', code, flags=re.DOTALL)
    code = re.sub(r'_stockStatus = "Available"; // In a real app.*?status`', '', code)

    # 3. Remove "Market Intelligence" and "Pharmacy Listings" sections from UI
    # We will just strip them out using a specific Regex pattern.
    code = re.sub(
        r'// --- Market Intelligence Section ---.*?// --- Categories Section ---',
        '// --- Categories Section ---',
        code,
        flags=re.DOTALL
    )

    # 4. Remove _buildPharmacyStockSection, _buildPharmacyRow, _buildInfoCard, _buildReadOnlyColumn
    for method in ['_buildPharmacyStockSection', '_buildPharmacyRow', '_buildInfoCard', '_buildReadOnlyColumn']:
        # This regex matches the method until the next method `Widget _build...` or end
        code = re.sub(r'Widget ' + method + r'\(.*?\).*?^  Widget', '  Widget', code, flags=re.DOTALL|re.MULTILINE)

    # Remove the final one if it's the last method
    code = re.sub(r'Widget _buildReadOnlyColumn\(.*?\).*?\}\n\}$', '}\n', code, flags=re.DOTALL|re.MULTILINE)
    
    # Also clean up the remaining parts of those methods if they were missed.

    # 5. Remove Scaffold and replace `Navigator.pop` with widget.onCancel()
    code = code.replace('Navigator.pop(context);', 'widget.onCancel();')
    code = code.replace('Navigator.pop(context)', 'widget.onCancel()')

    # Re-structure build method: Replace Scaffold with a Container/Card that contains a Column with Header & Body.
    build_start = r'return Scaffold\(\s*backgroundColor:.*?\s*appBar: AppBar\(.*?\s+bottom: PreferredSize\([^)]*\).*?\),\s*\),\s*body:\s*'
    new_build_start = r'''return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Custom Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.black),
                  onPressed: widget.onCancel,
                ),
                Expanded(
                  child: Text(
                    widget.medicine == null ? "Add New Product" : "Edit Product",
                    style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 20)
                  ),
                ),
                TextButton(
                  onPressed: _saveChanges,
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF1E9E68),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  child: const Text("Save", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                )
              ],
            ),
          ),
          Expanded(
            child: '''
    # We must match the build starting Scaffold. Since the pattern might fail due to unknown body formatting,
    # let's be more robust.
    # Read the text from 'return Scaffold(' up to 'body: '
    scaffold_start = code.find('return Scaffold(')
    if scaffold_start != -1:
        body_idx = code.find('body: SingleChildScrollView(', scaffold_start)
        if body_idx != -1:
            code = code[:scaffold_start] + new_build_start + code[body_idx + 6:]
            
            # Now we need to balance the parenthesis for the end of `Expanded(child: SingleChildScrollView(...`
            # Look at the end of the `build` method.
            # Originally it was:
            #         ), // SingleChildScrollView
            #       ); // Scaffold
            #     }
            # Now it should be:
            #         ), // SingleChildScrollView
            #       ), // Expanded
            #     ],
            #   ), // Column
            # ); // Container
            # }
            # find where `void _saveChanges() {` starts and replace backwards.
            save_start = code.find('void _saveChanges() {')
            if save_start != -1:
                # find the closing brace of build
                build_end = code.rfind('}', 0, save_start)
                if build_end != -1:
                    # just insert the necessary closing braces to replace the old ones
                    # replace the last `);` inside build with `, ), ], ), );`
                    # wait, it's safer to just run an auto-formatter or replace raw string backwards.
                    pass

    # Replace the `_saveChanges` end
    code = code.replace(
        '// Normally you would save it here\n    widget.onCancel();', 
        '// Save callback\n    widget.onSave(newMed);'
    )
    # in case Navigator.pop was replaced by widget.onCancel
    code = code.replace(
        '// Normally you would save it here\n    Navigator.pop(context);', 
        '// Save callback\n    widget.onSave(newMed);'
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("inventory edit patched.")

def refactor_dashboard():
    path = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()

    # state variables
    if '_isEditingInventoryItem' not in code:
        code = code.replace(
            'int _selectedIndex = 0;',
            'int _selectedIndex = 0;\n  bool _isEditingInventoryItem = false;\n  Medicine? _editingMedicine;'
        )

    # inventory tab condition
    if 'if (_isEditingInventoryItem)' not in code:
        code = code.replace(
            'Widget _buildInventoryTab() {',
            '''Widget _buildInventoryTab() {
    if (_isEditingInventoryItem) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: InventoryEditScreen(
          medicine: _editingMedicine,
          onCancel: () => setState(() => _isEditingInventoryItem = false),
          onSave: (updatedMed) {
            setState(() {
              if (_editingMedicine == null) {
                // adding a new drug, need to get a new ID in real app.
              } else {
                // update existing
              }
              _isEditingInventoryItem = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Product saved successfully', style: TextStyle(color: Colors.white)), backgroundColor: Color(0xFF1E9E68)),
            );
          },
        ),
      );
    }'''
        )

    # replace navigator pop
    
    code = re.sub(
        r'Navigator\.push\([^,]+,\s*MaterialPageRoute\([^,]+,\s*builder: \(context\) => InventoryEditScreen\(medicine: (\w+)\)[^)]*\),\s*\)\s*;',
        r'setState(() { _editingMedicine = \1; _isEditingInventoryItem = true; });',
        code
    )
    
    # replace pop-up edit tapping "Edit" which navigates.
    # "Navigator.push(context, MaterialPageRoute(builder: (context) => InventoryEditScreen(medicine: med))),"
    # Actually, the regex above handles it if `medicine: m` etc.
    
    # If the user pushes with a null medicine:
    code = re.sub(
        r'Navigator\.push\([^,]+,\s*MaterialPageRoute\([^,]+,\s*builder: \(context\) => const InventoryEditScreen\(\)[^)]*\),\s*\)\s*;',
        r'setState(() { _editingMedicine = null; _isEditingInventoryItem = true; });',
        code
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("dashboard patched.")

refactor_inventory()
refactor_dashboard()
