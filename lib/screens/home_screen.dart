import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart'; // Import for UserScrollNotification
import 'package:farumasi_app/screens/health_tips_screen.dart';
import 'package:farumasi_app/screens/medicine_store_screen.dart';
import 'package:farumasi_app/screens/cart_screen.dart';
import 'package:farumasi_app/screens/orders_screen.dart';
import 'package:farumasi_app/screens/auth_screen.dart';
import 'package:farumasi_app/screens/prescription_upload_screen.dart';
import 'package:farumasi_app/services/state_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  late final AnimationController _hideBottomBarController;
  bool _isBottomBarVisible = true;

  final List<Widget> _pages = [
    MedicineStoreScreen(),
    HealthTipsScreen(),
    CartScreen(),
    OrdersScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _hideBottomBarController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
      value: 1.0, // Fully visible initially
    );

    // Delay location check slightly to ensure UI is ready
    Future.delayed(Duration.zero, () {
      _autoPickLocation();
    });
  }

  @override
  void dispose() {
    _hideBottomBarController.dispose();
    super.dispose();
  }

  Future<void> _autoPickLocation() async {
    // Attempt to fetch real GPS location
    try {
      if (mounted) {
         // Show a subtle snackbar or indicator if needed, 
         // but for auto-pick we usually do it silently unless it fails.
      }
      await StateService().fetchRealLocation();
      debugPrint("Location fetched successfully: ${StateService().userCoordinates}");
    } catch (e) {
      debugPrint("Location error: $e");
      // Fallback/Demo default if permission denied or error
      if (mounted) {
         // Handle specific error cases with better UI feedback
         String errorMessage = "GPS access failed. Using default location.";
         
         if (e.toString().contains('Location services are disabled')) {
            errorMessage = "Please enable GPS/Location services on your device.";
         } else if (e.toString().contains('denied')) {
            errorMessage = "Location permission is required to detect your address.";
         }

         ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(
             content: Text(errorMessage),
             duration: const Duration(seconds: 5),
             action: SnackBarAction(
               label: 'Settings', 
               onPressed: () async {
                 // Open relevant settings
                 if (e.toString().contains('Location services are disabled')) {
                   await StateService().openLocationSettings();
                 } else {
                   await StateService().openAppSettings();
                 }
               }
             ),
           ),
         );
         StateService().setLocation("Kigali, Rwanda (Default)", "-1.9706, 30.1044");
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // App bar removed to allow screens to control their own headers
      // Wrap body in NotificationListener to detect scrolling
      body: NotificationListener<UserScrollNotification>(
        onNotification: (notification) {
          if (notification.direction == ScrollDirection.reverse) {
            // User is scrolling down (content moving up) -> Hide BAR
            if (_isBottomBarVisible) {
              _hideBottomBarController.reverse();
              _isBottomBarVisible = false;
            }
          } else if (notification.direction == ScrollDirection.forward) {
            // User is scrolling up (content moving down) -> Show BAR
            if (!_isBottomBarVisible) {
              _hideBottomBarController.forward();
              _isBottomBarVisible = true;
            }
          }
          return true; // Allow bubble up? Actually we can return true to maybe stop bubbling or false. Usually false.
          // But here, returning true might stop refresher. Let's return false to be safe.
        },
        child: _pages[_currentIndex],
      ),
      floatingActionButton: ListenableBuilder(
        listenable: StateService(),
        builder: (context, _) {
          final isLoggedIn = StateService().isLoggedIn;
          return ScaleTransition(
            scale: _hideBottomBarController,
            child: SizedBox(
              height: 70,
              width: 70,
              child: FloatingActionButton(
                backgroundColor: isLoggedIn ? Colors.white : Colors.grey[300],
                elevation: 4,
                shape: CircleBorder(), // Ensure it's circular
                onPressed: () {
                  if (!isLoggedIn) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("Please log in to upload a prescription."),
                        action: SnackBarAction(
                          label: "Login",
                          onPressed: () {
                            // Navigate to login/auth screen
                            // Usually we might have a dedicated route or method
                            // For now basic prompt reference
                             Navigator.pushNamed(context, '/auth'); // Or direct builder if named routes not set up, but let's stick to what we know works elsewhere or just prompt.
                             // Actually, let's look at how we handled login navigation before.
                             // Often just a message is enough for "muted". Or navigate to AuthScreen.
                             Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
                          },
                        ),
                      ),
                    );
                    return;
                  }
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => PrescriptionUploadScreen(),
                    ),
                  );
                },
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.document_scanner_outlined,
                      color: isLoggedIn ? Colors.green : Colors.grey,
                      size: 28,
                    ),
                    Text(
                      "Upload Rx",
                      style: TextStyle(
                        color: isLoggedIn ? Colors.green : Colors.grey,
                        fontWeight: FontWeight.bold,
                        fontSize: 8,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: SizeTransition(
        sizeFactor: _hideBottomBarController,
        axisAlignment: -1.0,
        child: ListenableBuilder(
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
          },
        ),
      ),
    );
  }

  Widget _buildNavItem(
    IconData icon,
    String label,
    int index, {
    bool isCart = false,
  }) {
    final isLoggedIn = StateService().isLoggedIn;
    // Index 3 is Orders
    final isRestricted = (index == 3) && !isLoggedIn;

    final isSelected = _currentIndex == index;
    // If restricted, show as semi-transparent/greyed out
    final color = isRestricted
        ? Colors.green.shade800 // Darker/muted on green background specific for disabled
        : (isSelected ? Colors.white : Colors.green.shade100);

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
        if (isRestricted) {
           ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(
               content: Text("Please log in to view your orders."),
               action: SnackBarAction(
                 label: "Login",
                 onPressed: () {
                   Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
                 },
               ),
             ),
           );
           return;
        }
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
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
