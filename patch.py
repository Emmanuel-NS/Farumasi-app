#!/usr/bin/env python3
import re

# Read the file
with open(r'c:\Users\PC\Farumasi-app\lib\screens\pharmacist\inventory_edit_screen.dart', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables for age dosages after the UI State section
state_vars_addition = """  // UI State
  int _selectedDetailsTab = 0; // 0: Description, 1: Side Effects, 2: Dosage

  // Age Dosages
  List<AgeDosage> _ageDosages = [];
  AgeRange? _tempSelectedAgeRange;
  late TextEditingController _tempAgeDosageController;"""

content = content.replace(
    """  // UI State
  int _selectedDetailsTab = 0; // 0: Description, 1: Side Effects, 2: Dosage

  @override""",
    """  // UI State
  int _selectedDetailsTab = 0; // 0: Description, 1: Side Effects, 2: Dosage

  // Age Dosages
  List<AgeDosage> _ageDosages = [];
  AgeRange? _tempSelectedAgeRange;
  late TextEditingController _tempAgeDosageController;

  @override"""
)

# 2. Initialize age dosages in initState
init_age_dosages = """    // Booleans
    _requiresPrescription = m?.requiresPrescription ?? false;
  }"""

new_init_age_dosages = """    // Booleans
    _requiresPrescription = m?.requiresPrescription ?? false;

    // Age Dosages
    _tempAgeDosageController = TextEditingController();
    if (m != null) {
      _ageDosages = List.from(m.ageDosages);
    }
  }"""

content = content.replace(init_age_dosages, new_init_age_dosages)

# 3. Dispose of the temp controller
dispose_addition = """    _doseEveningController.dispose();
    _doseIntervalController.dispose();
    super.dispose();"""

dispose_new = """    _doseEveningController.dispose();
    _doseIntervalController.dispose();
    _tempAgeDosageController.dispose();
    super.dispose();"""

content = content.replace(dispose_addition, dispose_new)

# 4. Update _saveChanges to include ageDosages
save_changes_old = """        doseMorning: _doseMorningController.text,
        doseAfternoon: _doseAfternoonController.text,
        doseEvening: _doseEveningController.text,
        doseTimeInterval: _doseIntervalController.text,
      );"""

save_changes_new = """        doseMorning: _doseMorningController.text,
        doseAfternoon: _doseAfternoonController.text,
        doseEvening: _doseEveningController.text,
        doseTimeInterval: _doseIntervalController.text,
        ageDosages: _ageDosages,
      );"""

content = content.replace(save_changes_old, save_changes_new)

# 5. Add the _buildAgeDosagesSection method before the build method
build_method_start = "  @override\n  Widget build(BuildContext context) {"
new_method = """  Widget _buildAgeDosagesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Age Dosages",
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: Colors.black87,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 12),
        // Add new age dosage
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _lightGreen,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Add New Age Dosage",
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<AgeRange>(
                decoration: InputDecoration(
                  labelText: "Select Age Range",
                  labelStyle: TextStyle(color: Colors.grey.shade600),
                  filled: true,
                  fillColor: Colors.white,
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: _primaryGreen, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    vertical: 12,
                    horizontal: 12,
                  ),
                ),
                value: _tempSelectedAgeRange,
                items: AgeRange.values
                    .map((ageRange) => DropdownMenuItem(
                          value: ageRange,
                          child: Text(_formatAgeRange(ageRange)),
                        ))
                    .toList(),
                onChanged: (value) {
                  setState(() {
                    _tempSelectedAgeRange = value;
                  });
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _tempAgeDosageController,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: "Dosage Instructions",
                  labelStyle: TextStyle(color: Colors.grey.shade600),
                  hintText: "e.g., 5-10ml twice daily",
                  filled: true,
                  fillColor: Colors.white,
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: _primaryGreen, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    vertical: 12,
                    horizontal: 12,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: _addAgeDosage,
                icon: const Icon(Icons.add),
                label: const Text("Add Age Dosage"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primaryGreen,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(
                    vertical: 12,
                    horizontal: 16,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // List of added age dosages
        if (_ageDosages.isNotEmpty) ...[
          const Text(
            "Added Dosages",
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _ageDosages.length,
            itemBuilder: (context, index) {
              final dosage = _ageDosages[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _formatAgeRange(dosage.ageRange),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            dosage.dosageInstructions,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () {
                        setState(() {
                          _ageDosages.removeAt(index);
                        });
                      },
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ],
    );
  }

  void _addAgeDosage() {
    if (_tempSelectedAgeRange == null || _tempAgeDosageController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select an age range and enter instructions'),
        ),
      );
      return;
    }

    // Check if age range already exists
    if (_ageDosages.any((d) => d.ageRange == _tempSelectedAgeRange)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This age range already has dosage instructions'),
        ),
      );
      return;
    }

    setState(() {
      _ageDosages.add(
        AgeDosage(
          ageRange: _tempSelectedAgeRange!,
          dosageInstructions: _tempAgeDosageController.text,
        ),
      );
      _tempSelectedAgeRange = null;
      _tempAgeDosageController.clear();
    });
  }

  String _formatAgeRange(AgeRange ageRange) {
    switch (ageRange) {
      case AgeRange.infantToddler:
        return "Infant to Toddler";
      case AgeRange.toddler:
        return "Toddler";
      case AgeRange.child:
        return "Child";
      case AgeRange.adolescent:
        return "Adolescent";
      case AgeRange.adult:
        return "Adult";
    }
  }

  @override"""

content = content.replace(
    "  @override\n  Widget build(BuildContext context) {",
    new_method + "\n  @override\n  Widget build(BuildContext context) {"
)

# 6. Add age dosages section after the "Pricing & Requirements" section
add_section_old = """                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        "Prescription Required",
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      value: _requiresPrescription,
                      onChanged: (val) =>
                          setState(() => _requiresPrescription = val),
                      activeThumbColor: _primaryGreen,
                    ),

                    const SizedBox(height: 32),

                    // Documentation & Details"""

add_section_new = """                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        "Prescription Required",
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      value: _requiresPrescription,
                      onChanged: (val) =>
                          setState(() => _requiresPrescription = val),
                      activeThumbColor: _primaryGreen,
                    ),

                    const SizedBox(height: 32),

                    // Age Dosages
                    _buildAgeDosagesSection(),

                    const SizedBox(height: 32),

                    // Documentation & Details"""

content = content.replace(add_section_old, add_section_new)

# Write the modified content back
with open(r'c:\Users\PC\Farumasi-app\lib\screens\pharmacist\inventory_edit_screen.dart', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully patched inventory_edit_screen.dart with age dosage functionality!")
