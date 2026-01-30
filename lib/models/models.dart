class Medicine {
  final String id;
  final String name;
  final String description;
  final double price;
  final String imageUrl;
  final String category;
  final bool requiresPrescription;
  final double rating;
  final bool isPopular;
  final String dosage;
  final String sideEffects;
  final String manufacturer;

  Medicine({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.imageUrl,
    required this.category,
    this.requiresPrescription = false,
    this.rating = 4.5,
    this.isPopular = false,
    this.dosage = 'Take as directed by physician.',
    this.sideEffects = 'Consult a doctor if adverse reactions occur.',
    this.manufacturer = 'Generic Pharm Co.',
  });
}

class HealthTip {
  final String id;
  final String title;
  final String content;
  final String imageUrl;

  HealthTip({
    required this.id,
    required this.title,
    required this.content,
    required this.imageUrl,
  });
}

class CartItem {
  final Medicine medicine;
  int quantity;

  CartItem({required this.medicine, this.quantity = 1});

  double get total => medicine.price * quantity;
}
