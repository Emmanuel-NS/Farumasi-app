import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

class OrderTrackingScreen extends StatefulWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
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
    // Simulate live updates
    _simulateDriverMovement();
  }

  void _simulateDriverMovement() async {
    while (mounted && _driverProgress < 1.0) {
      await Future.delayed(
        const Duration(milliseconds: 500),
      ); // Faster updates for smoother animation
      if (mounted) {
        setState(() {
          _driverProgress += 0.01;
        });
      }
    }
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

  @override
  Widget build(BuildContext context) {
    final currentDriverPos = _getCurrentDriverPos();

    return Scaffold(
      appBar: AppBar(
        title: Column(
          children: [
            const Text(
              "Track Order",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            Text(
              "#${widget.orderId}",
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            onPressed: _callDriver,
            icon: const Icon(Icons.phone, color: Colors.green),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Map Layer
          FlutterMap(
            options: MapOptions(
              initialCenter: const LatLng(
                -1.9480,
                30.0750,
              ), // Center between pharmacy and user in Kigali
              initialZoom: 15.0, // Closer zoom
            ),
            children: [
              TileLayer(
                // CartoDB Voyager is a clean "fixed and solid" looking map style
                urlTemplate:
                    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.farumasi.app',
              ),
              PolylineLayer(
                polylines: [
                  // Full theoretical path
                  Polyline(
                    points: _routePoints,
                    color: Colors.grey.withValues(alpha: 0.5),
                    strokeWidth: 4.0,
                    pattern:
                        StrokePattern.dotted(), // Dotted path for the whole route
                  ),
                  // Active path (Driver to User) - No, usually Driver to User is remaining logic
                  // But visually, showing the path TAKEN vs REMAINING is good.

                  // Let's show the full solid route for clarity of "Route being used"
                  Polyline(
                    points: _routePoints,
                    color: Colors.blue.withValues(alpha: 0.3),
                    strokeWidth: 6.0,
                  ),
                ],
              ),
              MarkerLayer(
                markers: [
                  // Pharmacy Marker (Start)
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
                            boxShadow: [
                              BoxShadow(blurRadius: 4, color: Colors.black26),
                            ],
                          ),
                          child: const Icon(
                            Icons.store,
                            color: Colors.green,
                            size: 20,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.green,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            "Pharmacy",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // User Marker (Destination)
                  Marker(
                    point: _userLocation,
                    width: 40,
                    height: 40,
                    child: const Icon(
                      Icons.location_on,
                      color: Colors.red,
                      size: 40,
                    ),
                  ),
                  // Driver Marker (Moving)
                  Marker(
                    point: currentDriverPos,
                    width: 48, // Slightly larger for bike icon visibility
                    height: 48,
                    child: Container(
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(blurRadius: 5, color: Colors.black26),
                        ],
                      ),
                      padding: const EdgeInsets.all(6),
                      child: const Icon(
                        Icons.motorcycle, // Changed to motorbike icon
                        color: Colors
                            .blue, // Changed color to distinguish from pharmacy
                        size: 28,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Bottom Info Card
          // We can show pharmacy info in the info card too
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
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
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          "Picking up from",
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        Text(
                          _pharmacyName,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _buildTrackingInfoCard(),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackingInfoCard() {
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
                      const Icon(
                        Icons.access_time_filled,
                        size: 16,
                        color: Colors.green,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        "${(15 * (1 - _driverProgress)).clamp(1, 15).toStringAsFixed(0)} mins",
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
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
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.shade100),
                ),
                child: const Text(
                  "Out for Delivery",
                  style: TextStyle(
                    color: Colors.green,
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
              color: Colors.green,
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
          Row(
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
                // Call button
                onPressed: _callDriver,
                icon: const Icon(Icons.phone),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.green.shade50,
                  foregroundColor: Colors.green,
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                // Message button
                onPressed: () {},
                icon: const Icon(Icons.message),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.blue.shade50,
                  foregroundColor: Colors.blue,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
