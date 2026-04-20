import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('  Widget _buildOverviewTab() {')
end = text.find('  Widget _buildRequestsTab() {')

if start != -1 and end != -1:
    old_overview = text[start:end]
    new_overview = '''  Widget _buildOverviewTab() {
    return LayoutBuilder(
      builder: (context, constraints) {
        bool isWebMode = constraints.maxWidth >= 600;
        return SingleChildScrollView(
          padding: EdgeInsets.symmetric(horizontal: isWebMode ? 32 : 24, vertical: isWebMode ? 32 : 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search Bar
              Container(
                margin: EdgeInsets.only(bottom: 24),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.shade100,
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Icon(Icons.search, color: _primaryGreen),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        onChanged: (val) {
                          setState(() {
                            _searchQuery = val;
                          });
                        },
                        decoration: const InputDecoration(
                          hintText: "Search orders, medicines...",
                          border: InputBorder.none,
                          hintStyle: TextStyle(color: Colors.grey),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Overview Stats
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: isWebMode ? 4 : 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: isWebMode ? 1.5 : 0.95,
                children: [
                  _buildStatCard("Pending Prescriptions", "12", Icons.receipt_long, _primaryGreen, true),
                  _buildStatCard("Active Deliveries", "5", Icons.local_shipping_outlined, _accentOrange, false),
                  _buildStatCard("New Messages", "3", Icons.chat_bubble_outline, Colors.blue, false),
                  _buildStatCard("Low Stock Items", "8", Icons.warning_amber_rounded, Colors.red, false),
                ],
              ),
              const SizedBox(height: 32),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("Recent Activity", style: TextStyle(fontSize: isWebMode ? 20 : 18, fontWeight: FontWeight.bold, color: _primaryGreen)),
                  TextButton(
                    onPressed: () {},
                    child: Text("View All", style: TextStyle(color: _primaryGreen)),
                  )
                ],
              ),
              const SizedBox(height: 16),
              
              _buildActivityItem("New prescription received", "Order #1042 - Patient: John Doe", "2 mins ago"),
              _buildActivityItem("Delivery dispatched", "Driver: Sarah picked up Order #1040", "15 mins ago"),
              _buildActivityItem("Stock alert", "Paracetamol running low", "1 hour ago"),
              
              const SizedBox(height: 80), // Padding for scroll
            ],
          ),
        );
      }
    );
  }

'''
    with open(file, 'w', encoding='utf-8') as f:
        f.write(text[:start] + new_overview + text[end:])
    print("Replaced overview!")
else:
    print("Could not find overview.", start, end)

