import 'package:flutter/material.dart';
import '../../models/models.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;

class InventoryEditScreen extends StatefulWidget {
  final Medicine medicine;
  
  const InventoryEditScreen({Key? key, required this.medicine}) : super(key: key);

  @override
  State<InventoryEditScreen> createState() => _InventoryEditScreenState();
}

class _InventoryEditScreenState extends State<InventoryEditScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Basic Info
  late TextEditingController _nameController;
  late TextEditingController _manufacturerController;
  late TextEditingController _priceController;
  late TextEditingController _stockController; // Simulated
  late TextEditingController _expiryDateController;

  // Details
  // late TextEditingController _descriptionController; // Replaced by Quill Controller

  // Taxonomy Selection
  final Map<String, List<String>> _categoryHierarchy = {
    "Medication": ["Pain Relief", "Antibiotics", "Digestive Health", "Allergy & Asthma", "First Aid", "Cold & Flu"],
    "Supplements": ["Vitamins", "Minerals", "Herbal", "Protein", "Energy"],
    "Mother & Baby": ["Diapers", "Baby Food", "Skin Care", "Pregnancy Care", "Feeding"],
    "Personal Care": ["Skin Care", "Hair Care", "Oral Care", "Feminine Hygiene", "Deodorants"],
    "Medical Devices": ["Monitors", "Thermometers", "Supports & Braces", "Mobility Aids"],
    "Wellness": ["Sleeplessness", "Stress Relief", "Weight Management"],
  };

  final Map<String, Set<String>> _selectedTaxonomy = {}; 

  // Medical Info (Replaced by Quill Controllers)
  // late TextEditingController _dosageController;
  // late TextEditingController _sideEffectsController;
  
  late quill.QuillController _descriptionQuillController;
  late quill.QuillController _sideEffectsQuillController;
  late quill.QuillController _dosageQuillController;
  
  // Structured Dosage
  late TextEditingController _doseMorningController;
  late TextEditingController _doseAfternoonController;
  late TextEditingController _doseEveningController;
  late TextEditingController _doseIntervalController;

  // Booleans
  bool _requiresPrescription = false;
  bool _isPopular = false;

  // UI State
  int _selectedDetailsTab = 0; // 0: Description, 1: Side Effects, 2: Dosage

  @override
  void initState() {
    super.initState();
    // Basic
    _nameController = TextEditingController(text: widget.medicine.name);
    _manufacturerController = TextEditingController(text: widget.medicine.manufacturer);
    _priceController = TextEditingController(text: widget.medicine.price.toString());
    _stockController = TextEditingController(text: "50"); // Mock
    _expiryDateController = TextEditingController(text: widget.medicine.expiryDate ?? "");

    // Details: Initialize Quill Controllers
    _descriptionQuillController = quill.QuillController(
      document: quill.Document()..insert(0, widget.medicine.description),
      selection: const TextSelection.collapsed(offset: 0),
    );
    
    _sideEffectsQuillController = quill.QuillController(
      document: quill.Document()..insert(0, widget.medicine.sideEffects),
      selection: const TextSelection.collapsed(offset: 0),
    );

    _dosageQuillController = quill.QuillController(
      document: quill.Document()..insert(0, widget.medicine.dosage),
      selection: const TextSelection.collapsed(offset: 0),
    );
    
    // 1. Add Primary
    _addToTaxonomy(widget.medicine.category, widget.medicine.subCategory);
    
    // 2. Add Additional Categories 
    for (String cat in widget.medicine.additionalCategories) {
      if (!_selectedTaxonomy.containsKey(cat)) {
        _selectedTaxonomy[cat] = {};
      }
    }

    // 3. Add Additional SubCategories
    for (String sub in widget.medicine.additionalSubCategories) {
       String? parentCat;
       _categoryHierarchy.forEach((key, value) {
         if (value.contains(sub)) parentCat = key;
       });
       if (parentCat != null) {
          if (!_selectedTaxonomy.containsKey(parentCat)) {
            _selectedTaxonomy[parentCat!] = {};
          }
          _selectedTaxonomy[parentCat!]!.add(sub);
       }
    }

    // Medical
    // _dosageController = TextEditingController(text: widget.medicine.dosage);
    // _sideEffectsController = TextEditingController(text: widget.medicine.sideEffects);
    
    // Structured Dosage
    _doseMorningController = TextEditingController(text: widget.medicine.doseMorning ?? "");
    _doseAfternoonController = TextEditingController(text: widget.medicine.doseAfternoon ?? "");
    _doseEveningController = TextEditingController(text: widget.medicine.doseEvening ?? "");
    _doseIntervalController = TextEditingController(text: widget.medicine.doseTimeInterval ?? "");

    // Booleans
    _requiresPrescription = widget.medicine.requiresPrescription;
    _isPopular = widget.medicine.isPopular;
  }

  void _addToTaxonomy(String cat, String? sub) {
    if (!_selectedTaxonomy.containsKey(cat)) {
      _selectedTaxonomy[cat] = {};
    }
    if (sub != null && sub.isNotEmpty) {
      _selectedTaxonomy[cat]!.add(sub);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _manufacturerController.dispose();
    _priceController.dispose();
    _stockController.dispose();
    _expiryDateController.dispose();
    // _descriptionController.dispose();
    _descriptionQuillController.dispose();
    _sideEffectsQuillController.dispose();
    _dosageQuillController.dispose();
    // _dosageController.dispose();
    // _sideEffectsController.dispose();
    _doseMorningController.dispose();
    _doseAfternoonController.dispose();
    _doseEveningController.dispose();
    _doseIntervalController.dispose();
    super.dispose();
  }

  void _saveChanges() {
    // Collect plain text from Quill
    final description = _descriptionQuillController.document.toPlainText().trim();
    final dosage = _dosageQuillController.document.toPlainText().trim();
    final sideEffects = _sideEffectsQuillController.document.toPlainText().trim();

    if (_formKey.currentState!.validate()) {
      // 1. Determine Primary Category & SubCategory
      String primaryCat = _categoryHierarchy.keys.first; 
      String? primarySub;
      
      final keys = _selectedTaxonomy.keys.toList();
      if (keys.isNotEmpty) {
        primaryCat = keys.first;
        if (_selectedTaxonomy[primaryCat]!.isNotEmpty) {
          primarySub = _selectedTaxonomy[primaryCat]!.first;
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select at least one category')),
        );
        return;
      }
      
      // Simulate save
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Saved!\nCategories: \nPrimary:  / '),
          duration: const Duration(seconds: 2),
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F2EF), 
      appBar: AppBar(
        title: const Text('Edit Product', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w600, fontSize: 16)),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black54), 
          onPressed: () => Navigator.pop(context)
        ),
        actions: [
          TextButton(
            onPressed: _saveChanges,
            child: const Text("Save", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          )
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(color: Colors.grey.shade300, height: 1.0),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // --- Image Section (Card) ---
              _buildCard(
                child: Column(
                  children: [
                    Center(
                      child: Stack(
                        children: [
                          Container(
                            height: 120, width: 120,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.grey.shade200, width: 4),
                              image: DecorationImage(
                                image: NetworkImage(widget.medicine.imageUrl),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 0, right: 0,
                            child: CircleAvatar(
                              backgroundColor: Colors.white,
                              radius: 18,
                              child: IconButton(
                                icon: const Icon(Icons.camera_alt, size: 18, color: Color(0xFF0A66C2)),
                                onPressed: () {},
                                padding: EdgeInsets.zero,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text("Product Image", style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
                  ],
                ),
              ),
              
              const SizedBox(height: 16),

              // --- Basic Info Section ---
              _buildCard(
                title: "Basic Information",
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLinkedInInput(controller: _nameController, label: 'Product Name', hint: 'Ex: Panadol Extra'),
                    const SizedBox(height: 20),
                    _buildLinkedInInput(controller: _manufacturerController, label: 'Manufacturer', hint: 'Ex: GSK'),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(child: _buildLinkedInInput(controller: _priceController, label: 'Price (RWF)', hint: '0.00', keyboardType: TextInputType.number)),
                        const SizedBox(width: 20),
                        Expanded(child: _buildLinkedInInput(controller: _stockController, label: 'Stock Quantity', hint: '0', keyboardType: TextInputType.number)),
                      ],
                    ),
                    const SizedBox(height: 20),
                    _buildLinkedInInput(controller: _expiryDateController, label: 'Expiry Date', hint: 'MM/YY', icon: Icons.calendar_today),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // --- Categorization ---
              _buildCard(
                title: "Taxonomy & Settings",
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Category", style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black87, fontSize: 14)),
                    const SizedBox(height: 8),
                    
                    // Selected Categories CHIPS
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
                              backgroundColor: const Color(0xFF0A66C2),
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

                    // DROPDOWN for Adding Category
                    DropdownButtonFormField<String>(
                      key: UniqueKey(), // Force rebuild to reset internal state
                      value: null, // Ensure value is always null so it acts as an action button
                      decoration: InputDecoration(
                        hintText: "Add a category...",
                        prefixIcon: const Icon(Icons.search, color: Colors.grey),
                        contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: BorderSide(color: Colors.grey.shade400)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFF0A66C2), width: 2)),
                      ),
                      items: _categoryHierarchy.keys
                          .where((cat) => !_selectedTaxonomy.containsKey(cat)) // Filter out already selected
                          .map((cat) => DropdownMenuItem(value: cat, child: Text(cat)))
                          .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _selectedTaxonomy[value] = {};
                          });
                        }
                      },
                      icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0A66C2)),
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
                                        selectedColor: const Color(0xFF0A66C2),
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
                    
                    const SizedBox(height: 24),
                    
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text("Prescription Required", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      value: _requiresPrescription,
                      onChanged: (val) => setState(() => _requiresPrescription = val),
                      activeColor: const Color(0xFF0A66C2),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text("Show in Popular", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      value: _isPopular,
                      onChanged: (val) => setState(() => _isPopular = val),
                      activeColor: const Color(0xFF0A66C2),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // --- Documentation Editor ---
              _buildCard(
                title: "Medicine Documentation",
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Custom Tab Bar
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: Row(
                        children: [
                          _buildEditorTab("About", 0),
                          Container(width: 1, height: 24, color: Colors.grey.shade300),
                          _buildEditorTab("Side Effects", 1),
                          Container(width: 1, height: 24, color: Colors.grey.shade300),
                          _buildEditorTab("Dosage", 2),
                        ],
                      ),
                    ),
                    
                    // Editor Area
                    Container(
                      height: 400, // Taller editor area
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border(
                          left: BorderSide(color: Colors.grey.shade300),
                          right: BorderSide(color: Colors.grey.shade300),
                          bottom: BorderSide(color: Colors.grey.shade300),
                        ),
                        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(4)),
                      ),
                      child: Column(
                        children: [
                          // Dynamic Toolbar
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
                              color: Colors.grey.shade50,
                            ),
                            child: quill.QuillSimpleToolbar(
                              controller: _selectedDetailsTab == 0
                                  ? _descriptionQuillController
                                  : _selectedDetailsTab == 1
                                      ? _sideEffectsQuillController
                                      : _dosageQuillController,
                              config: const quill.QuillSimpleToolbarConfig(
                                showFontFamily: false,
                                showFontSize: false,
                                showSearchButton: false, 
                                showInlineCode: false,
                                showSubscript: false,
                                showSuperscript: false,
                                showHeaderStyle: true,
                                showListNumbers: true,
                                showListBullets: true,
                                showBoldButton: true,
                                showItalicButton: true,
                                showUnderLineButton: true,
                                showStrikeThrough: true,
                                showLink: true,
                                showUndo: true,
                                showRedo: true,
                                showClearFormat: true,
                                multiRowsDisplay: false, 
                              ),
                            ),
                          ),
                          
                          // Editor Content
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              child: quill.QuillEditor.basic(
                                controller: _selectedDetailsTab == 0
                                    ? _descriptionQuillController
                                    : _selectedDetailsTab == 1
                                        ? _sideEffectsQuillController
                                        : _dosageQuillController,
                                config: const quill.QuillEditorConfig(
                                  placeholder: "Start typing...",
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          _selectedDetailsTab == 0 ? "General Info" : _selectedDetailsTab == 1 ? "Safety Info" : "Usage Info",
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCard({String? title, required Widget child}) {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      margin: const EdgeInsets.only(bottom: 8), 
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.black87)),
            const SizedBox(height: 24),
          ],
          child,
        ],
      ),
    );
  }

  Widget _buildLinkedInInput({
    required TextEditingController controller,
    required String label,
    String? hint,
    IconData? icon,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.w400, fontSize: 14)),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          style: const TextStyle(fontSize: 14, color: Colors.black87),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade500),
            contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
            isDense: true,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(4),
              borderSide: BorderSide(color: Colors.grey.shade600, width: 1), 
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(4),
              borderSide: const BorderSide(color: Colors.black87, width: 2), 
            ),
            suffixIcon: icon != null ? Icon(icon, size: 20, color: Colors.grey.shade600) : null,
          ),
        ),
      ],
    );
  }

  Widget _buildEditorTab(String label, int index) {
    bool isSelected = _selectedDetailsTab == index;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedDetailsTab = index;
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.grey.shade100,
            border: Border(
              bottom: BorderSide(
                color: isSelected ? Colors.white : Colors.grey.shade300,
                width: isSelected ? 2 : 1, // Hide bottom border if selected to merge with content
              ),
              top: isSelected ? const BorderSide(color: Color(0xFF0A66C2), width: 3) : BorderSide.none,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: isSelected ? const Color(0xFF0A66C2) : Colors.black54,
            ),
          ),
        ),
      ),
    );
  }

  // Helper method removed as QuillEditor is used directly
  // Widget _buildEditorField(...)

}
