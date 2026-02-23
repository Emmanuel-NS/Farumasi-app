import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/state_service.dart';

class MedicineDetailScreen extends StatefulWidget {
  final Medicine medicine;

  const MedicineDetailScreen({super.key, required this.medicine});

  @override
  State<MedicineDetailScreen> createState() => _MedicineDetailScreenState();
}

class _MedicineDetailScreenState extends State<MedicineDetailScreen>
    with SingleTickerProviderStateMixin {
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
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 300,
              pinned: true,
              backgroundColor: Colors.green,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(
                  widget.medicine.name,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    shadows: [Shadow(blurRadius: 2, color: Colors.black)],
                  ),
                ),
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(
                      widget.medicine.imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        color: Colors.grey.shade200,
                        child: Icon(
                          Icons.medication,
                          size: 80,
                          color: Colors.green,
                        ),
                      ),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withOpacity(0.7),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          widget.medicine.maxPrice != null && widget.medicine.maxPrice! > widget.medicine.price
                              ? '${widget.medicine.price.toStringAsFixed(0)} - ${widget.medicine.maxPrice!.toStringAsFixed(0)} RWF'
                              : '${widget.medicine.price.toStringAsFixed(0)} RWF',
                          style: TextStyle(
                            fontSize: 22, // Slightly smaller to fit range
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Manufactured by ${widget.medicine.manufacturer}",
                          style: TextStyle(
                            color: Colors.grey.shade700,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                        if (widget.medicine.expiryDate != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4.0),
                            child: Row(
                              children: [
                                Icon(Icons.calendar_today, size: 14, color: Colors.red.shade300),
                                SizedBox(width: 6),
                                Text(
                                  "Expires: ${widget.medicine.expiryDate}",
                                  style: TextStyle(
                                    color: Colors.red.shade400,
                                    fontWeight: FontWeight.w500,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    SizedBox(height: 16),
                    if (widget.medicine.requiresPrescription)
                      Container(
                        margin: EdgeInsets.only(bottom: 16),
                        padding: EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade50,
                          border: Border.all(color: Colors.amber),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.assignment_late,
                              color: Colors.amber.shade800,
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                "Prescription Required. Please upload your prescription at checkout.",
                                style: TextStyle(
                                  color: Colors.amber.shade900,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _SliverAppBarDelegate(
                TabBar(
                  controller: _tabController,
                  labelColor: Colors.green,
                  unselectedLabelColor: Colors.grey,
                  indicatorColor: Colors.green,
                  isScrollable: true, // Allow scrolling for more tabs
                  tabs: [
                    Tab(text: "Overview"),
                    Tab(text: "Dosage"),
                    Tab(text: "Safety"),
                  ],
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [_buildOverviewTab(), _buildDosageTab(), _buildSafetyTab()],
        ),
      ),
      bottomNavigationBar: Container(
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              blurRadius: 10,
              color: Colors.black12,
              offset: Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: Icon(Icons.remove),
                      onPressed: () => setState(() {
                        if (_quantity > 1) _quantity--;
                      }),
                    ),
                    Text(
                      '$_quantity',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.add),
                      onPressed: () => setState(() {
                        _quantity++;
                      }),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: widget.medicine.requiresPrescription
                        ? Colors.grey
                        : Colors.green,
                    padding: EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: () {
                    if (widget.medicine.requiresPrescription) {
                      ScaffoldMessenger.of(context).hideCurrentSnackBar();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'This item requires a prescription. Please upload one via the Home Screen.',
                          ),
                          duration: Duration(seconds: 3),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: Colors.amber,
                        ),
                      );
                      return;
                    }

                    StateService().addToCart(widget.medicine, _quantity);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Added to Cart!'),
                        backgroundColor: Colors.green,
                        duration: Duration(seconds: 1),
                      ),
                    );
                  },
                  child: Text(
                    widget.medicine.requiresPrescription
                        ? "Rx Required"
                        : (widget.medicine.maxPrice != null &&
                                widget.medicine.maxPrice! >
                                    widget.medicine.price)
                            ? "Add - From ${(widget.medicine.price * _quantity).toStringAsFixed(0)} RWF"
                            : "Add to Cart - ${(widget.medicine.price * _quantity).toStringAsFixed(0)} RWF",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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
    return SingleChildScrollView(
      padding: EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Description", style: _headerStyle),
          SizedBox(height: 8),
          Text(widget.medicine.description, style: _bodyStyle),
          SizedBox(height: 8),
          Text(
            "This comprehensive formula is designed to target specific receptors in the body to provide rapid relief. It is synthesized using high-grade pharmaceutical compounds ensuring maximum efficacy and bioavailability. Suitable for adults and children over 12 years (unless specified otherwise).",
            style: _bodyStyle,
          ),
          SizedBox(height: 24),
          Text("Key Benefits", style: _headerStyle),
          SizedBox(height: 8),
          _buildBulletPoint("Fast acting relief within 30 minutes."),
          _buildBulletPoint("Long-lasting effect up to 12 hours."),
          _buildBulletPoint("Clinically tested for safety and efficacy."),
          _buildBulletPoint("Easy to swallow coating."),
          SizedBox(height: 24),
          Text("Storage Instructions", style: _headerStyle),
          SizedBox(height: 8),
          Text(
            "Store below 25°C in a dry place. Keep out of reach of children. Do not use if safety seal is broken.",
            style: _bodyStyle,
          ),
          SizedBox(height: 24),
          Text("Chemical Composition", style: _headerStyle),
          SizedBox(height: 8),
          Text(
            "Active Ingredient: Farumacinol 500mg.\nInactive Ingredients: Maize starch, Magnesium stearate, Povidone, Hypromellose.",
            style: _bodyStyle,
          ),
        ],
      ),
    );
  }

  Widget _buildDosageTab() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Recommended Dosage", style: _headerStyle),
          SizedBox(height: 8),
          Text(widget.medicine.dosage, style: _bodyStyle),
          SizedBox(height: 24),
          Text("Administration Guide", style: _headerStyle),
          SizedBox(height: 8),
          Text(
            "1. Take with a full glass of water.\n"
            "2. Can be taken with or without food. If stomach upset occurs, take with food.\n"
            "3. Do not crush, chew, or break extended-release tablets.\n"
            "4. Take at the same time each day for best results.",
            style: _bodyStyle,
          ),
          SizedBox(height: 24),
          Text("Missed Dose", style: _headerStyle),
          SizedBox(height: 8),
          Text(
            "If you miss a dose, take it as soon as you remember. If it is near the time of the next dose, skip the missed dose. Do not double the dose to catch up.",
            style: _bodyStyle,
          ),
          SizedBox(height: 24),
          Text("Overdose", style: _headerStyle),
          SizedBox(height: 8),
          Text(
            "In case of overdose, seek medical attention immediately. Symptoms may include nausea, dizziness, liver pain, or extreme drowsiness.",
            style: TextStyle(color: Colors.red.shade700, height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _buildSafetyTab() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Possible Side Effects", style: _headerStyle),
          SizedBox(height: 8),
          Text(widget.medicine.sideEffects, style: _bodyStyle),
          SizedBox(height: 8),
          Text(
            "Common side effects generally go away as your body adjusts. Consult your doctor if they persist.",
            style: TextStyle(
              fontStyle: FontStyle.italic,
              color: Colors.grey.shade700,
            ),
          ),
          SizedBox(height: 24),
          Text("Contraindications", style: _headerStyle),
          SizedBox(height: 8),
          Text(
            "Do not use if you have known hypersensitivity to any of the ingredients. Consult your doctor before use if you are pregnant, nursing, or have liver/kidney disease.",
            style: _bodyStyle,
          ),
          SizedBox(height: 24),
          Text("Drug Interactions", style: _headerStyle),
          SizedBox(height: 8),
          Text(
            "Check with your pharmacist if you are taking blood thinners, other NSAIDs, or mood stabilizing medications as interactions may occur.",
            style: _bodyStyle,
          ),
          SizedBox(height: 24),
          Text(
            "Warning",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.red,
            ),
          ),
          SizedBox(height: 8),
          Text(
            "Stop use and ask a doctor if you experience an allergic reaction, including skin rash, swelling of the face, or difficulty breathing.",
            style: _bodyStyle,
          ),
        ],
      ),
    );
  }

  Widget _buildBulletPoint(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.check_circle, color: Colors.green, size: 20),
          SizedBox(width: 8),
          Expanded(child: Text(text, style: _bodyStyle)),
        ],
      ),
    );
  }

  final TextStyle _headerStyle = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: Colors.black87,
  );
  final TextStyle _bodyStyle = TextStyle(
    fontSize: 15,
    height: 1.6,
    color: Colors.black54,
  );
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;
  _SliverAppBarDelegate(this._tabBar);

  @override
  double get minExtent => _tabBar.preferredSize.height + 1; // +1 for border
  @override
  double get maxExtent => _tabBar.preferredSize.height + 1;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: Colors.white,
      child: Column(children: [_tabBar, Divider(height: 1)]),
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) => false;
}
