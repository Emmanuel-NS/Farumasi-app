import '../models/models.dart';

final List<Medicine> dummyMedicines = [
  Medicine(
    id: 'm1',
    name: 'Paracetamol 500mg',
    description:
        'Effective pain reliever and fever reducer. Suitable for headaches, muscle aches, and colds.',
    price: 500,
    imageUrl:
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600',
    category: 'Pain Relief',
    rating: 4.8,
    isPopular: true,
    dosage:
        'Adults: 1-2 tablets every 4-6 hours. Do not exceed 8 tablets in 24 hours.',
    sideEffects:
        'Rare: Allergic reactions, skin rash. High doses may cause liver damage.',
    manufacturer: 'HealthLive Pharma',
  ),
  Medicine(
    id: 'm2',
    name: 'Amoxicillin 250mg',
    description:
        'Antibiotic used to treat bacterial infections. Requires a valid doctor\'s prescription.',
    price: 2500,
    imageUrl:
        'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=600',
    category: 'Antibiotics',
    requiresPrescription: true,
    rating: 4.5,
    dosage:
        'Take 1 capsule every 8 hours for 7 days. Complete the full course.',
    sideEffects: 'Nausea, diarrhea, stomach pain. Stop if rash appears.',
    manufacturer: 'Global Antibiotics Ltd.',
  ),
  Medicine(
    id: 'm3',
    name: 'Vitamin C 1000mg',
    description:
        'High-potency immune system booster to keep you healthy and energized.',
    price: 8000,
    imageUrl:
        'https://images.unsplash.com/photo-1577018501255-6677f502c38d?auto=format&fit=crop&q=80&w=600',
    category: 'Vitamins',
    isPopular: true,
    rating: 4.9,
    dosage: 'Dissolve one tablet in a glass of water daily.',
    sideEffects: 'High doses may cause stomach upset or kidney stones.',
    manufacturer: 'VitaBoost Inc.',
  ),
  Medicine(
    id: 'm4',
    name: 'Cough Syrup',
    description:
        'Fast-acting relief from dry and chesty coughs. Cherry flavor.',
    price: 3500,
    imageUrl:
        'https://images.unsplash.com/photo-1624454002302-36b824d7bd0a?auto=format&fit=crop&q=80&w=600',
    category: 'Cold & Flu',
    rating: 4.2,
    dosage: '10ml every 6 hours. Not for children under 6 years.',
    sideEffects: 'May cause drowsiness or dizziness.',
    manufacturer: 'CureWell Labs',
  ),
  Medicine(
    id: 'm5',
    name: 'Ibuprofen 400mg',
    description:
        'Non-steroidal anti-inflammatory drug (NSAID) for pain relief and inflammation.',
    price: 1500,
    imageUrl:
        'https://images.unsplash.com/photo-1550572017-ed108420b982?auto=format&fit=crop&q=80&w=600',
    category: 'Pain Relief',
    isPopular: true,
    rating: 4.7,
    dosage: 'Take with food. 1 tablet every 6-8 hours as needed.',
    sideEffects: 'Stomach pain, heartburn. Prolonged use risks stomach ulcers.',
    manufacturer: 'Relief Meds',
  ),
  Medicine(
    id: 'm6',
    name: 'Aloe Vera Gel',
    description:
        'Pure soothing gel for sunburns, skin irritations, and daily moisturizing.',
    price: 6000,
    imageUrl:
        'https://images.unsplash.com/photo-1596547610928-8547ae07106b?auto=format&fit=crop&q=80&w=600',
    category: 'Skincare',
    rating: 4.6,
    dosage: 'Apply liberally to affected area as often as needed.',
    sideEffects: 'Rarely causes allergic dermatitis in sensitive individuals.',
    manufacturer: 'Nature\'s Touch',
  ),
  Medicine(
    id: 'm7',
    name: 'Multivitamin Complex',
    description:
        'Complete daily nutritional support with essential vitamins and minerals.',
    price: 12000,
    imageUrl:
        'https://images.unsplash.com/photo-1550572017-4fcdbb563725?auto=format&fit=crop&q=80&w=600',
    category: 'Vitamins',
    isPopular: true,
    rating: 4.9,
    dosage: 'One tablet daily with a main meal.',
    sideEffects: 'Generally well tolerated. Check ingredients for allergens.',
    manufacturer: 'DailyVits',
  ),
  Medicine(
    id: 'm8',
    name: 'Hand Sanitizer',
    description:
        'Alcohol-based hand sanitizer that kills 99.9% of germs instantly.',
    price: 2000,
    imageUrl:
        'https://images.unsplash.com/photo-1584483766114-2cea6fac257d?auto=format&fit=crop&q=80&w=600',
    category: 'Hygiene',
    rating: 4.5,
    dosage: 'Apply palmful to hands and rub until dry.',
    sideEffects: 'May cause skin dryness with frequent use.',
    manufacturer: 'CleanHands Co.',
  ),
  Medicine(
    id: 'm9',
    name: 'Face Mask (N95)',
    description:
        'High filtration respiratory protection. Comfortable fit for daily use.',
    price: 1000,
    imageUrl:
        'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&q=80&w=600',
    category: 'Hygiene',
    isPopular: true,
    rating: 4.8,
    dosage: 'Wear covering nose and mouth. Dispose after use.',
    sideEffects: 'None known.',
    manufacturer: 'SafeBreath',
  ),
  Medicine(
    id: 'm10',
    name: 'Sunscreen SPF 50',
    description:
        'Broad-spectrum protection against UVA and UVB rays. Water-resistant.',
    price: 8500,
    imageUrl:
        'https://images.unsplash.com/photo-1556228722-dca852a36b53?auto=format&fit=crop&q=80&w=600',
    category: 'Skincare',
    rating: 4.7,
    dosage: 'Apply 15 minutes before sun exposure. Reapply every 2 hours.',
    sideEffects: 'Avoid contact with eyes.',
    manufacturer: 'SunGuard',
  ),
  // New Categories
  Medicine(
    id: 'm19',
    name: 'Protein Powder (Whey)',
    description: 'Premium whey protein for muscle recovery and growth.',
    price: 45000,
    imageUrl:
        'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&q=80&w=600',
    category: 'Nutrition',
    rating: 4.8,
    dosage: 'Mix one scoop with 250ml water or milk after workout.',
    sideEffects: 'May cause bloating in lactose intolerant individuals.',
    manufacturer: 'MuscleMax',
  ),
  Medicine(
    id: 'm20',
    name: 'Fish Oil Omega-3',
    description: 'Essential fatty acids for heart and brain health.',
    price: 15000,
    imageUrl:
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600', // Reusing pill bottle
    category: 'Nutrition',
    rating: 4.7,
    isPopular: true,
    dosage: '1 capsule twice daily with meals.',
    sideEffects: 'Fishy aftertaste.',
    manufacturer: 'OceanPure',
  ),
  Medicine(
    id: 'm21',
    name: 'Turmeric Curcumin',
    description: 'Natural herbal supplement for joint health and inflammation.',
    price: 12000,
    imageUrl:
        'https://images.unsplash.com/photo-1563189140-a6aed69ebad1?auto=format&fit=crop&q=80&w=600',
    category: 'Herbal Medicines',
    rating: 4.6,
    dosage: '1 capsule daily.',
    sideEffects: 'Generally safe. Consult doctor if pregnant.',
    manufacturer: 'HerbalLife',
  ),
  Medicine(
    id: 'm22',
    name: 'Ginseng Extract',
    description: 'Herbal energy booster and cognitive enhancer.',
    price: 18000,
    imageUrl:
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=600', // abstract herbs
    category: 'Herbal Medicines',
    rating: 4.5,
    dosage: 'Take one vial daily in the morning.',
    sideEffects: 'May cause insomnia if taken late.',
    manufacturer: 'RootsOrganic',
  ),
  Medicine(
    id: 'm11',
    name: 'Condoms (Pack of 3)',
    description: 'Latex condoms for protection and safe family planning.',
    price: 1500,
    imageUrl:
        'https://images.unsplash.com/photo-1542614532-6a6c2057d2a3?auto=format&fit=crop&q=80&w=600',
    category: 'Sexual Health',
    rating: 4.5,
    dosage: 'Use once during intercourse.',
    sideEffects: 'Latex allergy.',
    manufacturer: 'SafeLove',
  ),
  Medicine(
    id: 'm12',
    name: 'Pregnancy Test Kit',
    description: 'Fast and accurate home pregnancy test.',
    price: 2500,
    imageUrl:
        'https://images.unsplash.com/photo-1582719230166-5e5899479e0a?auto=format&fit=crop&q=80&w=600',
    category: 'Sexual Health',
    rating: 4.8,
    dosage: 'Follow instructions on pack.',
    sideEffects: 'None.',
    manufacturer: 'QuickCheck',
  ),
  Medicine(
    id: 'm13',
    name: 'Wheelchair (Standard)',
    description:
        'Foldable standard wheelchair with comfortable seating. Durable frame.',
    price: 150000,
    imageUrl:
        'https://images.unsplash.com/photo-1579737088463-3dc467d56a29?auto=format&fit=crop&q=80&w=600',
    category: 'Mobility Aids',
    requiresPrescription: true,
    rating: 4.9,
    dosage: 'N/A',
    sideEffects: 'N/A',
    manufacturer: 'OrthoMove',
  ),
  Medicine(
    id: 'm14',
    name: 'Adjustable Walking Cane',
    description: 'Lightweight aluminum walking stick with non-slip tip.',
    price: 15000,
    imageUrl:
        'https://images.unsplash.com/photo-1583344933994-3a95832a8264?auto=format&fit=crop&q=80&w=600',
    category: 'Mobility Aids',
    rating: 4.6,
    dosage: 'Adjust height to hip level.',
    sideEffects: 'N/A',
    manufacturer: 'OrthoMove',
  ),
  Medicine(
    id: 'm15',
    name: 'Baby Diapers (Pack of 50)',
    description: 'Soft and absorbent diapers for babies. Leak protection.',
    price: 18000,
    imageUrl:
        'https://images.unsplash.com/photo-1563812423300-a4309b43e11b?auto=format&fit=crop&q=80&w=600',
    category: 'Mother & Baby',
    isPopular: true,
    rating: 4.8,
    dosage: 'Change when wet.',
    sideEffects: 'Diaper rash if not changed frequently.',
    manufacturer: 'SoftBums',
  ),
  Medicine(
    id: 'm16',
    name: 'Blood Pressure Monitor',
    description: 'Digital automatic upper arm blood pressure monitor.',
    price: 35000,
    imageUrl:
        'https://images.unsplash.com/photo-1630656037492-f0275806c9bc?auto=format&fit=crop&q=80&w=600',
    category: 'Devices',
    rating: 4.7,
    dosage: 'Use seated with arm at heart level.',
    sideEffects: 'N/A',
    manufacturer: 'MediTech',
  ),
  Medicine(
    id: 'm17',
    name: 'First Aid Kit',
    description: 'Comprehensive kit with bandages, antiseptic, and tools.',
    price: 22000,
    imageUrl:
        'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=600',
    category: 'First Aid',
    rating: 4.9,
    dosage: 'See individual items.',
    sideEffects: 'N/A',
    manufacturer: 'EmergencyReady',
  ),
  Medicine(
    id: 'm18',
    name: 'Insulin Syringes',
    description: 'Sterile syringes for insulin injection.',
    price: 5000,
    imageUrl:
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600',
    category: 'Chronic Care',
    requiresPrescription: true,
    rating: 4.6,
    dosage: 'Single use only.',
    sideEffects: 'N/A',
    manufacturer: 'DiabeticCare',
  ),
];

final List<HealthTip> dummyHealthTips = [
  HealthTip(
    id: 't1',
    title: 'Benefits of Ginger',
    content:
        'Ginger is great for digestion and reducing nausea. It also has anti-inflammatory properties that can help with muscle pain.',
    imageUrl:
        'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600',
  ),
  HealthTip(
    id: 't2',
    title: 'Stay Hydrated',
    content:
        'Drinking enough water is crucial for maintaining bodily functions, regulating temperature, and keeping your skin healthy.',
    imageUrl:
        'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&q=80&w=600',
  ),
  HealthTip(
    id: 't3',
    title: 'Garlic for Immunity',
    content:
        'Garlic supplements are known to boost the function of the immune system and can prevent common colds.',
    imageUrl:
        'https://images.unsplash.com/photo-1615485925694-a0391632402a?auto=format&fit=crop&q=80&w=600',
  ),
];
