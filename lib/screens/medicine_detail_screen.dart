import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/state_service.dart';

class MedicineDetailScreen extends StatefulWidget {
  final Medicine medicine;

  const MedicineDetailScreen({super.key, required this.medicine});

  @override
  State<MedicineDetailScreen> createState() => _MedicineDetailScreenState();
}

class _MedicineDetailScreenState extends State<MedicineDetailScreen> with SingleTickerProviderStateMixin {
  int _quantity = 1;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 320,
              pinned: true,
              backgroundColor: Colors.white,
              elevation: 0,
              iconTheme: IconThemeData(
                color: innerBoxIsScrolled ? Colors.black : Colors.black,
              ),
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    Container(color: Colors.white),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 40.0), // Space for rounding
                      child: Hero(
                        tag: widget.medicine.id,
                        child: Image.network(
                          widget.medicine.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            color: Colors.grey.shade100,
                            child: Icon(Icons.medication, size: 80, color: Colors.green.shade200),
                          ),
                        ),
                      ),
                    ),
                    // Gradient overlay for text readability if needed, or just design element
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withOpacity(0.3),
                              Colors.transparent,
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(20),
                child: Container(
                  height: 20,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(30),
                      topRight: Radius.circular(30),
                    ),
                  ),
                ),
              ),
            ),
          ];
        },
        body: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Section
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Categories
                    Wrap(
                      spacing: 8,
                      children: widget.medicine.allCategories.take(3).map((cat) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          cat.toUpperCase(),
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green.shade800),
                        ),
                      )).toList(),
                    ),
                    const SizedBox(height: 12),
                    
                    // Title & Price
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            widget.medicine.name,
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, height: 1.2),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '${widget.medicine.price.toStringAsFixed(0)} RWF',
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF2E7D32)),
                            ),
                            if (widget.medicine.maxPrice != null && widget.medicine.maxPrice! > widget.medicine.price)
                              Text(
                                'Max: ${widget.medicine.maxPrice!.toInt()}',
                                style: TextStyle(decoration: TextDecoration.lineThrough, color: Colors.grey.shade400, fontSize: 12),
                              ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Manufacturer & Rating
                    Row(
                      children: [
                        Icon(Icons.business, size: 16, color: Colors.grey.shade500),
                        const SizedBox(width: 4),
                        Text(
                          widget.medicine.manufacturer,
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                        ),
                        const Spacer(),
                        const Icon(Icons.star, size: 18, color: Colors.amber),
                        const SizedBox(width: 4),
                        Text(
                          widget.medicine.rating.toString(),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          " (120 reviews)",
                          style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Prescription Warning
                    if (widget.medicine.requiresPrescription)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.amber.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.assignment_late_outlined, color: Colors.amber.shade800),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                "Rx Required: You'll need to upload a valid prescription at checkout.",
                                style: TextStyle(color: Colors.amber.shade900, fontSize: 13, height: 1.4),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),

              // Tab Bar
              Container(
                color: Colors.white,
                child: TabBar(
                  controller: _tabController,
                  labelColor: const Color(0xFF2E7D32),
                  unselectedLabelColor: Colors.grey,
                  indicatorColor: const Color(0xFF2E7D32),
                  indicatorWeight: 3,
                  labelStyle: const TextStyle(fontWeight: FontWeight.bold),
                  tabs: const [
                    Tab(text: "Overview"),
                    Tab(text: "Dosage"),
                    Tab(text: "Safety"),
                  ],
                ),
              ),

              // Content
              Container(
                color: Colors.grey.shade50,
                constraints: const BoxConstraints(minHeight: 300),
                child: AnimatedBuilder(
                  animation: _tabController,
                  builder: (context, _) {
                    // Simple logic to show content based on index
                    // In a NestedScrollView + TabBarView, it's better to use TabBarView inside body
                    // but here we are inside a SingleScrollView. 
                    // To avoid scroll conflict, we use a simple switch or custom container.
                     switch (_tabController.index) {
                       case 0: return _buildOverviewTab();
                       case 1: return _buildDosageTab();
                       case 2: return _buildSafetyTab();
                       default: return _buildOverviewTab();
                     }
                  },
                ),
              ),
              const SizedBox(height: 100), // Spacing for bottom bar
            ],
          ),
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(blurRadius: 20, color: Colors.black.withOpacity(0.05), offset: const Offset(0, -5)),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove), 
                      onPressed: () => setState(() => _quantity > 1 ? _quantity-- : null),
                      color: Colors.grey.shade700,
                    ),
                    Text('$_quantity', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.add), 
                      onPressed: () => setState(() => _quantity++),
                      color: const Color(0xFF2E7D32),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2E7D32),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    StateService().addToCart(widget.medicine, _quantity);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Row(children: const [Icon(Icons.check_circle, color: Colors.white), SizedBox(width: 8), Text('Added to Cart!')]),
                        backgroundColor: const Color(0xFF2E7D32),
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        margin: const EdgeInsets.all(20),
                      ),
                    );
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shopping_bag_outlined, color: Colors.white),
                      const SizedBox(width: 8),
                      Text("Add  •  ${(widget.medicine.price * _quantity).toStringAsFixed(0)} RWF", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOverviewTab() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Description", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(widget.medicine.description, style: TextStyle(color: Colors.grey.shade600, height: 1.6)),
          const SizedBox(height: 24),
          
          const Text("Expiry & Storage", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildInfoChip(Icons.calendar_today, "Exp: ${widget.medicine.expiryDate ?? 'N/A'}", Colors.blue),
              const SizedBox(width: 12),
              _buildInfoChip(Icons.thermostat, "Store < 25°C", Colors.orange),
            ],
          ),
          const SizedBox(height: 24),

          if (widget.medicine.allSubCategories.isNotEmpty) ...[
             const Text("Tags", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
             const SizedBox(height: 8),
             Wrap(
               spacing: 8,
               children: widget.medicine.allSubCategories.map((sub) => Chip(
                 label: Text(sub, style: const TextStyle(fontSize: 12)),
                 backgroundColor: Colors.white,
                 side: BorderSide(color: Colors.grey.shade300),
               )).toList(),
             )
          ]
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: color.withOpacity(0.8), fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildDosageTab() {
    bool hasStructured = widget.medicine.doseMorning != null || widget.medicine.doseTimeInterval != null;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.shade100),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.blue),
                const SizedBox(width: 12),
                Expanded(child: Text(widget.medicine.dosage, style: TextStyle(color: Colors.blue.shade800, height: 1.4))),
              ],
            ),
          ),
          const SizedBox(height: 24),

          if (hasStructured) ...[
            const Text("Daily Schedule", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildDoseTime("Morning", widget.medicine.doseMorning, Icons.wb_sunny_outlined),
                _buildDoseTime("Noon", widget.medicine.doseAfternoon, Icons.wb_twilight),
                _buildDoseTime("Night", widget.medicine.doseEvening, Icons.nights_stay_outlined),
              ],
            ),
            const SizedBox(height: 24),
             if (widget.medicine.doseTimeInterval != null && widget.medicine.doseTimeInterval!.isNotEmpty)
               Center(
                 child: Text("Interval: ${widget.medicine.doseTimeInterval}", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
               ),
          ],
        ],
      ),
    );
  }

  Widget _buildDoseTime(String time, String? amount, IconData icon) {
    bool isActive = amount != null && amount.isNotEmpty && amount.toLowerCase() != "none";
    return Column(
      children: [
        Container(
          width: 60, height: 60,
          decoration: BoxDecoration(
            color: isActive ? Colors.green.shade50 : Colors.grey.shade100,
            shape: BoxShape.circle,
            border: Border.all(color: isActive ? Colors.green.shade200 : Colors.transparent),
          ),
          child: Icon(icon, color: isActive ? Colors.green : Colors.grey),
        ),
        const SizedBox(height: 8),
        Text(time, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        const SizedBox(height: 4),
        Text(isActive ? amount! : "-", style: TextStyle(color: isActive ? Colors.black : Colors.grey, fontSize: 12)),
      ],
    );
  }

  Widget _buildSafetyTab() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
           const Text("Side Effects", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
           const SizedBox(height: 8),
           Text(widget.medicine.sideEffects, style: TextStyle(color: Colors.grey.shade600, height: 1.6)),
           const SizedBox(height: 24),
           
           Container(
             padding: const EdgeInsets.all(16),
             decoration: BoxDecoration(
               color: Colors.red.shade50,
               borderRadius: BorderRadius.circular(12),
             ),
             child: Column(
               crossAxisAlignment: CrossAxisAlignment.start,
               children: [
                 Row(
                   children: [
                     Icon(Icons.warning_amber_rounded, color: Colors.red.shade700),
                     const SizedBox(width: 8),
                     Text("Important Safety Warning", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red.shade800)),
                   ],
                 ),
                 const SizedBox(height: 8),
                 Text(
                   "Stop use and ask a doctor if you experience an allergic reaction. Keep out of reach of children.",
                   style: TextStyle(color: Colors.red.shade900, fontSize: 13),
                 ),
               ],
             ),
           )
        ],
      ),
    );
  }
}
