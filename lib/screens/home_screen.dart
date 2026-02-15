import 'package:flutter/material.dart';
import 'package:farumasi_app/screens/health_tips_screen.dart';
import 'package:farumasi_app/screens/medicine_store_screen.dart';
import 'package:farumasi_app/screens/cart_screen.dart';
import 'package:farumasi_app/screens/prescription_upload_screen.dart';
import 'package:farumasi_app/services/state_service.dart';

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
      floatingActionButton: SizedBox(
        height: 70,
        width: 70,
        child: FloatingActionButton(
          backgroundColor: Colors.white,
          elevation: 4,
          shape: CircleBorder(), // Ensure it's circular
          onPressed: () {
             Navigator.push(context, MaterialPageRoute(builder: (context) => PrescriptionUploadScreen()));
          },
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.document_scanner_outlined, color: Colors.green, size: 28),
              Text("Upload Rx", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 8)),
            ],
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: ListenableBuilder(
        listenable: StateService(),
        builder: (context, _) {
          return BottomAppBar(
            color: Colors.green,
            shape: const CircularNotchedRectangle(),
            notchMargin: 8.0,
            child: SizedBox(
              height: 60,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildNavItem(Icons.store, 'Home', 0),
                  _buildNavItem(Icons.health_and_safety, 'Health', 1),
                  const SizedBox(width: 48), // Gap for FAB
                  _buildNavItem(Icons.shopping_cart, 'Cart', 2, isCart: true),
                  _buildNavItem(Icons.history, 'Orders', 3),
                ],
              ),
            ),
          );
        }
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index, {bool isCart = false}) {
      final isSelected = _currentIndex == index;
      // Using green.shade100 for inactive items makes them look integrated but not 'disabled' like white60
      final color = isSelected ? Colors.white : Colors.green.shade100;
      
      Widget iconWidget = Icon(icon, color: color, size: 28);

      if (isCart) {
        final itemCount = StateService().cartItems.length;
        if (itemCount > 0) {
          iconWidget = Badge(
            label: Text(itemCount.toString()),
            backgroundColor: Colors.redAccent,
            textColor: Colors.white,
            padding: EdgeInsets.symmetric(horizontal: 6),
            child: iconWidget,
          );
        }
      }

      return InkWell(
        onTap: () {
            setState(() {
                _currentIndex = index;
            });
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              iconWidget,
              Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
            ],
          ),
        ),
      );
  }
}
