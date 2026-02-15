import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_cancellable_tile_provider/flutter_map_cancellable_tile_provider.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:farumasi_app/screens/driver_profile_screen.dart';

class OrderTrackingScreen extends StatefulWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> with SingleTickerProviderStateMixin {
  // Simulated coordinates for Kigali, Rwanda
  // Start: Kigali City Center (Pharmacy)
  final LatLng _pharmacyLocation = const LatLng(-1.9441, 30.0619);
  // End: Near Kigali Convention Centre / Kimihurura (User)
  final LatLng _userLocation = const LatLng(-1.9515, 30.0933);

  // Pharmacy Details
  final String _pharmacyName = "Kigali Main Pharmacy";

  // Simulated Route (Points to create corners/turns)
  late final List<LatLng> _routePoints;

  // Simulation for driver movement
  double _driverProgress = 0.0;
  final MapController _mapController = MapController();
  final TileProvider _tileProvider = CancellableNetworkTileProvider(); // Reuse to prevent reloading tiles on setState
  bool _isAutoCentering = true; // Auto-follow driver by default
  late final AnimationController _waveController;
  bool _isDriverSaved = false; // Add state to track if driver is saved

  @override
  void initState() {
    super.initState();
    // Define a route with "corners"
    _routePoints = [
      _pharmacyLocation,
      const LatLng(-1.9460, 30.0650), // Turn 1
      const LatLng(-1.9480, 30.0750), // Turn 2
      const LatLng(-1.9490, 30.0820), // Turn 3
      const LatLng(-1.9500, 30.0880), // Turn 4
      _userLocation,
    ];
    
    _waveController = AnimationController(
       vsync: this,
       duration: const Duration(seconds: 2),
    )..repeat();

    // Simulate live updates
    _simulateDriverMovement();
  }

  @override
  void dispose() {
    _waveController.dispose();
    super.dispose();
  }

  void _simulateDriverMovement() async {
    while (mounted && _driverProgress < 1.0) {
      await Future.delayed(const Duration(milliseconds: 100)); 
      if (mounted) {
        setState(() {
          _driverProgress += 0.005; // Smoother movement
        });
        
        // Auto-follow driver periodically if enabled
        if (_driverProgress > 0 && _isAutoCentering) {
           _mapController.move(_getCurrentDriverPos(), _mapController.camera.zoom);
        }
      }
    }
  }

  void _recenterMap() {
    setState(() => _isAutoCentering = true);
    _mapController.move(_getCurrentDriverPos(), 16.0); // Zoom in on driver
  }

  LatLng _getCurrentDriverPos() {
    // Interpolate along the multi-point route
    if (_driverProgress <= 0) return _routePoints.first;
    if (_driverProgress >= 1) return _routePoints.last;

    // Total segments
    int totalSegments = _routePoints.length - 1;
    // Which segment are we on?
    double segmentProgressRaw = _driverProgress * totalSegments;
    int currentSegmentIndex = segmentProgressRaw.floor();
    double currentSegmentProgress = segmentProgressRaw - currentSegmentIndex;

    LatLng start = _routePoints[currentSegmentIndex];
    LatLng end = _routePoints[currentSegmentIndex + 1];

    return LatLng(
      start.latitude + (end.latitude - start.latitude) * currentSegmentProgress,
      start.longitude +
          (end.longitude - start.longitude) * currentSegmentProgress,
    );
  }

  void _callDriver() async {
    final Uri launchUri = Uri(
      scheme: 'tel',
      path: '+250780000000',
    ); // Rwanda code
    if (await canLaunchUrl(launchUri)) {
      await launchUrl(launchUri);
    }
  }

  void _messageDriver() async {
    final Uri launchUri = Uri(
      scheme: 'sms',
      path: '+250780000000',
    );
    if (await canLaunchUrl(launchUri)) {
      await launchUrl(launchUri);
    }
  }

