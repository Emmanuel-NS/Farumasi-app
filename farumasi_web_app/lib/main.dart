import 'package:flutter/material.dart';

void main() {
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Farumasi Web',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0B8F6A)),
        scaffoldBackgroundColor: const Color(0xFFF3F6F8),
        useMaterial3: true,
      ),
      home: const ResponsiveHomePage(),
    );
  }
}

class ResponsiveHomePage extends StatefulWidget {
  const ResponsiveHomePage({super.key});

  @override
  State<ResponsiveHomePage> createState() => _ResponsiveHomePageState();
}

class _ResponsiveHomePageState extends State<ResponsiveHomePage> {
  int selectedIndex = 0;

  final List<_MedicineItem> medicines = const [
    _MedicineItem('Amoxicillin 500mg', 'Antibiotic', 4.8, 7.50, Icons.medication),
    _MedicineItem('Paracetamol 500mg', 'Pain Relief', 4.7, 3.10, Icons.healing),
    _MedicineItem('Vitamin C 1000mg', 'Supplement', 4.5, 5.40, Icons.local_hospital),
    _MedicineItem('Omeprazole 20mg', 'Digestive Care', 4.6, 6.25, Icons.favorite),
    _MedicineItem('Ibuprofen 400mg', 'Pain Relief', 4.4, 4.85, Icons.monitor_heart),
    _MedicineItem('Allergy Relief', 'Allergy', 4.3, 8.00, Icons.coronavirus),
    _MedicineItem('Cough Syrup', 'Respiratory', 4.2, 9.20, Icons.vaccines),
    _MedicineItem('ORS Sachets', 'Hydration', 4.6, 2.70, Icons.water_drop),
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        if (width >= 1100) {
          return _buildDesktopLayout(context);
        }
        if (width >= 720) {
          return _buildTabletLayout(context);
        }
        return _buildMobileLayout(context);
      },
    );
  }

  Widget _buildDesktopLayout(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: selectedIndex,
            onDestinationSelected: (index) => setState(() => selectedIndex = index),
            extended: true,
            backgroundColor: Colors.white,
            labelType: NavigationRailLabelType.none,
            destinations: const [
              NavigationRailDestination(
                icon: Icon(Icons.dashboard_outlined),
                selectedIcon: Icon(Icons.dashboard),
                label: Text('Overview'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.shopping_bag_outlined),
                selectedIcon: Icon(Icons.shopping_bag),
                label: Text('Store'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.receipt_long_outlined),
                selectedIcon: Icon(Icons.receipt_long),
                label: Text('Orders'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: Text('Profile'),
              ),
            ],
          ),
          const VerticalDivider(width: 1),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  _topBar(),
                  const SizedBox(height: 18),
                  Expanded(
                    child: Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: _storePanel(crossAxisCount: 4),
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          flex: 1,
                          child: _sideSummaryCard(),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabletLayout(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Farumasi'),
        backgroundColor: Colors.white,
      ),
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: selectedIndex,
            onDestinationSelected: (index) => setState(() => selectedIndex = index),
            backgroundColor: Colors.white,
            destinations: const [
              NavigationRailDestination(icon: Icon(Icons.home_outlined), label: Text('Home')),
              NavigationRailDestination(icon: Icon(Icons.shopping_bag_outlined), label: Text('Store')),
              NavigationRailDestination(icon: Icon(Icons.receipt_long_outlined), label: Text('Orders')),
            ],
          ),
          const VerticalDivider(width: 1),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _storePanel(crossAxisCount: 3),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileLayout(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Farumasi'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: Icon(Icons.notifications_none),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            _searchBox(),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.separated(
                itemCount: medicines.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = medicines[index];
                  return _mobileMedicineCard(item: item);
                },
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) => setState(() => selectedIndex = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.shopping_bag_outlined), label: 'Store'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), label: 'Orders'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _topBar() {
    return Row(
      children: [
        const Text(
          'Patient Dashboard',
          style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700),
        ),
        const Spacer(),
        SizedBox(width: 280, child: _searchBox()),
        const SizedBox(width: 12),
        const CircleAvatar(child: Icon(Icons.person)),
      ],
    );
  }

  Widget _searchBox() {
    return TextField(
      decoration: InputDecoration(
        hintText: 'Search medicines, pharmacy, symptom...',
        prefixIcon: const Icon(Icons.search),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderSide: BorderSide.none,
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    );
  }

  Widget _storePanel({required int crossAxisCount}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: const [
            Chip(label: Text('All')),
            Chip(label: Text('Pain Relief')),
            Chip(label: Text('Supplements')),
            Chip(label: Text('Digestive Care')),
            Chip(label: Text('Allergy')),
          ],
        ),
        const SizedBox(height: 16),
        Expanded(
          child: GridView.builder(
            itemCount: medicines.length,
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.92,
            ),
            itemBuilder: (context, index) => _desktopMedicineCard(item: medicines[index]),
          ),
        ),
      ],
    );
  }

  Widget _desktopMedicineCard({required _MedicineItem item}) {
    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE5E9ED)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 82,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: const Color(0xFFEFF8F5),
              ),
              child: Icon(item.icon, size: 34, color: const Color(0xFF0B8F6A)),
            ),
            const SizedBox(height: 10),
            Text(item.name, maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 3),
            Text(item.category, style: const TextStyle(color: Colors.black54, fontSize: 12)),
            const Spacer(),
            Row(
              children: [
                Text('\$${item.price.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                const Spacer(),
                Icon(Icons.star, size: 16, color: Colors.amber.shade700),
                const SizedBox(width: 2),
                Text(item.rating.toString()),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {},
                child: const Text('Add to cart'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _mobileMedicineCard({required _MedicineItem item}) {
    return Card(
      color: Colors.white,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFEFF8F5),
          child: Icon(item.icon, color: const Color(0xFF0B8F6A)),
        ),
        title: Text(item.name),
        subtitle: Text('${item.category} • ${item.rating}★'),
        trailing: Text('\$${item.price.toStringAsFixed(2)}'),
      ),
    );
  }

  Widget _sideSummaryCard() {
    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE5E9ED)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Today', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 16),
            _metricTile('Pending Orders', '12', Icons.pending_actions),
            _metricTile('Delivered', '31', Icons.check_circle_outline),
            _metricTile('Consultations', '7', Icons.chat_bubble_outline),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.file_download_outlined),
                label: const Text('Export report'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _metricTile(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFB),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: const Color(0xFF0B8F6A)),
            const SizedBox(width: 8),
            Expanded(child: Text(label)),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

class _MedicineItem {
  final String name;
  final String category;
  final double rating;
  final double price;
  final IconData icon;

  const _MedicineItem(this.name, this.category, this.rating, this.price, this.icon);
}
