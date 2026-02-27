import 'package:flutter/material.dart';
import '../../models/models.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class InventoryEditScreen extends StatefulWidget {
  final Medicine? medicine;
  
  const InventoryEditScreen({Key? key, this.medicine}) : super(key: key);

  @override
  State<InventoryEditScreen> createState() => _InventoryEditScreenState();
}

class _InventoryEditScreenState extends State<InventoryEditScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Basic Info
  late TextEditingController _nameController;
  late TextEditingController _manufacturerController;
  late TextEditingController _priceController;
  // late TextEditingController _stockController; // Replaced by stock status
  late TextEditingController _expiryDateController;

  // New Summary Fields
  late TextEditingController _shortDescriptionController;
  late TextEditingController _dosageSummaryController;

  // Stock Status
  String _stockStatus = "Available"; // Options: Available, Low Stock, Out of Stock


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
  
  // Image State
  File? _selectedImageFile;
  String? _enteredImageUrl;
  
  // Mock Data for Pharmacy Stock View
  final List<Map<String, dynamic>> _pharmacyStockList = [
    {
      "name": "Kigali City Pharmacy",
      "location": "Nyarugenge, KN 2 St",
      "price": 1800,
      "expiry": "12/2025",
      "status": "Available",
      "quantity": 45
    },
    {
      "name": "HealthFirst Pharma",
      "location": "Remera, KG 11 Ave",
      "price": 1750,
      "expiry": "10/2025",
      "status": "Low Stock",
      "quantity": 5
    },
    {
      "name": "LifeCare Pharmacy",
      "location": "Kicukiro, KK 15 Rd",
      "price": 1900,
      "expiry": "01/2026",
      "status": "Available",
      "quantity": 120
    },
    {
      "name": "Downtown Meds",
      "location": "Nyarugenge, KN 4 St",
      "price": 1850,
      "expiry": "11/2025",
      "status": "Out of Stock",
      "quantity": 0
    },
     {
      "name": "Wellness Center",
      "location": "Gisozi, KG 14 Ave",
      "price": 2000,
      "expiry": "06/2026",
      "status": "Available",
      "quantity": 30
    },
  ];

  // UI State
  int _selectedDetailsTab = 0; // 0: Description, 1: Side Effects, 2: Dosage

  @override
  void initState() {
    super.initState();
    final m = widget.medicine;

    // Basic
    _nameController = TextEditingController(text: m?.name ?? "");
    _manufacturerController = TextEditingController(text: m?.manufacturer ?? "");
    _priceController = TextEditingController(text: m?.price.toString() ?? "");
    // _stockController = TextEditingController(text: "50"); // Mock
    _expiryDateController = TextEditingController(text: m?.expiryDate ?? "");
    
    // Summary Fields
    _shortDescriptionController = TextEditingController(text: "Effective pain reliever."); // Mock def
    _dosageSummaryController = TextEditingController(text: "1-2 tablets every 4-6 hours."); // Mock def
    if (m == null) {
       _shortDescriptionController.text = "";
       _dosageSummaryController.text = "";
    }

    // Initialize status based on simulated stock
    _stockStatus = "Available"; // In a real app, this would come from `widget.medicine.status`

    // Details: Initialize Quill Controllers
    _descriptionQuillController = quill.QuillController(
      document: m != null 
        ? (quill.Document()..insert(0, m.description))
        : quill.Document(),
      selection: const TextSelection.collapsed(offset: 0),
    );
    
    _sideEffectsQuillController = quill.QuillController(
      document: m != null
        ? (quill.Document()..insert(0, m.sideEffects))
        : quill.Document(),
      selection: const TextSelection.collapsed(offset: 0),
    );

    _dosageQuillController = quill.QuillController(
      document: m != null
        ? (quill.Document()..insert(0, m.dosage))
        : quill.Document(),
      selection: const TextSelection.collapsed(offset: 0),
    );
    
    if (m != null) {
      // 1. Add Primary
      _addToTaxonomy(m.category, m.subCategory);
      
      // 2. Add Additional Categories 
      for (String cat in m.additionalCategories) {
        if (!_selectedTaxonomy.containsKey(cat)) {
          _selectedTaxonomy[cat] = {};
        }
      }

      // 3. Add Additional SubCategories
      for (String sub in m.additionalSubCategories) {
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
    }

    // Structued Dosage
    _doseMorningController = TextEditingController(text: m?.doseMorning ?? "");
    _doseAfternoonController = TextEditingController(text: m?.doseAfternoon ?? "");
    _doseEveningController = TextEditingController(text: m?.doseEvening ?? "");
    _doseIntervalController = TextEditingController(text: m?.doseTimeInterval ?? "");

    // Booleans
    _requiresPrescription = m?.requiresPrescription ?? false;
  }

  void _addToTaxonomy(String cat, String? sub) {
    if (!_selectedTaxonomy.containsKey(cat)) {
      _selectedTaxonomy[cat] = {};
    }
    if (sub != null && sub.isNotEmpty) {
      _selectedTaxonomy[cat]!.add(sub);
    }
  }

  // --- Image Picker Logic ---
  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source);
    
    if (pickedFile != null) {
      setState(() {
        _selectedImageFile = File(pickedFile.path);
        _enteredImageUrl = null; // Clear URL if file is selected
      });
    }
  }

  void _showLinkDialog() {
    final urlController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Enter Image URL"),
        content: TextField(
          controller: urlController,
          decoration: const InputDecoration(hintText: "https://example.com/image.jpg"),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          TextButton(
            onPressed: () {
              if (urlController.text.isNotEmpty) {
                setState(() {
                  _enteredImageUrl = urlController.text;
                  _selectedImageFile = null;
                });
              }
              Navigator.pop(ctx);
            }, 
            child: const Text("Set URL")
          ),
        ],
      ),
    );
  }

  void _showImageSourceActionSheet() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text("Take Photo"),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text("Choose from Gallery"),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.link),
              title: const Text("Enter URL"),
              onTap: () {
                Navigator.pop(ctx);
                _showLinkDialog();
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _manufacturerController.dispose();
    _priceController.dispose();
    // _stockController.dispose();
    _expiryDateController.dispose();
    // _descriptionController.dispose();

    _shortDescriptionController.dispose();
    _dosageSummaryController.dispose();

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
      
      // Simulate save - Handling Image
      String imageMsg = "No image change";
      if (_selectedImageFile != null) imageMsg = "New Image Uploaded";
      if (_enteredImageUrl != null) imageMsg = "New Image URL Set";

      final newMedicine = Medicine(
        id: widget.medicine?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
        name: _nameController.text.isNotEmpty ? _nameController.text : "New Product",
        manufacturer: _manufacturerController.text,
        price: double.tryParse(_priceController.text) ?? 0.0,
        imageUrl: _selectedImageFile?.path ?? _enteredImageUrl ?? widget.medicine?.imageUrl ?? 'https://via.placeholder.com/150',
        description: description.isNotEmpty ? description : "No description",
        rating: widget.medicine?.rating ?? 0.0,
        expiryDate: _expiryDateController.text,
        category: primaryCat,
        subCategory: primarySub,
        additionalCategories: _selectedTaxonomy.keys.where((k) => k != primaryCat).toList(),
        additionalSubCategories: _selectedTaxonomy.values.expand((set) => set).toList(), // Simplified
        requiresPrescription: _requiresPrescription,
        sideEffects: sideEffects,
        dosage: dosage,
        doseMorning: _doseMorningController.text,
        doseAfternoon: _doseAfternoonController.text,
        doseEvening: _doseEveningController.text,
        doseTimeInterval: _doseIntervalController.text,
      );

      ScaffoldMessenger.of(context).showSnackBar(
         SnackBar(
          content: Text('Product Saved!\n$imageMsg'),
          duration: const Duration(seconds: 2),
        ),
      );
      Navigator.pop(context, newMedicine);
    }
  }

  ImageProvider? _getDisplayImage() {
    if (_selectedImageFile != null) return FileImage(_selectedImageFile!);
    if (_enteredImageUrl != null) return NetworkImage(_enteredImageUrl!); // User entered URL
    if (widget.medicine != null && widget.medicine!.imageUrl.isNotEmpty) {
      return NetworkImage(widget.medicine!.imageUrl);
    }
    return null; // No image
  }

  // --- Theme Colors ---
  final Color _primaryGreen = const Color(0xFF1B5E20); // Dark Green
  final Color _lightGreen = const Color(0xFFE8F5E9);   // Light Green Background
  final Color _textDark = const Color(0xFF1F2937);     // Dark Grey for Text

  // --- Build ---
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          widget.medicine == null ? "Add New Product" : "Edit Product",
          style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold)
        ),
        actions: [
           TextButton(
            onPressed: _saveChanges,
            style: TextButton.styleFrom(
              foregroundColor: _primaryGreen,
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            child: const Text("Save", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          )
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(color: Colors.grey.shade100, height: 1.0),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- Header: Image & Quick Info ---
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image
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
                  // Name & Manufacturer
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildCleanInput(controller: _nameController, label: 'Product Name', fontSize: 18, fontWeight: FontWeight.bold),
                        const SizedBox(height: 8),
                        _buildCleanInput(controller: _manufacturerController, label: 'Manufacturer', fontSize: 14, color: Colors.grey.shade600),
                        const SizedBox(height: 12),
                        // Status Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _stockStatus == "Available" ? _lightGreen : Colors.orange.shade50,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _stockStatus,
                            style: TextStyle(
                              color: _stockStatus == "Available" ? _primaryGreen : Colors.orange.shade800,
                              fontWeight: FontWeight.w600,
                              fontSize: 12
                            ),
                          ),
                        )
                      ],
                    ),
                  )
                ],
              ),

              const SizedBox(height: 32),

              // --- Market Intelligence Section ---
              const Text("Market Intelligence", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black87)),
              const SizedBox(height: 12),
              
              // New Dashboard Grid
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                childAspectRatio: 1.3, // Significantly increased height (lower ratio) to fix 44px overflow
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                children: [
                  _buildInfoCard("Market Avg Price", "1,850 RWF", Icons.monetization_on_outlined, Colors.blue),
                  _buildInfoCard("Expiry Range", "6-18 Months", Icons.calendar_today_outlined, Colors.purple),
                  _buildInfoCard("Availability", "High (85%)", Icons.inventory_2_outlined, Colors.green),
                  _buildInfoCard("Competitors", "5 Local", Icons.store_mall_directory_outlined, Colors.orange),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Price & Expiry Range (Read Only) 
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    Expanded(child: _buildReadOnlyColumn("Standard Price Range", "1,500 - 2,200 RWF")),
                    Container(width: 1, height: 40, color: Colors.grey.shade300),
                    Expanded(child: _buildReadOnlyColumn("Market Expiry", "Jun '24 - Dec '25")),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // --- Pharmacy Listings (Collapsible) ---
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade200),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Theme(
                  data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                  child: ExpansionTile(
                    title: Row(
                      children: [
                        Icon(Icons.map_outlined, color: _primaryGreen),
                        const SizedBox(width: 12),
                        const Text("Nearby Pharmacy Stock", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                      ],
                    ),
                    children: [
                       ListView.separated(
                        physics: const NeverScrollableScrollPhysics(),
                        shrinkWrap: true,
                        padding: const EdgeInsets.all(0),
                        separatorBuilder: (ctx, i) => Divider(height: 1, color: Colors.grey.shade100),
                        itemCount: _pharmacyStockList.length,
                        itemBuilder: (context, index) {
                          final pharmacy = _pharmacyStockList[index];
                          return ListTile(
                            title: Text(pharmacy['name'], style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                            subtitle: Text(pharmacy['location'], style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text("${pharmacy['price']} RWF", style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                Text(pharmacy['status'], style: TextStyle(fontSize: 10, color: pharmacy['status'] == 'Available' ? Colors.green : Colors.red)),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 32),

              // --- Categorization ---
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Taxonomy & Settings", style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black87, fontSize: 16)),
                    const SizedBox(height: 16),
                    
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

                    // DROPDOWN for Adding Category
                    DropdownButtonFormField<String>(
                      key: UniqueKey(), // Force rebuild to reset internal state
                      value: null, 
                      decoration: InputDecoration(
                        hintText: "Add a category...",
                        prefixIcon: const Icon(Icons.search, color: Colors.grey),
                        contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: BorderSide(color: Colors.grey.shade400)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: BorderSide(color: _primaryGreen, width: 2)),
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
                    
                    const SizedBox(height: 24),
                    
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text("Prescription Required", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      value: _requiresPrescription,
                      onChanged: (val) => setState(() => _requiresPrescription = val),
                      activeColor: _primaryGreen,
                    ),
                  ],
                ),
              ),


              const SizedBox(height: 32),

              // --- Documentation & Details ---
              const Text("Documentation", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black87)),
              const SizedBox(height: 12),
              
              _buildModernInput(_shortDescriptionController, "Short Description", icon: Icons.description_outlined),
              const SizedBox(height: 12),
              _buildModernInput(_dosageSummaryController, "Dosage Summary", icon: Icons.medication_liquid_outlined),
              const SizedBox(height: 24),
              
              // Modern Tabs
              Container(
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    _buildModernTab("Overview", 0),
                    _buildModernTab("Dosage", 1),
                    _buildModernTab("Safety", 2),
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
                    // Structured Dosage (Only on Dosage Tab)
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
              
              const SizedBox(height: 50), // Bottom Safe Area
            ],
          ),
        ),
      ),
    );
  }

  // --- UI Builders ---

  Widget _buildCleanInput({required TextEditingController controller, required String label, double fontSize = 14, FontWeight fontWeight = FontWeight.normal, Color? color}) {
    return TextFormField(
      controller: controller,
      style: TextStyle(fontSize: fontSize, fontWeight: fontWeight, color: Colors.black87),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.grey.shade500, fontSize: 13),
        border: InputBorder.none,
        contentPadding: EdgeInsets.zero,
        isDense: true,
      ),
    );
  }

  Widget _buildModernInput(TextEditingController controller, String label, {IconData? icon}) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.grey.shade600),
        prefixIcon: icon != null ? Icon(icon, color: Colors.grey.shade400, size: 20) : null,
        filled: true,
        fillColor: Colors.grey.shade50,
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: _primaryGreen, width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      ),
    );
  }

  Widget _buildTimeInput(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _primaryGreen)),
        const SizedBox(height: 4),
        Container(
          height: 40,
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
          child: TextField(
            controller: controller,
            style: const TextStyle(fontSize: 13),
            textAlign: TextAlign.center,
            decoration: const InputDecoration(
              hintText: "--",
              border: InputBorder.none,
              contentPadding: EdgeInsets.only(bottom: 10), // Center text vertically
            ),
          ),
        )
      ],
    );
  }

  Widget _buildInfoCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [BoxShadow(color: Colors.grey.shade100, blurRadius: 4, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 8),
          Text(title, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87), overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
  
  Widget _buildReadOnlyColumn(String label, String value) {
     return Padding(
       padding: const EdgeInsets.symmetric(horizontal: 12),
       child: Column(
         crossAxisAlignment: CrossAxisAlignment.start,
         children: [
           Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            const SizedBox(height: 4),
           Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black87)),
         ],
       ),
     );
  }

  Widget _buildModernTab(String label, int index) {
    bool isSelected = _selectedDetailsTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedDetailsTab = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : [],
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? _textDark : Colors.grey.shade600,
            ),
          ),
        ),
      ),
    );
  }

  // Helper method removed as QuillEditor is used directly
  // Widget _buildEditorField(...)

}