  void _openDriverProfile() async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => DriverProfileScreen(initialSavedState: _isDriverSaved),
      ),
    );

    if (result != null) {
      setState(() {
        _isDriverSaved = result;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentDriverPos = _getCurrentDriverPos();

    // Determine status color
    final isArrived = _driverProgress >= 1.0;
    final isNear = _driverProgress > 0.85; // Signal continues even when arrived
    Color statusColor = Colors.green;
    if (isArrived) {
      statusColor = Colors.blue;
    } else if (isNear) {
      statusColor = Colors.orange.shade800;
    }

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Container(
          margin: const EdgeInsets.all(8),
          decoration: const BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black),
            onPressed: () => Navigator.pop(context),
          ),
        ),
      ),
      body: Stack(
        children: [
          // Map Layer
          Container(
            color: Colors.grey.shade200, // Background color while loading (Google Maps style grey)
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCameraFit: CameraFit.bounds(
                  bounds: LatLngBounds.fromPoints([_pharmacyLocation, _userLocation]),
                  padding: const EdgeInsets.all(50), 
                ),
                onPositionChanged: (position, hasGesture) {
                  if (hasGesture) {
                    setState(() => _isAutoCentering = false);
                  }
                },
                interactionOptions: const InteractionOptions(
                  // CONTROLLED MOVEMENT:
                  // 1. disable (rotate) to keep map north-up like Google Maps default.
                  // 2. disable (flingAnimation) to stop the slippery "ice skating" feel. 
                  flags: InteractiveFlag.all & ~InteractiveFlag.rotate & ~InteractiveFlag.flingAnimation,
                ),
                minZoom: 13.0,
                maxZoom: 18.0,
                backgroundColor: Colors.grey.shade200, 
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.farumasi.app',
                  tileProvider: _tileProvider,
                ),
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _routePoints,
                      color: Colors.grey.withValues(alpha: 0.5),
                      strokeWidth: 5.0,
                    ),
                    Polyline(
                      points: _routePoints,
                      color: statusColor.withValues(alpha: 0.8),
                      strokeWidth: 5.0,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  // Pharmacy Marker
                  Marker(
                    point: _pharmacyLocation,
                    width: 48,
                    height: 48,
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: [BoxShadow(blurRadius: 4, color: Colors.black26)],
                          ),
                          child: const Icon(Icons.store, color: Colors.green, size: 20),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            "Pharmacy",
                            style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // User Marker
                  Marker(
                    point: _userLocation,
                    width: 40,
                    height: 40,
                    child: const Icon(Icons.location_on, color: Colors.red, size: 40),
                  ),
                  // Driver Marker (Simple - No Rotation)
                  Marker(
                    point: currentDriverPos,
                    width: 100, // Increased to accommodate wave
                    height: 100, // Increased to accommodate wave
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Wave animation when near or arrived
                        if (isNear)
                          AnimatedBuilder(
                            animation: _waveController,
                            builder: (context, child) {
                              return Container(
                                width: 50 + (50 * _waveController.value),
                                height: 50 + (50 * _waveController.value),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: (isArrived ? Colors.blue : Colors.red)
                                        .withValues(alpha: 1 - _waveController.value),
                                    width: 4,
                                  ),
                                ),
                              );
                            },
                          ),
                          // Driver Icon
                          GestureDetector(
                            onTap: _openDriverProfile,
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                border: Border.all(
                                    // Change border color based on status
                                    color: isNear ? Colors.red : (isArrived ? Colors.blue : Colors.green), 
                                    width: 2),
                                boxShadow: const [BoxShadow(blurRadius: 5, color: Colors.black26)],
                              ),
                              padding: const EdgeInsets.all(6),
                              child: Icon(Icons.two_wheeler, color: statusColor, size: 28),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Top Info Card
          if (!_isAutoCentering)
            Positioned(
              right: 20,
              bottom: 270,
              child: FloatingActionButton(
                backgroundColor: Colors.white,
                mini: true,
                onPressed: _recenterMap,
                child: const Icon(Icons.my_location, color: Colors.blue),
              ),
            ),

          Positioned(
            top: 100, 
            left: 20,
            right: 20,
            child: Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.store, color: Colors.green),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text("Picking up from", style: TextStyle(fontSize: 12, color: Colors.grey)),
                          Text(
                            _pharmacyName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          Positioned(
            bottom: 30,
            left: 20,
            right: 20,
            child: _buildTrackingInfoCard(),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackingInfoCard() {
    // Determine status based on progress
    final isArrived = _driverProgress >= 1.0;
    final isNear = _driverProgress > 0.85 && !isArrived;

    Color statusColor = Colors.green;
    String statusText = "Out for Delivery";
    Color statusBgColor = Colors.green.shade50;
    Color statusBorderColor = Colors.green.shade100;

    if (isArrived) {
      statusText = "Arrived";
      statusColor = Colors.blue;
      statusBgColor = Colors.blue.shade50;
      statusBorderColor = Colors.blue.shade100;
    } else if (isNear) {
      statusText = "Arriving Soon";
      statusColor = Colors.orange.shade800;
      statusBgColor = Colors.orange.shade50;
      statusBorderColor = Colors.orange.shade100;
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 10,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),

          // Status and Time
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Estimated Delivery",
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        Icons.access_time_filled,
                        size: 16,
                        color: statusColor,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        isArrived ? "Arrived" : "${(15 * (1 - _driverProgress)).ceil()} mins",
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                          color: isArrived ? Colors.blue : Colors.black,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: statusBgColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: statusBorderColor),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: 0.3 + (0.7 * _driverProgress),
              backgroundColor: Colors.grey.shade100,
              color: isArrived ? statusColor : Colors.green, // Keep green until fully arrived, or follow statusColor
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 8),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Confirmed",
                style: TextStyle(fontSize: 10, color: Colors.grey),
              ),
              Text(
                "In Transit",
                style: TextStyle(fontSize: 10, color: Colors.grey),
              ),
              Text(
                "Delivered",
                style: TextStyle(fontSize: 10, color: Colors.grey),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Driver Info
          InkWell(
            onTap: _openDriverProfile,
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 24,
                  backgroundColor: Colors.grey,
                  child: Icon(Icons.person, color: Colors.white),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "John Doe",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Row(
                      children: [
                        Icon(Icons.star, size: 14, color: Colors.amber.shade600),
                        const SizedBox(width: 4),
                        Text(
                          "4.8 (124 deliveries)",
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const Spacer(),
                IconButton(
                  onPressed: _callDriver,
                  icon: const Icon(Icons.phone),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.green.shade50,
                    foregroundColor: Colors.green,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _messageDriver,
                  icon: const Icon(Icons.message),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.blue.shade50,
                    foregroundColor: Colors.blue,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
