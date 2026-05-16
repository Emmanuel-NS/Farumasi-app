import re

with open('lib/screens/pharmacist/pharmacist_delivery_management_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

scaffold_code = """    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text(
          "Fleet & Deliveries",
          style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF1E9E68),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF1E9E68),
          isScrollable: true,
          tabs: const [
            Tab(text: "Active Orders"),
            Tab(text: "Order History"),
            Tab(text: "Riders & Fleet"),
          ],
        ),
      ),
      body: """

header_replacement = """    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Fleet & Deliveries", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 24)),
                      const SizedBox(height: 4),
                      Text("Manage active fulfillment and driver logistics", style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TabBar(
                controller: _tabController,
                labelColor: const Color(0xFF1E9E68),
                labelStyle: const TextStyle(fontWeight: FontWeight.bold),
                unselectedLabelColor: Colors.grey,
                indicatorColor: const Color(0xFF1E9E68),
                isScrollable: true,
                tabs: const [
                  Tab(text: "Active Orders"),
                  Tab(text: "Order History"),
                  Tab(text: "Riders & Fleet"),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: """

text = text.replace(scaffold_code, header_replacement)

# Simply replace the last closing bracket of Scaffold with the proper ones for Column > Expanded
# We just need to find the `Widget _buildActiveOrdersTab` and replace the tags right before it

end_search = """              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- TAB 1: ACTIVE ORDERS ---"""

end_replacement = """              ],
            ),
          ),
        ],
      ),
        ),
      ],
    );
  }

  // --- TAB 1: ACTIVE ORDERS ---"""

text = text.replace(end_search, end_replacement)

with open('lib/screens/pharmacist/pharmacist_delivery_management_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print('Safely patched fleet screen')
