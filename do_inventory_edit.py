import re

file_path = "lib/screens/pharmacist/inventory_edit_screen.dart"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Remove `_pharmacyStockList` (if it exists)
text = re.sub(r'final List<Map<String, dynamic>> _pharmacyStockList.*?;', '', text, flags=re.DOTALL)
text = re.sub(r'String _stockStatus = "Available";', '', text)
text = re.sub(r'// Initialize status based on simulated stock.*?_stockStatus = .*;', '', text, flags=re.DOTALL)

# Ensure class has required callbacks
signature_old = 'final VoidCallback onCancel;\n  final Function(Medicine) onSave;'
signature_new = 'final VoidCallback? onCancel;\n  final Function(Medicine)? onSave;'
if signature_old in text:
    text = text.replace(signature_old, signature_new)
    text = text.replace('required this.onCancel, required this.onSave', 'this.onCancel, this.onSave')
else:
    # Just to be safe, override the whole class definition top if not exact
    pass

# We will just replace the whole build method.
build_start = text.find('Widget build(BuildContext context) {')
# find the next method:
build_end = text.find('Widget _buildCleanInput(', build_start)
if build_end == -1:
    build_end = text.rfind('}')

if build_start != -1:
    modern_build = """Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.black),
                  onPressed: widget.onCancel ?? () => Navigator.pop(context),
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
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Product Basic Info
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        GestureDetector(
                          onTap: _showImageSourceActionSheet,
                          child: Stack(
                            children: [
                              Container(
                                height: 100, width: 100,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  color: Colors.grey.shade100,
                                  image: _getDisplayImage() != null ? DecorationImage(
                                    image: _getDisplayImage()!,
                                    fit: BoxFit.cover,
                                  ) : null,
                                  boxShadow: [
                                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                                  ]
                                ),
                                child: _getDisplayImage() == null 
                                    ? Center(child: Icon(Icons.add_a_photo, color: Colors.grey.shade400, size: 30))
                                    : null,
                              ),
                              Positioned(
                                bottom: -4, right: -4,
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(shape: BoxShape.circle, color: _primaryGreen, border: Border.all(color: Colors.white, width: 2)),
                                  child: const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildCleanInput(controller: _nameController, label: 'Product Name', fontSize: 18, fontWeight: FontWeight.bold),
                              const SizedBox(height: 8),
                              _buildCleanInput(controller: _manufacturerController, label: 'Manufacturer', fontSize: 14, color: Colors.grey.shade600),
                            ],
                          ),
                        )
                      ],
                    ),
                    const SizedBox(height: 32),
                    
                    // Categorization (Using existing builder code inline or as it was)
                    const Text("Categories", style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black87, fontSize: 16)),
                    const SizedBox(height: 16),
                    _buildTaxonomySelector(),
                    
                    const SizedBox(height: 32),

                    // Pricing & Requirements
                    const Text("Pricing & Requirements", style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black87, fontSize: 16)),
                    const SizedBox(height: 12),
                    _buildModernInput(_priceController, "Price (RWF)", icon: Icons.monetization_on_outlined),
                    const SizedBox(height: 12),
                    _buildModernInput(_expiryDateController, "Expiry Date (MM/YYYY)", icon: Icons.calendar_today_outlined),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text("Prescription Required", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      value: _requiresPrescription,
                      onChanged: (val) => setState(() => _requiresPrescription = val),
                      activeThumbColor: _primaryGreen,
                    ),

                    const SizedBox(height: 32),
                    
                    // Documentation & Details
                    const Text("Detailed Information", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black87)),
                    const SizedBox(height: 12),
                    
                    // Modern Tabs
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.all(4),
                      child: Row(
                        children: [
                          _buildModernTab("Description", 0),
                          _buildModernTab("Dosage", 1),
                          _buildModernTab("Side Effects", 2),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    
                    // Tab Content Area
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      child: Column(
                        key: ValueKey(_selectedDetailsTab), // Animate when tab changes
                        children: [
                          if (_selectedDetailsTab == 1)
                            Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(color: _lightGreen, borderRadius: BorderRadius.circular(12)),
                              child: Row(
                                 children: [
                                   Expanded(child: _buildTimeInput("Morning", _doseMorningController)),
                                   const SizedBox(width: 12),
                                   Expanded(child: _buildTimeInput("Afternoon", _doseAfternoonController)),
                                   const SizedBox(width: 12),
                                   Expanded(child: _buildTimeInput("Evening", _doseEveningController)),
                                 ],
                              ),
                            ),
                          // Quill Editor
                          Container(
                            height: 350,
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade300),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              children: [
                                 Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade50,
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                      border: Border(bottom: BorderSide(color: Colors.grey.shade200))
                                    ),
                                    child: quill.QuillSimpleToolbar(
                                      controller: _selectedDetailsTab == 0 ? _descriptionQuillController : _selectedDetailsTab == 1 ? _dosageQuillController : _sideEffectsQuillController,
                                      config: const quill.QuillSimpleToolbarConfig(
                                        showFontFamily: false, showFontSize: false, showSearchButton: false, showInlineCode: false,
                                        showSubscript: false, showSuperscript: false,
                                        multiRowsDisplay: false, 
                                      ),
                                    ),
                                 ),
                                 Expanded(
                                   child: Padding(
                                     padding: const EdgeInsets.all(12),
                                     child: quill.QuillEditor.basic(
                                        controller: _selectedDetailsTab == 0 ? _descriptionQuillController : _selectedDetailsTab == 1 ? _dosageQuillController : _sideEffectsQuillController,
                                        config: const quill.QuillEditorConfig(placeholder: "Enter details here..."),
                                     ),
                                   ),
                                 )
                              ],
                            ),
                          )
                        ],
                      ),
                    ),
                    const SizedBox(height: 50),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }"""
    # Replace it! Wait! Taxonomy selector building code. We need to define `_buildTaxonomySelector()`
    taxonomy_sel = """  Widget _buildTaxonomySelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_selectedTaxonomy.isNotEmpty)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(8),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _selectedTaxonomy.keys.map((cat) {
                return Chip(
                  label: Text(cat, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                  backgroundColor: _primaryGreen,
                  deleteIcon: const Icon(Icons.close, size: 14, color: Colors.white),
                  onDeleted: () {
                    setState(() {
                      _selectedTaxonomy.remove(cat);
                    });
                  },
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide.none),
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                );
              }).toList(),
            ),
          ),

        DropdownButtonFormField<String>(
          key: UniqueKey(),
          initialValue: null, 
          decoration: InputDecoration(
            hintText: "Add a category...",
            prefixIcon: const Icon(Icons.search, color: Colors.grey),
            contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: BorderSide(color: Colors.grey.shade400)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: BorderSide(color: _primaryGreen, width: 2)),
          ),
          items: _categoryHierarchy.keys
              .where((cat) => !_selectedTaxonomy.containsKey(cat))
              .map((cat) => DropdownMenuItem(value: cat, child: Text(cat)))
              .toList(),
          onChanged: (value) {
            if (value != null) {
              setState(() {
                _selectedTaxonomy[value] = {};
              });
            }
          },
          icon: Icon(Icons.add_circle_outline, color: _primaryGreen),
        ),

        if (_selectedTaxonomy.isNotEmpty) ...[
          const SizedBox(height: 24),
          const Text("Sub-categories Details", style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black87, fontSize: 14)),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _selectedTaxonomy.keys.map((cat) {
                final subs = _categoryHierarchy[cat] ?? [];
                if (subs.isEmpty) return const SizedBox.shrink();
                
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.subdirectory_arrow_right, size: 16, color: Colors.grey),
                          const SizedBox(width: 8),
                          Text(cat, style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.black54, fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8.0,
                        runSpacing: 8.0,
                        children: subs.map((sub) {
                          final isSubSelected = _selectedTaxonomy[cat]?.contains(sub) ?? false;
                          return ChoiceChip(
                            label: Text(sub, style: TextStyle(fontSize: 12, color: isSubSelected ? Colors.white : Colors.black87)),
                            selected: isSubSelected,
                            selectedColor: _primaryGreen,
                            backgroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              side: BorderSide(color: isSubSelected ? Colors.transparent : Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            onSelected: (val) {
                              setState(() {
                                if (val) {
                                  _selectedTaxonomy[cat]?.add(sub);
                                } else {
                                  _selectedTaxonomy[cat]?.remove(sub);
                                }
                              });
                            },
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ],
    );
  }\n
"""
    
    text = text[:build_start] + taxonomy_sel + modern_build + text[build_end:]

