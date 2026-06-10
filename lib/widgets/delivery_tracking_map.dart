import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_cancellable_tile_provider/flutter_map_cancellable_tile_provider.dart';
import 'package:latlong2/latlong.dart';

import 'portal/portal_ui.dart';

/// Live delivery map — pickup, destination, and interpolated rider position.
class DeliveryTrackingMap extends StatelessWidget {
  const DeliveryTrackingMap({
    super.key,
    required this.pharmacyName,
    required this.pickup,
    required this.destination,
    required this.progress,
    this.etaMinutes,
    this.height = 240,
  });

  final String pharmacyName;
  final LatLng pickup;
  final LatLng destination;
  final double progress;
  final int? etaMinutes;
  final double height;

  LatLng get _riderPos {
    final t = progress.clamp(0.0, 1.0);
    return LatLng(
      pickup.latitude + (destination.latitude - pickup.latitude) * t,
      pickup.longitude + (destination.longitude - pickup.longitude) * t,
    );
  }

  List<LatLng> get _routePoints {
    const midCount = 3;
    return List.generate(midCount + 2, (i) {
      final t = i / (midCount + 1);
      return LatLng(
        pickup.latitude + (destination.latitude - pickup.latitude) * t,
        pickup.longitude + (destination.longitude - pickup.longitude) * t,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final rider = _riderPos;
    final bounds = LatLngBounds.fromPoints([pickup, destination, rider]);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: PortalColors.greenBorder),
        boxShadow: [
          BoxShadow(
            color: PortalColors.green.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: PortalColors.green,
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'LIVE TRACKING',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                const Spacer(),
                if (etaMinutes != null)
                  Row(
                    children: [
                      const Icon(Icons.schedule, size: 14, color: Colors.white70),
                      const SizedBox(width: 4),
                      Text(
                        '$etaMinutes min',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          SizedBox(
            height: height,
            child: FlutterMap(
              options: MapOptions(
                initialCameraFit: CameraFit.bounds(
                  bounds: bounds,
                  padding: const EdgeInsets.all(48),
                ),
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.all &
                      ~InteractiveFlag.rotate &
                      ~InteractiveFlag.flingAnimation,
                ),
                minZoom: 12,
                maxZoom: 18,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.farumasi.app',
                  tileProvider: CancellableNetworkTileProvider(),
                ),
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _routePoints,
                      color: PortalColors.green,
                      strokeWidth: 4,
                    ),
                  ],
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: pickup,
                      width: 36,
                      height: 36,
                      child: _mapDot(color: const Color(0xFFF97316), icon: Icons.store),
                    ),
                    Marker(
                      point: destination,
                      width: 40,
                      height: 40,
                      child: const Icon(Icons.location_on, color: PortalColors.green, size: 36),
                    ),
                    Marker(
                      point: rider,
                      width: 40,
                      height: 40,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: PortalColors.green, width: 2.5),
                          boxShadow: [
                            BoxShadow(
                              color: PortalColors.green.withValues(alpha: 0.35),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.delivery_dining, color: PortalColors.green, size: 22),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            color: PortalColors.greenLight,
            child: Text(
              'Picking up from $pharmacyName',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: PortalColors.slate700,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _mapDot({required Color color, required IconData icon}) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: Icon(icon, color: Colors.white, size: 18),
    );
  }
}
