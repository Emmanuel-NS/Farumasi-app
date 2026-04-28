import re

file_path = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Extract the _buildInventoryTab body
start_idx = text.find('  // --- TAB 3: INVENTORY ---')
end_idx = text.find('  void _showAllSessions(BuildContext context) {')

if start_idx == -1 or end_idx == -1:
    print("Could not find boundaries")
    exit(1)

old_inventory_tab = text[start_idx:end_idx]

new_inventory_tab = '''  // --- TAB 3: INVENTORY ---
  Widget _buildInventoryTab() {
    final filteredList = _inventoryList.where((m) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return m.name.toLowerCase().contains(q) ||
          m.manufacturer.toLowerCase().contains(q) ||
          (m.category != null && m.category.toLowerCase().contains(q));
    }).toList();

    final Map<String, List<Medicine>> groupedInventory = {};
    for (var med in filteredList) {
      final category = (med.category != null && med.category.isNotEmpty) 
          ? med.category 
          : 'Uncategorized';
      groupedInventory.putIfAbsent(category, () => []).add(med);
    }
    
    final sortedCategories = groupedInventory.keys.toList()..sort();

    return Column(
      children: [
        // Filter Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: Container(
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.search, size: 20),
                      hintText: "Search stock...",
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.only(top: 8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _primaryGreen.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.filter_list, color: _primaryGreen),
              ),
            ],
          ),
        ),
        Expanded(
          child: filteredList.isEmpty
              ? Center(
                  child: Text(
                    "No items found",
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(24),
                  itemCount: sortedCategories.length,
                  itemBuilder: (context, catIndex) {
                    final category = sortedCategories[catIndex];
                    final meds = groupedInventory[category]!;

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: EdgeInsets.only(
                            bottom: 16,
                            top: catIndex == 0 ? 0 : 32,
                          ),
                          child: Text(
                            category,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate:
                              SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount:
                                MediaQuery.of(context).size.width > 900 ? 3 : 1,
                            mainAxisExtent: 140, // Reduced from list item height
                            crossAxisSpacing: 24,
                            mainAxisSpacing: 16,
                          ),
                          itemCount: meds.length,
                          itemBuilder: (context, index) {
                            final med = meds[index];
                            final bool isPublished =
                                !_unpublishedIds.contains(med.id);
                            final bool isLowStock = index % 3 == 0; // Fake logic

                            return _buildInventoryCard(med, isPublished, isLowStock);
                          },
                        ),
                      ],
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildInventoryCard(Medicine med, bool isPublished, bool isLowStock) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Opacity(
        opacity: isPublished ? 1.0 : 0.5,
        child: Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () async {
                  final result = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => InventoryEditScreen(medicine: med),
                    ),
                  );
                  if (result != null && result is Medicine) {
                    setState(() {
                      final index = _inventoryList.indexWhere(
                        (m) => m.id == result.id,
                      );
                      if (index != -1) {
                        _inventoryList[index] = result;
                      }
                    });
                  }
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          color: Colors.grey.shade100,
                          image: DecorationImage(
                            image: NetworkImage(med.imageUrl),
                            fit: BoxFit.cover,
                            colorFilter: !isPublished
                                ? const ColorFilter.mode(
                                    Colors.grey,
                                    BlendMode.saturation,
                                  )
                                : null,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              med.name,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                decoration: !isPublished
                                    ? TextDecoration.lineThrough
                                    : null,
                              ),
                            ),
                            Text(
                              med.manufacturer,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                            if (!isPublished)
                              Container(
                                margin: const EdgeInsets.only(top: 4),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade300,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  "UNPUBLISHED",
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black54,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            "RWF ${med.price.toInt()}",
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: isLowStock
                                  ? Colors.orange.withOpacity(0.1)
                                  : const Color(0xFF1E9E68).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              isLowStock ? "Low Stock" : "In Stock",
                              style: TextStyle(
                                fontSize: 10,
                                color: isLowStock
                                    ? Colors.orange
                                    : const Color(0xFF1E9E68),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 4),
            PopupMenuButton<String>(
              icon: Icon(Icons.more_vert, size: 22, color: Colors.grey.shade700),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              onSelected: (value) async {
                if (value == 'edit') {
                  final result = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => InventoryEditScreen(medicine: med),
                    ),
                  );
                  if (result != null && result is Medicine) {
                    setState(() {
                      final index = _inventoryList.indexWhere(
                        (m) => m.id == result.id,
                      );
                      if (index != -1) {
                        _inventoryList[index] = result;
                      }
                    });
                  }
                } else if (value == 'delete') {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text("Delete Product"),
                      content: Text(
                        "Are you sure you want to delete '${med.name}'?",
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text("Cancel", style: TextStyle(color: Colors.grey)),
                        ),
                        TextButton(
                          onPressed: () {
                            setState(() {
                              _inventoryList.removeWhere((m) => m.id == med.id);
                            });
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text("${med.name} deleted"),
                                backgroundColor: Colors.red,
                              ),
                            );
                          },
                          child: const Text(
                            "Delete",
                            style: TextStyle(
                              color: Colors.red,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                } else if (value == 'publish') {
                  setState(() {
                    if (isPublished) {
                      _unpublishedIds.add(med.id);
                    } else {
                      _unpublishedIds.remove(med.id);
                    }
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        isPublished
                            ? "${med.name} unpublished"
                            : "${med.name} published",
                      ),
                      backgroundColor: isPublished ? Colors.grey : _primaryGreen,
                      duration: const Duration(milliseconds: 1500),
                    ),
                  );
                }
              },
              itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                const PopupMenuItem<String>(
                  value: 'edit',
                  child: Row(
                    children: [
                      Icon(Icons.edit, size: 18),
                      SizedBox(width: 8),
                      Text('Edit'),
                    ],
                  ),
                ),
                PopupMenuItem<String>(
                  value: 'publish',
                  child: Row(
                    children: [
                      Icon(
                        isPublished ? Icons.visibility_off : Icons.visibility,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(isPublished ? 'Unpublish' : 'Publish'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                const PopupMenuItem<String>(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline, size: 18, color: Colors.red),
                      SizedBox(width: 8),
                      Text('Delete', style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

'''

text = text[:start_idx] + new_inventory_tab + text[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("success")
