#!/usr/bin/env python3
"""
Patch script to enhance product detail viewing with age range selector and marketing pharmacies list
"""

import re

file_path = r"c:\Users\PC\Farumasi-app\lib\screens\pharmacist\pharmacist_dashboard_screen.dart"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the onTap handler
old_ontap = r'''onTap: \(\) async \{\s*setState\(\(\) \{\s*_editingMedicine = med;\s*_isEditingInventoryItem = true;\s*\}\);\s*\},'''

new_ontap = '''onTap: () async {
            _showProductDetailsModal(context, med);
          },'''

content = re.sub(old_ontap, new_ontap, content, flags=re.MULTILINE | re.DOTALL)

# Add the new helper method before the last closing brace of the class
# Find the position to insert (before the final closing brace)
insert_position = content.rfind('}')

new_method = '''
  void _showProductDetailsModal(BuildContext context, Medicine medicine) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            String? selectedAgeRange;
            String? selectedDosage;

            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.8,
              minChildSize: 0.5,
              maxChildSize: 0.95,
              builder: (context, scrollController) {
                return SingleChildScrollView(
                  controller: scrollController,
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    medicine.name,
                                    style: const TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    medicine.manufacturer,
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close),
                              onPressed: () => Navigator.pop(context),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Age Range Selector
                        if (medicine.ageDosages.isNotEmpty)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Select Age Range',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: _primaryGreen,
                                ),
                              ),
                              const SizedBox(height: 12),
                              DropdownButtonFormField<String>(
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 12,
                                  ),
                                ),
                                hint: const Text('Choose age range...'),
                                value: selectedAgeRange,
                                items: medicine.ageDosages.map((ageDose) {
                                  final label = ageDose.ageRange.toString().split('.').last;
                                  return DropdownMenuItem<String>(
                                    value: label,
                                    child: Text(label),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  setModalState(() {
                                    selectedAgeRange = value;
                                    selectedDosage = medicine.ageDosages
                                        .firstWhere(
                                          (ad) =>
                                              ad.ageRange.toString().split('.').last ==
                                              value,
                                        )
                                        .dosageInstructions;
                                  });
                                },
                              ),
                              if (selectedDosage != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 12),
                                  child: Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: _primaryGreen.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: _primaryGreen.withOpacity(0.3),
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Dosage Instructions',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: _primaryGreen,
                                            fontSize: 12,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          selectedDosage!,
                                          style: const TextStyle(
                                            fontSize: 13,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              const SizedBox(height: 24),
                            ],
                          ),

                        // Marketing Pharmacies List
                        if (medicine.marketingPharmacies.isNotEmpty)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Available at Pharmacies',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: _primaryGreen,
                                ),
                              ),
                              const SizedBox(height: 12),
                              ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: medicine.marketingPharmacies.length,
                                itemBuilder: (context, index) {
                                  final pharmacy =
                                      medicine.marketingPharmacies[index];
                                  final statusColor =
                                      pharmacy.stockStatus ==
                                              StockStatus.available
                                          ? Colors.green
                                          : pharmacy.stockStatus ==
                                                  StockStatus.lowStock
                                              ? Colors.orange
                                              : Colors.red;
                                  final statusLabel = pharmacy.stockStatus
                                      .toString()
                                      .split('.')
                                      .last;

                                  return Card(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    child: Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  pharmacy.pharmacyName,
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 14,
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Row(
                                                  children: [
                                                    Container(
                                                      padding:
                                                          const EdgeInsets
                                                              .symmetric(
                                                        horizontal: 8,
                                                        vertical: 4,
                                                      ),
                                                      decoration: BoxDecoration(
                                                        color:
                                                            statusColor
                                                                .withOpacity(
                                                                  0.2,
                                                                ),
                                                        borderRadius:
                                                            BorderRadius
                                                                .circular(6),
                                                      ),
                                                      child: Text(
                                                        statusLabel,
                                                        style: TextStyle(
                                                          fontSize: 12,
                                                          color: statusColor,
                                                          fontWeight:
                                                              FontWeight.bold,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                          Text(
                                            'RWF ${pharmacy.price.toStringAsFixed(0)}',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16,
                                              color: _primaryGreen,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 24),
                            ],
                          ),

                        // Edit Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _primaryGreen,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: () {
                              Navigator.pop(context);
                              setState(() {
                                _editingMedicine = medicine;
                                _isEditingInventoryItem = true;
                              });
                            },
                            child: const Text(
                              'Edit Product',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

'''

content = content[:insert_position] + new_method + content[insert_position:]

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Patched successfully!")
print("- Added _showProductDetailsModal() method")
print("- Updated onTap handler to show product details modal")
print("- Features:")
print("  • Age range dropdown with dosage display")
print("  • Marketing pharmacies list with stock status and pricing")
print("  • Edit button to proceed to full editing")
