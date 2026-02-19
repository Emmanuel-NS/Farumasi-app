import 'package:flutter/material.dart';
import '../models/models.dart';
import '../data/dummy_data.dart';
import '../widgets/medicine_item.dart';
import 'medicine_detail_screen.dart';
import '../services/state_service.dart';
import 'pharmacist_list_screen.dart';
import 'cart_screen.dart';
import 'prescription_upload_screen.dart';

class PharmacyDetailScreen extends StatefulWidget {
  final Pharmacy pharmacy;

  const PharmacyDetailScreen({super.key, required this.pharmacy});

  @override
  State<PharmacyDetailScreen> createState() => _PharmacyDetailScreenState();
}

class _PharmacyDetailScreenState extends State<PharmacyDetailScreen> {
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Widget _buildFloatingActions(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        FloatingActionButton(
          heroTag: 'upload_btn_pharmacy',
          backgroundColor: StateService().isLoggedIn ? Colors.blue : Colors.grey,
          onPressed: () {
            if (!StateService().isLoggedIn) {
               ScaffoldMessenger.of(context).showSnackBar(
                 const SnackBar(content: Text("Please login to upload a prescription.")),
               );
               return;
            }
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PrescriptionUploadScreen()),
           );
          },
          tooltip: 'Upload Prescription',
          child: const Icon(Icons.upload_file, color: Colors.white),
        ),
        const SizedBox(height: 12),
        Stack(
          alignment: Alignment.topRight,
          clipBehavior: Clip.none,
          children: [
            FloatingActionButton(
              heroTag: 'cart_main_btn_pharmacy',
              backgroundColor: Colors.green,
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CartScreen()),
                );
              },
              tooltip: 'View Cart',
              child: const Icon(Icons.shopping_cart, color: Colors.white),
            ),
            if (StateService().cartItems.isNotEmpty)
              Positioned(
                right: 0,
                top: 0,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 16,
                    minHeight: 16,
                  ),
                  child: Text(
                    '${StateService().cartItems.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    // Simulate pharmacy-specific stock
    // In a real app, we'd fetch medicines for this pharmacy ID.
    final allPharmacyMedicines = dummyMedicines; 

    // Filter medicines based on search query
    final filteredMedicines = allPharmacyMedicines.where((med) {
      final nameLower = med.name.toLowerCase();
      final queryLower = _searchQuery.toLowerCase();
      return nameLower.contains(queryLower);
    }).toList();

    return AnimatedBuilder(
      animation: StateService(),
      builder: (context, _) => Scaffold(
        floatingActionButton: _buildFloatingActions(context),
        body: CustomScrollView(
        slivers: [
          // Header with Image
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                widget.pharmacy.name,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  shadows: [Shadow(color: Colors.black45, blurRadius: 4)],
                ),
              ),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    widget.pharmacy.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(color: Colors.grey),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.transparent, Colors.black87],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Pharmacy Info
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber, size: 20),
                      const SizedBox(width: 4),
                      Text(
                        "${widget.pharmacy.rating} Rating",
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 16),
                      const Icon(Icons.access_time, color: Colors.blue, size: 20),
                      const SizedBox(width: 4),
                      Text(widget.pharmacy.deliveryTime),
                      const SizedBox(width: 16),
                      if (widget.pharmacy.isOpen)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text("Open Now", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text("Closed", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, color: Colors.grey, size: 18),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          widget.pharmacy.locationName,
                          style: TextStyle(color: Colors.grey.shade700),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text("Supported Insurances:", style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: widget.pharmacy.supportedInsurances.map((ins) => Chip(
                      label: Text(ins, style: const TextStyle(fontSize: 10)),
                      backgroundColor: Colors.grey.shade100,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    )).toList(),
                  ),
                  const Divider(height: 32),
                  
                  // Pharmacist Link
                  InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => PharmacistListScreen(pharmacy: widget.pharmacy),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          Icon(Icons.people_outline, color: Theme.of(context).primaryColor),
                          const SizedBox(width: 12),
                          Text(
                            "View our Pharmacists",
                            style: TextStyle(
                              color: Theme.of(context).primaryColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const Spacer(),
                          const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Actions: Prefer
                  // Removed Block button from here, moved to PharmacistListScreen
                  ListenableBuilder(
                    listenable: StateService(),
                    builder: (context, _) {
                      final isPreferred = StateService().isPharmacyPreferred(widget.pharmacy.id);

                      return SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            StateService().setPharmacyPreferred(widget.pharmacy.id, !isPreferred);
                          },
                          icon: Icon(
                            isPreferred ? Icons.favorite : Icons.favorite_border,
                            color: isPreferred ? Colors.red : Colors.grey,
                          ),
                          label: Text(
                            isPreferred ? "Preferred Pharmacy" : "Add to Preferred",
                            style: TextStyle(
                              color: isPreferred ? Colors.red : Colors.black87,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: isPreferred ? Colors.red : Colors.grey.shade300),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      );
                    },
                  ),

                  const Divider(height: 32),
                  
                  // Search Bar for Products
                  const Text("Available Medicines", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: "Search in this pharmacy...",
                      prefixIcon: const Icon(Icons.search, color: Colors.grey),
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(30),
                        borderSide: BorderSide.none,
                      ),
                      suffixIcon: _searchQuery.isNotEmpty 
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: Colors.grey),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchQuery = '';
                              });
                            },
                          )
                        : null,
                    ),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),

          // Medicine Grid
          filteredMedicines.isEmpty 
          ? const SliverToBoxAdapter(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: Text("No medicines found matching your search.", style: TextStyle(color: Colors.grey)),
                ),
              ),
            )
          : SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.68,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final med = filteredMedicines[index];
                  // Pass pharmacy context if needed, currently reusing standard item
                  return MedicineItem(
                    medicine: med,
                    onTap: () { 
                       // Check if already in cart
                       final isInCart = StateService().cartItems.any((item) => item.medicine.id == med.id);
                       
                       if (isInCart) {
                         StateService().removeFromCart(med.id);
                         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("${med.name} removed from cart")));
                       } else {
                         if (med.requiresPrescription) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Prescription Required")));
                            return;
                         }
                         StateService().addToCart(med, 1);
                         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("${med.name} added from ${widget.pharmacy.name}")));
                       }
                    },
                    onAboutTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => MedicineDetailScreen(medicine: med),
                      ),
                    ),
                  );
                },
                childCount: filteredMedicines.length,
              ),
            ),
          ),
          
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
    ),
    );
  }
}
