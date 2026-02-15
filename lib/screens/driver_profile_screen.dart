import 'package:flutter/material.dart';

class DriverProfileScreen extends StatefulWidget {
  final bool initialSavedState;
  const DriverProfileScreen({super.key, this.initialSavedState = false});

  @override
  State<DriverProfileScreen> createState() => _DriverProfileScreenState();
}

class _DriverProfileScreenState extends State<DriverProfileScreen> {
  late bool _isSaved;

  @override
  void initState() {
    super.initState();
    _isSaved = widget.initialSavedState;
  }

  @override
  Widget build(BuildContext context) {
    // ignore: deprecated_member_use
    return WillPopScope(
      onWillPop: () async {
        Navigator.pop(context, _isSaved);
        return false;
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text("Driver Profile"),
          centerTitle: true,
          elevation: 0,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.pop(context, _isSaved),
          ),
          actions: [
          IconButton(
            icon: Icon(
              _isSaved ? Icons.favorite : Icons.favorite_border,
              color: _isSaved ? Colors.red : Colors.black,
            ),
            onPressed: () {
              setState(() {
                _isSaved = !_isSaved;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(_isSaved ? "Driver added to favorites!" : "Driver removed from favorites."),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 32),
            // Profile Image
            Center(
              child: Stack(
                children: [
                   const CircleAvatar(
                    radius: 60,
                    backgroundColor: Colors.grey,
                    child: Icon(Icons.person, size: 80, color: Colors.white),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              "John Doe",
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.star, color: Colors.amber.shade600, size: 20),
                const SizedBox(width: 4),
                const Text(
                  "4.8 (124 deliveries)",
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 32),
            
            // Action Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  _buildMenuButton(
                    context,
                    icon: Icons.star_rate_rounded,
                    label: "Rate Rider",
                    color: Colors.orange,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RateDriverScreen())),
                  ),
                  const SizedBox(height: 16),
                  _buildMenuButton(
                    context,
                    icon: Icons.payments_rounded,
                    label: "Send a Tip",
                    color: Colors.green,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TipDriverScreen())),
                  ),
                  const SizedBox(height: 16),
                  _buildMenuButton(
                    context,
                    icon: Icons.forum_rounded,
                    label: "Leave a Comment",
                    color: Colors.blue,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CommentDriverScreen())),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 48),
            // Badges or Stats
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildStatColumn("124", "Trips"),
                _buildStatColumn("2.5", "Years"),
                _buildStatColumn("100%", "Rating"),
              ],
            ),
          ],
        ),
      ),
    ));
  }

  Widget _buildMenuButton(BuildContext context, {required IconData icon, required String label, required Color color, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.shade100,
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const Spacer(),
            Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn(String value, String label) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
      ],
    );
  }
}

class RateDriverScreen extends StatefulWidget {
  const RateDriverScreen({super.key});

  @override
  State<RateDriverScreen> createState() => _RateDriverScreenState();
}

class _RateDriverScreenState extends State<RateDriverScreen> {
  int _rating = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Rate Rider"), backgroundColor: Colors.white, foregroundColor: Colors.black, elevation: 0),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const Text("How was your rider?", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            const Text("Your feedback helps improve our service", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 48),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                return IconButton(
                  iconSize: 48,
                  onPressed: () => setState(() => _rating = index + 1),
                  icon: Icon(
                    index < _rating ? Icons.star : Icons.star_border,
                    color: Colors.orange,
                  ),
                );
              }),
            ),
            const SizedBox(height: 24),
            if (_rating > 0)
              Text("You rated $_rating stars", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange, fontSize: 18)),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Rating Submitted!")));
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.black, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                child: const Text("Submit Rating"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TipDriverScreen extends StatefulWidget {
  const TipDriverScreen({super.key});

  @override
  State<TipDriverScreen> createState() => _TipDriverScreenState();
}

class _TipDriverScreenState extends State<TipDriverScreen> {
  int? _selectedTip;
  final TextEditingController _customAmountController = TextEditingController();
  bool _isCustomAmount = false;

  @override
  void dispose() {
    _customAmountController.dispose();
    super.dispose();
  }

  void _onTipSelected(int amount) {
    setState(() {
      _selectedTip = amount;
      _isCustomAmount = false;
      _customAmountController.clear();
    });
    FocusScope.of(context).unfocus();
  }

  void _onCustomAmountChanged(String value) {
    setState(() {
      _isCustomAmount = true;
      _selectedTip = null;
    });
  }

  Future<void> _processPayment() async {
    final int amount = _isCustomAmount 
        ? int.tryParse(_customAmountController.text) ?? 0 
        : _selectedTip ?? 0;

    if (amount < 500) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Minimum tip amount is 500 RWF")),
      );
      return;
    }

    // Show processing dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(color: Colors.green),
                SizedBox(height: 16),
                Text("Processing Payment...", style: TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),
      ),
    );

    // Simulate delay
    await Future.delayed(const Duration(seconds: 2));
    
    // Close loading
    if(mounted) Navigator.pop(context);

    // Show success
    if(mounted) {
       showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: Colors.green, size: 48),
          title: const Text("Thank You!"),
          content: Text("You successfully tipped $amount RWF to John."),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx); // Close dialog
                Navigator.pop(context); // Close screen
              },
              child: const Text("Done"),
            )
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Send a Tip"), backgroundColor: Colors.white, foregroundColor: Colors.black, elevation: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const CircleAvatar(
              radius: 40,
              backgroundColor: Colors.grey,
              child: Icon(Icons.person, size: 40, color: Colors.white),
            ),
            const SizedBox(height: 16),
            const Text("Say thanks to John!", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("100% of the tip goes to your rider", style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 32),
            
            // Default Options
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [500, 1000, 2000].map((amount) {
                final isSelected = _selectedTip == amount;
                return GestureDetector(
                  onTap: () => _onTipSelected(amount),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.green : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isSelected ? Colors.green : Colors.transparent),
                    ),
                    child: Column(
                      children: [
                        Text(
                          "$amount",
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : Colors.black,
                          ),
                        ),
                        Text(
                          "RWF",
                          style: TextStyle(
                            fontSize: 12,
                            color: isSelected ? Colors.white70 : Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
            
            const SizedBox(height: 32),
            
            // Custom Amount
            const Align(
              alignment: Alignment.centerLeft,
              child: Text("Or enter custom amount", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _customAmountController,
              keyboardType: TextInputType.number,
              onChanged: _onCustomAmountChanged,
              onTap: () {
                setState(() {
                  _isCustomAmount = true;
                  _selectedTip = null;
                });
              },
              decoration: InputDecoration(
                prefixText: "RWF ",
                hintText: "Min: 500",
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Colors.green, width: 2),
                ),
                suffixIcon: _isCustomAmount ? const Icon(Icons.edit, color: Colors.green) : null,
              ),
            ),

            const SizedBox(height: 48),
            
            // Pay Button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _processPayment,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green, 
                  foregroundColor: Colors.white, 
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.payment),
                    SizedBox(width: 8),
                    Text("Proceed to Pay"),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class CommentDriverScreen extends StatelessWidget {
  const CommentDriverScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Leave a Comment"), backgroundColor: Colors.white, foregroundColor: Colors.black, elevation: 0),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Any compliments or complaints?", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 32),
            TextField(
              maxLines: 5,
              decoration: InputDecoration(
                hintText: "Write your comment here...",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                filled: true,
                fillColor: Colors.grey.shade50,
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Comment Submitted!")));
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                child: const Text("Submit Comment"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}