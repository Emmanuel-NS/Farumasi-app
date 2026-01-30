import 'package:flutter/material.dart';
import 'package:farumasi_app/screens/health_tips_screen.dart';
import 'package:farumasi_app/screens/medicine_store_screen.dart';
import 'package:farumasi_app/screens/cart_screen.dart';
import 'package:farumasi_app/screens/prescription_upload_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    MedicineStoreScreen(),
    HealthTipsScreen(),
    CartScreen(),
    Center(child: Text('Past Orders Catalog')), 
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // App bar removed to allow screens to control their own headers
      body: _pages[_currentIndex],
      floatingActionButton: FloatingActionButton(
        backgroundColor: Colors.white,
        onPressed: () {
           Navigator.push(context, MaterialPageRoute(builder: (context) => PrescriptionUploadScreen()));
        },
        child: Icon(Icons.upload_file, color: Colors.green),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        color: Colors.green,
        shape: CircularNotchedRectangle(),
        notchMargin: 8.0,
        child: SizedBox(
          height: 60,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(Icons.store, 'Store', 0),
              _buildNavItem(Icons.health_and_safety, 'Tips', 1),
              SizedBox(width: 48), // Gap for FAB
              _buildNavItem(Icons.shopping_cart, 'Cart', 2),
              _buildNavItem(Icons.history, 'Orders', 3),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
      final isSelected = _currentIndex == index;
      return InkWell(
        onTap: () {
            setState(() {
                _currentIndex = index;
            });
        },
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: isSelected ? Colors.white : Colors.white60),
            Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.white60, fontSize: 12)),
          ],
        ),
      );
  }
}
