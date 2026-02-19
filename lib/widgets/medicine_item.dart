import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/state_service.dart';

class MedicineItem extends StatelessWidget {
  final Medicine medicine;
  final VoidCallback onTap; // Adds to Cart
  final VoidCallback onAboutTap; // Navigates to Details

  const MedicineItem({
    super.key,
    required this.medicine,
    required this.onTap,
    required this.onAboutTap,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: StateService(),
      builder: (context, child) {
        final isInCart = StateService().cartItems.any(
          (item) => item.medicine.id == medicine.id,
        );

        return Card(
          elevation: 2,
          margin: const EdgeInsets.all(8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: InkWell(
                  onTap: () {
                    if (medicine.requiresPrescription) {
                      ScaffoldMessenger.of(context).hideCurrentSnackBar();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Prescription required for this item.'),
                          duration: Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: Colors.amber,
                        ),
                      );
                      return;
                    }
                    onTap();
                  }, // Image tap -> Toggle Cart
                  borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(12),
                          ),
                        ),
                        child: Hero(
                          tag: medicine.id,
                          child: ClipRRect(
                            borderRadius: BorderRadius.vertical(
                              top: Radius.circular(12),
                            ),
                            child: Image.network(
                              medicine.imageUrl,
                              fit: BoxFit.cover,
                              width: double.infinity,
                              height: double.infinity,
                              cacheWidth: 600, // Optimize memory usage
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return Center(
                                  child: SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.green.shade200),
                                    ),
                                  ),
                                );
                              },
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  color: Colors.grey[100],
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.image_not_supported_outlined,
                                        size: 32,
                                        color: Colors.grey.shade400,
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                      ),
                      // Overlay Tick when in Cart
                      if (isInCart)
                        Positioned.fill(
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(
                                0.4,
                              ), // Transparent background overlay
                              borderRadius: BorderRadius.vertical(
                                top: Radius.circular(12),
                              ),
                            ),
                            child: Center(
                              child: Container(
                                padding: EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.green,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 2,
                                  ),
                                ),
                                child: Icon(
                                  Icons.check,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(10.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: () {
                        if (medicine.requiresPrescription) {
                          ScaffoldMessenger.of(context).hideCurrentSnackBar();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Prescription required for this item.',
                              ),
                              duration: Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: Colors.amber,
                            ),
                          );
                          return;
                        }
                        onTap();
                      }, // Text tap -> Toggle Cart
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            medicine.name,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          SizedBox(height: 4),
                          Text(
                            '${medicine.price.toStringAsFixed(0)} RWF',
                            style: TextStyle(
                              color: Colors.green,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                          SizedBox(height: 2),
                          if (medicine.requiresPrescription)
                            Row(
                              children: [
                                Icon(
                                  Icons.description,
                                  size: 10,
                                  color: Colors.amber,
                                ),
                                SizedBox(width: 4),
                                Text(
                                  'Rx Required',
                                  style: TextStyle(
                                    color: Colors.amber,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Description Overlay/Toggle
                    // Using a stateful builder for local toggle if we wanted expansion.
                    // But per user request "Show as tooltip/overlay", we'll do an inline peek 
                    // that opens a modal for full text.
                    LayoutBuilder(
                      builder: (context, constraints) {
                        return InkWell(
                          onTap: () {
                             showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: Text(medicine.name),
                                content: SingleChildScrollView(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min, // Wrap content
                                    children: [
                                      Text(
                                        medicine.description,
                                        style: const TextStyle(fontSize: 14),
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        "Click 'Full Details' for more info about side effects and dosage.",
                                        style: TextStyle(color: Colors.grey, fontSize: 12, fontStyle: FontStyle.italic),
                                      ),
                                    ],
                                  ),
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.of(ctx).pop(),
                                    child: const Text("Close"),
                                  ),
                                  TextButton(
                                    onPressed: () {
                                      Navigator.of(ctx).pop();
                                      onAboutTap();
                                    },
                                    child: const Text("Full Details"),
                                  ),
                                ],
                              ),
                            );
                          },
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                medicine.description,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11, 
                                  color: Colors.grey[600],
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                "Read more...",
                                style: TextStyle(
                                  fontSize: 10, 
                                  color: Colors.blue, 
                                  fontWeight: FontWeight.bold
                                ),
                              ),
                            ],
                          ),
                        );
                      }
                    ),

                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        InkWell(
                          onTap:
                              onAboutTap, // Explicit About Tap (Now isolated)
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(
                              0,
                              8,
                              12,
                              8,
                            ), // Larger hit area
                            child: Text(
                              'About >',
                              style: TextStyle(
                                color: Colors.green,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
                        ),
                        Material(
                          color: medicine.requiresPrescription
                              ? Colors.grey
                              : (isInCart
                                    ? Colors.green.shade800
                                    : Colors.green),
                          borderRadius: BorderRadius.circular(4),
                          child: InkWell(
                            onTap: () {
                              if (medicine.requiresPrescription) {
                                ScaffoldMessenger.of(
                                  context,
                                ).hideCurrentSnackBar();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Prescription required for this item.',
                                    ),
                                    duration: Duration(seconds: 2),
                                    behavior: SnackBarBehavior.floating,
                                    backgroundColor: Colors.amber,
                                  ),
                                );
                                return;
                              }

                              StateService().addToCart(medicine, 1);
                              ScaffoldMessenger.of(
                                context,
                              ).hideCurrentSnackBar();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    '${medicine.name} added to cart!',
                                  ),
                                  duration: Duration(seconds: 1),
                                  behavior: SnackBarBehavior.floating,
                                  backgroundColor: Colors.green,
                                ),
                              );
                            },
                            borderRadius: BorderRadius.circular(4),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8.0,
                                vertical: 4.0,
                              ),
                              child: Icon(
                                Icons.add_shopping_cart,
                                size: 16,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