# Update saving logic to support `widget.onSave` mapping
text = re.sub(r'Navigator\.pop\(context, newMedicine\);', 
              r'if (widget.onSave != null) { widget.onSave!(newMedicine); } else { Navigator.pop(context, newMedicine); }', text)
text = re.sub(r'final VoidCallback onCancel;', r'final VoidCallback? onCancel;', text)
text = re.sub(r'final Function\(Medicine\) onSave;', r'final Function(Medicine)? onSave;', text)
text = re.sub(r'required this\.onCancel,\s*required this\.onSave', r'this.onCancel, this.onSave', text)


# Clean up methods _buildInfoCard, _buildReadOnlyColumn
text = re.sub(r'Widget _buildInfoCard\(\w*\).*?\{.*?\n  \}', '', text, flags=re.DOTALL)
text = re.sub(r'Widget _buildReadOnlyColumn\(\w*\).*?\{.*?\n  \}', '', text, flags=re.DOTALL)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)


## Dashboard
file_path2 = "lib/screens/pharmacist/pharmacist_dashboard_screen.dart"
with open(file_path2, "r", encoding="utf-8") as f:
    text2 = f.read()

# Make sure _isEditingInventoryItem exists
if '_isEditingInventoryItem' not in text2:
    text2 = text2.replace('int _selectedIndex = 0;', 'int _selectedIndex = 0;\n  bool _isEditingInventoryItem = false;\n  Medicine? _editingMedicine;')

# In _buildInventoryTab we want to replace returning _buildInventoryGrid or similar with a test
# Replace `Widget _buildInventoryTab() {` block contents
match = re.search(r'(Widget _buildInventoryTab\(\) \{)(.*?)(  Widget _buildInventoryCard)', text2, re.DOTALL)
if match:
    old_body = match.group(2)
    # inject the editing check
    if 'if (_isEditingInventoryItem)' not in old_body:
        new_body = """
    if (_isEditingInventoryItem) {
      return Expanded(
        child: InventoryEditScreen(
          medicine: _editingMedicine,
          onCancel: () {
            setState(() {
              _isEditingInventoryItem = false;
              _editingMedicine = null;
            });
          },
          onSave: (val) {
            setState(() {
              if (_editingMedicine == null) {
                // adding
                _inventoryList.insert(0, val);
              } else {
                // edit
                final idx = _inventoryList.indexWhere((e) => e.id == val.id);
                if (idx >= 0) _inventoryList[idx] = val;
              }
              _isEditingInventoryItem = false;
              _editingMedicine = null;
            });
          },
        ),
      );
    }
""" + old_body
        text2 = text2[:match.start(2)] + new_body + text2[match.end(2):]

# Update "Add Product" Action in Header 
# Search for the ElevatedButton for Add Product or any Header action.
if 'Add Product' in text2:
    text2 = re.sub(r'onPressed:\s*\(\)\s*=>\s*Navigator\.push\(context,\s*MaterialPageRoute\(\s*builder:\s*\(\_\)\s*=>\s*const InventoryEditScreen\(\)\)\),', 
                   r'onPressed: () => setState(() { _isEditingInventoryItem = true; _editingMedicine = null; }),', text2)
    # Also for `Medicine? medicine`
    text2 = re.sub(r'onPressed:\s*\(\)\s*\{\s*Navigator\.push\(context,\s*MaterialPageRoute\(\s*builder:\s*\(\_\)\s*=>\s*InventoryEditScreen\(medicine:\s*medicine\)\)\);\s*\}', 
                   r'onPressed: () => setState(() { _isEditingInventoryItem = true; _editingMedicine = medicine; }),', text2)

    # In case there's a popup menu edit...
    text2 = re.sub(r'PopupMenuItem\(.*?"Edit".*?onTap: \(\) \{', r'PopupMenuItem(value: "edit", child: Text("Edit"), onTap: () {', text2, flags=re.DOTALL)

with open(file_path2, "w", encoding="utf-8") as f:
    f.write(text2)

print("Done Refactoring!")
