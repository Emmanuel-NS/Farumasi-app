import type {
  Medicine,
  Order,
  AppNotification,
  HealthArticle,
  Pharmacist,
  PharmacistBooking,
  Pharmacy,
  AuthUser,
  DigitalPrescription,
} from "@/types";

// ── Current User ──────────────────────────────
export const mockUser: AuthUser = {
  id: "u1",
  name: "Amina Uwase",
  email: "amina.uwase@email.rw",
  phone: "+250 788 123 456",
  role: "patient",
};

// ── Medicines ─────────────────────────────────
export const mockMedicines: Medicine[] = [
  {
    id: "m1",
    name: "Panadol Extra",
    description:
      "Panadol Extra is a combination painkiller containing paracetamol and caffeine. Used for headache, migraine, back pain, toothache, and period pain.",
    price: 2500,
    maxPrice: 3500,
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80",
    category: "Pain Relief",
    subCategory: "Analgesics",
    additionalCategories: ["Fever"],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.7,
    isPopular: true,
    dosage: "Adults: 1–2 tablets every 4–6 hours as needed. Max 8 tablets/24 hours.",
    doseMorning: "1 Tablet",
    doseAfternoon: "1 Tablet",
    doseEvening: "1 Tablet",
    doseTimeInterval: "Every 4–6 hours",
    sideEffects: "Rare: nausea, rash. Stop use if allergic reaction occurs.",
    manufacturer: "GSK Consumer Healthcare",
    keywords: ["pain", "headache", "fever", "paracetamol"],
    expiryDate: "08/2026",
    ageDosages: [
      { range: "Child (6–12)", instructions: "½ tablet every 4–6 hours, max 4 half tablets/day" },
      { range: "Adult (18+)", instructions: "1–2 tablets every 4–6 hours, max 8 tablets/day" },
    ],
    warnings: "Do not exceed 8 tablets in 24 hours. Avoid alcohol. Not suitable for patients with liver or kidney disease.",
    storage: "Store below 25°C in a dry place away from sunlight. Keep out of reach of children.",
    composition: "Each tablet: Paracetamol 500mg + Caffeine 65mg.",
    interactions: "Avoid with other paracetamol-containing products. Use with caution alongside anticoagulants (e.g. warfarin).",
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 2500 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 2800 },
      { pharmacyName: "City Chemist", stockStatus: "low_stock", price: 3000 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 2700 },
    ],
  },
  {
    id: "m2",
    name: "Amoxicillin 500mg",
    description:
      "Broad-spectrum antibiotic used to treat bacterial infections including respiratory tract infections, urinary tract infections, and skin infections.",
    price: 8000,
    imageUrl: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=600&q=80",
    category: "Antibiotics",
    subCategory: "Penicillin",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: true,
    rating: 4.5,
    isPopular: true,
    dosage: "Adults: 500mg every 8 hours for 5–10 days. Take with or without food.",
    doseMorning: "1 Capsule",
    doseAfternoon: "1 Capsule",
    doseEvening: "1 Capsule",
    doseTimeInterval: "Every 8 hours",
    sideEffects: "Diarrhea, nausea, rash. Seek medical attention for severe reactions.",
    manufacturer: "GlaxoSmithKline",
    keywords: ["antibiotic", "bacteria", "infection", "penicillin"],
    expiryDate: "12/2025",
    ageDosages: [
      { range: "Child (<20kg)", instructions: "25mg/kg/day divided every 8 hours" },
      { range: "Adult", instructions: "500mg every 8 hours" },
    ],
    warnings: "Complete the full course even if you feel better. Do not use if allergic to penicillin or cephalosporins. Not effective against viral infections.",
    storage: "Store below 25°C in a dry place. Reconstituted suspension must be refrigerated and used within 14 days.",
    composition: "Amoxicillin trihydrate equivalent to amoxicillin 500mg per capsule.",
    interactions: "May reduce effectiveness of oral contraceptives. Do not take alongside methotrexate.",
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 8000 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "low_stock", price: 7500 },
    ],
  },
  {
    id: "m3",
    name: "Vitamin C 1000mg",
    description:
      "Vitamin C supplement to boost immunity, support collagen synthesis, and act as an antioxidant. Effervescent tablet dissolves in water.",
    price: 4500,
    imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80",
    category: "Vitamins",
    subCategory: "Vitamin C",
    additionalCategories: ["Immunity"],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.8,
    isPopular: true,
    dosage: "1 effervescent tablet dissolved in a glass of water, once daily.",
    doseMorning: "1 Tablet",
    doseAfternoon: "None",
    doseEvening: "None",
    doseTimeInterval: "Once daily",
    sideEffects: "High doses may cause digestive upset. Stay within recommended dose.",
    manufacturer: "Redoxon / Bayer",
    keywords: ["vitamin c", "immune", "supplement", "antioxidant"],
    expiryDate: "06/2026",
    ageDosages: [
      { range: "Child (4–12)", instructions: "½ tablet daily" },
      { range: "Adult (18+)", instructions: "1 tablet daily" },
    ],
    warnings: "Doses above 2000mg/day may increase risk of kidney stones. Use with caution in kidney disease or history of oxalate stones.",
    storage: "Store in a cool, dry place away from light. Keep container tightly closed.",
    composition: "Ascorbic acid 1000mg, Citric acid, Sodium bicarbonate, Sorbitol, natural flavouring.",
    interactions: "High doses may interfere with certain lab tests. Use with caution alongside anticoagulants.",
    marketingPharmacies: [
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 4500 },
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 4200 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 4800 },
    ],
  },
  {
    id: "m4",
    name: "Metformin 850mg",
    description:
      "First-line treatment for type 2 diabetes. Reduces blood sugar by decreasing glucose production in the liver and improving insulin sensitivity.",
    price: 3000,
    imageUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&q=80",
    category: "Diabetes",
    subCategory: "Biguanides",
    additionalCategories: ["Chronic Care"],
    additionalSubCategories: [],
    requiresPrescription: true,
    rating: 4.4,
    isPopular: false,
    dosage: "Initially 850mg once daily with meals, adjusted by physician.",
    doseMorning: "1 Tablet",
    doseAfternoon: "None",
    doseEvening: "1 Tablet",
    doseTimeInterval: "With meals",
    sideEffects: "Nausea, diarrhea, abdominal pain — usually improves with time.",
    manufacturer: "Merck",
    keywords: ["diabetes", "blood sugar", "metformin", "glucose"],
    ageDosages: [
      { range: "Adult (18+)", instructions: "850mg with meals, as prescribed" },
    ],
    warnings: "Discontinue before radiological contrast procedures. Avoid alcohol. Regular kidney function monitoring required. Not for use in type 1 diabetes.",
    storage: "Store below 30°C in a dry place. Keep in original packaging to protect from moisture.",
    composition: "Metformin hydrochloride 850mg per tablet. Excipients: Magnesium stearate, Maize starch.",
    interactions: "Alcohol increases risk of lactic acidosis. Caution with diuretics, ACE inhibitors, and radiological contrast media.",
    marketingPharmacies: [
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 3000 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 3200 },
    ],
  },
  {
    id: "m5",
    name: "Ibuprofen 400mg",
    description:
      "Non-steroidal anti-inflammatory drug (NSAID) for pain, inflammation, and fever. Effective for dental pain, arthritis, sports injuries.",
    price: 1800,
    imageUrl: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&q=80",
    category: "Pain Relief",
    subCategory: "NSAIDs",
    additionalCategories: ["Anti-Inflammatory"],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.3,
    isPopular: false,
    dosage: "Adults: 400mg every 6–8 hours with food. Max 1200mg/day without medical advice.",
    doseMorning: "1 Tablet",
    doseAfternoon: "1 Tablet",
    doseEvening: "1 Tablet",
    doseTimeInterval: "Every 6–8 hours",
    sideEffects: "Stomach upset, nausea. Not recommended for kidney or heart conditions.",
    manufacturer: "Generic Pharma Co.",
    keywords: ["ibuprofen", "pain", "inflammation", "nsaid"],
    ageDosages: [
      { range: "Child (6–12)", instructions: "200mg every 6–8 hours" },
      { range: "Adult (18+)", instructions: "400mg every 6–8 hours" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 1800 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 2000 },
    ],
  },
  {
    id: "m6",
    name: "Oral Rehydration Salts",
    description:
      "WHO-recommended treatment for dehydration due to diarrhea and vomiting. Restores electrolyte balance quickly.",
    price: 500,
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
    category: "Digestive Health",
    subCategory: "Rehydration",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.6,
    isPopular: true,
    dosage: "Dissolve 1 sachet in 200ml clean water. Sip frequently.",
    doseMorning: "1 sachet",
    doseAfternoon: "1 sachet",
    doseEvening: "1 sachet",
    doseTimeInterval: "As needed",
    sideEffects: "Generally very safe. Do not add extra sugar.",
    manufacturer: "WHO/UNICEF Standard",
    keywords: ["ors", "rehydration", "diarrhea", "electrolytes", "dehydration"],
    ageDosages: [
      { range: "Infant (<2)", instructions: "50ml/kg over 4 hours" },
      { range: "Child (2–10)", instructions: "200ml after each loose stool" },
      { range: "Adult", instructions: "200–400ml after each loose stool" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 500 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 500 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 500 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 500 },
    ],
  },
  {
    id: "m7",
    name: "Chloroquine Phosphate",
    description:
      "Antimalarial medication used for the prevention and treatment of malaria caused by P. vivax, P. malariae, and sensitive P. falciparum.",
    price: 2200,
    imageUrl: "https://images.unsplash.com/photo-1576671414121-aa2d6076ef13?w=600&q=80",
    category: "Malaria",
    subCategory: "Antimalarial",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: true,
    rating: 4.2,
    isPopular: false,
    dosage: "Prescribed by physician based on weight and indication.",
    sideEffects: "Nausea, headache, visual disturbances with long-term use.",
    manufacturer: "Sanofi",
    keywords: ["malaria", "chloroquine", "antimalarial"],
    ageDosages: [
      { range: "Child", instructions: "5mg base/kg per dose, as prescribed" },
      { range: "Adult", instructions: "600mg base initially, then 300mg at 6, 24, 48 hours" },
    ],
    marketingPharmacies: [
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 2200 },
    ],
  },
  {
    id: "m8",
    name: "Loratadine 10mg",
    description:
      "Non-drowsy antihistamine for allergic rhinitis, urticaria, and hay fever. Fast-acting and 24-hour coverage.",
    price: 3200,
    imageUrl: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&q=80",
    category: "Allergy",
    subCategory: "Antihistamines",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.5,
    isPopular: false,
    dosage: "Adults & children >6 years: 1 tablet (10mg) once daily.",
    doseMorning: "1 Tablet",
    doseAfternoon: "None",
    doseEvening: "None",
    doseTimeInterval: "Once daily",
    sideEffects: "Mild: headache, dry mouth. Generally well tolerated.",
    manufacturer: "Schering-Plough",
    keywords: ["allergy", "antihistamine", "hay fever", "urticaria"],
    ageDosages: [
      { range: "Child (6–12, <30kg)", instructions: "5mg daily" },
      { range: "Adult / Child >30kg", instructions: "10mg daily" },
    ],
    marketingPharmacies: [
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 3200 },
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 3500 },
    ],
  },
  // ── Cold & Flu ────────────────────────────────────
  {
    id: "m9",
    name: "Lemsip Cold & Flu Relief",
    description: "All-in-one cold and flu relief sachet. Contains paracetamol, vitamin C, and a decongestant. Eases headache, blocked nose, sore throat, and body aches.",
    price: 3500,
    maxPrice: 4500,
    imageUrl: "https://images.unsplash.com/photo-1575517111478-7f6afd0973db?w=600&q=80",
    category: "Cold & Flu",
    subCategory: "Multi-symptom",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.4,
    isPopular: true,
    dosage: "Adults: 1 sachet dissolved in hot water every 4–6 hours. Max 4 sachets/day.",
    sideEffects: "Possible drowsiness. Avoid driving when taking decongestant.",
    manufacturer: "Reckitt Benckiser",
    keywords: ["cold", "flu", "blocked nose", "lemsip", "relief", "paracetamol"],
    ageDosages: [
      { range: "Adult (18+)", instructions: "1 sachet every 4–6 hours, max 4 sachets/day" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 3500 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 3800 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 4200 },
    ],
  },
  {
    id: "m10",
    name: "Amoxicillin 250mg",
    description: "Broad-spectrum antibiotic in 250mg dose. Used for mild to moderate bacterial respiratory tract and ear infections. Requires a valid doctor's prescription.",
    price: 2500,
    maxPrice: 3200,
    imageUrl: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=600&q=80",
    category: "Cold & Flu",
    subCategory: "Antibiotics",
    additionalCategories: ["Antibiotics"],
    additionalSubCategories: [],
    requiresPrescription: true,
    rating: 4.3,
    isPopular: true,
    dosage: "Adults: 250mg every 8 hours for 5–7 days. Take with or without food.",
    sideEffects: "Diarrhea, nausea, rash. Seek medical attention for severe reactions.",
    manufacturer: "GlaxoSmithKline",
    keywords: ["antibiotic", "bacteria", "infection", "amoxicillin", "cold", "flu"],
    ageDosages: [
      { range: "Child (<20kg)", instructions: "20mg/kg/day in 3 divided doses" },
      { range: "Adult", instructions: "250mg every 8 hours" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 2500 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 2800 },
      { pharmacyName: "City Chemist", stockStatus: "low_stock", price: 3200 },
    ],
  },
  // ── Skincare ──────────────────────────────────────
  {
    id: "m11",
    name: "Aloe Vera Gel",
    description: "Pure soothing gel for sunburns, skin irritations, and daily moisturizing. Hydrates and calms sensitive skin naturally without clogging pores.",
    price: 6000,
    maxPrice: 7500,
    imageUrl: "https://images.unsplash.com/photo-1600428610290-6d344c4b5db0?w=600&q=80",
    category: "Skincare",
    subCategory: "Moisturizers",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.6,
    isPopular: true,
    dosage: "Apply a thin layer to affected skin area 2–3 times daily.",
    sideEffects: "Rarely: mild skin irritation. Patch test recommended for sensitive skin.",
    manufacturer: "Nature Republic",
    keywords: ["aloe vera", "gel", "skincare", "moisturizer", "soothe", "sunburn"],
    ageDosages: [
      { range: "All ages (external)", instructions: "Apply as needed to skin" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 6000 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 6500 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 7500 },
    ],
  },
  {
    id: "m12",
    name: "Sunscreen SPF 50",
    description: "Broad-spectrum UVA/UVB protection sunscreen. Lightweight non-greasy formula suitable for daily use on face and body. Water-resistant for 80 minutes.",
    price: 9000,
    maxPrice: 12000,
    imageUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80",
    category: "Skincare",
    subCategory: "Sun Protection",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.5,
    isPopular: false,
    dosage: "Apply generously 15 minutes before sun exposure. Reapply every 2 hours.",
    sideEffects: "Rarely: skin rash. Avoid contact with eyes.",
    manufacturer: "La Roche-Posay",
    keywords: ["sunscreen", "spf", "uv", "skin protection", "skincare"],
    ageDosages: [
      { range: "Adult / Child (3+)", instructions: "Apply to exposed skin before sun exposure" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 9000 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 10500 },
    ],
  },
  // ── Hygiene ───────────────────────────────────────
  {
    id: "m13",
    name: "Antiseptic Hand Sanitizer 500ml",
    description: "WHO-formulated hand sanitizer with 70% isopropyl alcohol. Kills 99.9% of germs and bacteria instantly. No water or soap needed.",
    price: 4000,
    maxPrice: 5000,
    imageUrl: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=600&q=80",
    category: "Hygiene",
    subCategory: "Hand Care",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.7,
    isPopular: true,
    dosage: "Dispense enough product to cover all hand surfaces. Rub until dry (~20 seconds).",
    sideEffects: "May cause skin dryness with excessive use. Flammable — keep away from fire.",
    manufacturer: "Dettol",
    keywords: ["sanitizer", "hygiene", "alcohol", "hand", "antiseptic", "germs"],
    ageDosages: [
      { range: "All ages (external)", instructions: "Apply to hands as needed" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 4000 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 4200 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 4500 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 5000 },
    ],
  },
  {
    id: "m14",
    name: "Surgical Face Masks (50-pack)",
    description: "3-ply disposable surgical face masks providing effective filtration of airborne particles. Comfortable ear loops and nose clip for secure fit.",
    price: 5000,
    maxPrice: 6500,
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80",
    category: "Hygiene",
    subCategory: "Protective Gear",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.3,
    isPopular: false,
    dosage: "Wear covering nose and mouth. Replace after 4 hours or when damp.",
    sideEffects: "None. Dispose safely after use.",
    manufacturer: "Farumasi Medical Supplies",
    keywords: ["mask", "face mask", "surgical", "hygiene", "protection"],
    ageDosages: [
      { range: "Adult / Child (5+)", instructions: "Wear as directed for source control" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 5000 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 5500 },
    ],
  },
  // ── Sexual Health ─────────────────────────────────
  {
    id: "m15",
    name: "Female Contraceptive Pills",
    description: "Combined oral contraceptive for family planning. Contains synthetic hormones to prevent pregnancy with over 99% effectiveness when taken correctly.",
    price: 3500,
    maxPrice: 4500,
    imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80",
    category: "Sexual Health",
    subCategory: "Contraceptives",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: true,
    rating: 4.5,
    isPopular: false,
    dosage: "Take 1 tablet daily at the same time every day for 21–28 days as directed.",
    sideEffects: "Nausea, spotting, mood changes. Consult physician if symptoms persist.",
    manufacturer: "Bayer Healthcare",
    keywords: ["contraceptive", "pill", "family planning", "hormone", "birth control"],
    ageDosages: [
      { range: "Adult (18+)", instructions: "1 tablet daily as prescribed by physician" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 3500 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 3800 },
    ],
  },
  // ── Mobility Aids ─────────────────────────────────
  {
    id: "m16",
    name: "Adjustable Walking Cane",
    description: "Lightweight aluminum walking stick with non-slip rubber tip. Height-adjustable to suit different users. Ideal for elderly and post-surgery recovery.",
    price: 15000,
    maxPrice: 20000,
    imageUrl: "",
    category: "Mobility Aids",
    subCategory: "Walking Aids",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.3,
    isPopular: false,
    dosage: "Adjust handle height to your elbow. Hold on the side opposite to your injury.",
    sideEffects: "None. Ensure correct fitting to avoid posture strain.",
    manufacturer: "OrthoAssist",
    keywords: ["cane", "walking", "mobility", "elderly", "stick", "walking aid"],
    ageDosages: [],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 15000 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 17000 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "low_stock", price: 20000 },
    ],
  },
  {
    id: "m17",
    name: "Knee Support Brace",
    description: "Elastic compression knee brace for pain relief and joint stabilization. Suitable for arthritis, sports injuries, and post-operative recovery.",
    price: 12000,
    maxPrice: 16000,
    imageUrl: "",
    category: "Mobility Aids",
    subCategory: "Braces",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.4,
    isPopular: false,
    dosage: "Wear on affected knee during activity or as directed by physiotherapist.",
    sideEffects: "Avoid wearing too tightly to prevent circulation problems.",
    manufacturer: "Thuasne",
    keywords: ["knee", "brace", "support", "mobility", "joint", "arthritis"],
    ageDosages: [],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 12000 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 14000 },
    ],
  },
  // ── Mother & Baby ─────────────────────────────────
  {
    id: "m18",
    name: "Baby Diapers (Pack of 50)",
    description: "Soft and absorbent baby diapers for infants. Leak protection with hypoallergenic material for delicate skin. Available in sizes S, M, and L.",
    price: 18000,
    maxPrice: 21000,
    imageUrl: "",
    category: "Mother & Baby",
    subCategory: "Baby Care",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.7,
    isPopular: true,
    dosage: "Change every 3–4 hours or immediately after soiling.",
    sideEffects: "Rarely: diaper rash. Ensure regular and timely changes.",
    manufacturer: "Pampers",
    keywords: ["diaper", "baby", "nappy", "infant", "absorbent", "newborn"],
    ageDosages: [],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 18000 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 19500 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 21000 },
    ],
  },
  {
    id: "m19",
    name: "Prenatal Vitamins (30 Tablets)",
    description: "Comprehensive prenatal supplement with folic acid, iron, calcium, and DHA. Essential for healthy fetal development and maternal nutrition during pregnancy.",
    price: 12000,
    maxPrice: 15000,
    imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80",
    category: "Mother & Baby",
    subCategory: "Prenatal Care",
    additionalCategories: ["Vitamins"],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.8,
    isPopular: true,
    dosage: "1 tablet daily with a full glass of water, preferably with food.",
    sideEffects: "May cause nausea or constipation. Take with food to minimize side effects.",
    manufacturer: "Vitabiotics",
    keywords: ["prenatal", "pregnancy", "folic acid", "maternal", "vitamins", "baby"],
    ageDosages: [
      { range: "Pregnant women", instructions: "1 tablet daily throughout pregnancy" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 12000 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 13500 },
    ],
  },
  // ── Devices ───────────────────────────────────────
  {
    id: "m20",
    name: "Digital Thermometer",
    description: "Fast-read digital thermometer with flexible tip. Suitable for oral, axillary, or rectal measurement. Memory function stores last reading.",
    price: 8000,
    maxPrice: 12000,
    imageUrl: "",
    category: "Devices",
    subCategory: "Monitoring",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.5,
    isPopular: false,
    dosage: "Place under tongue or armpit. Wait for beep signal (~60 seconds).",
    sideEffects: "None. Clean with alcohol wipe between uses.",
    manufacturer: "Omron",
    keywords: ["thermometer", "temperature", "fever", "digital", "device"],
    ageDosages: [],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 8000 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 9500 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 12000 },
    ],
  },
  {
    id: "m21",
    name: "Blood Pressure Monitor",
    description: "Automatic upper-arm blood pressure monitor with large LCD display. WHO classification indicator, irregular heartbeat detection, and memory for 60 readings.",
    price: 45000,
    maxPrice: 60000,
    imageUrl: "",
    category: "Devices",
    subCategory: "Cardiovascular",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.7,
    isPopular: false,
    dosage: "Rest for 5 minutes before measuring. Measure twice and record the average.",
    sideEffects: "None. Do not use on arm with IV infusion.",
    manufacturer: "Omron Healthcare",
    keywords: ["blood pressure", "bp monitor", "hypertension", "device", "cardiovascular"],
    ageDosages: [],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 45000 },
      { pharmacyName: "City Chemist", stockStatus: "low_stock", price: 55000 },
    ],
  },
  // ── First Aid ─────────────────────────────────────
  {
    id: "m22",
    name: "First Aid Kit (Deluxe 50-pc)",
    description: "Complete 50-piece first aid kit including bandages, antiseptic wipes, gauze, scissors, disposable gloves, and an emergency first aid manual.",
    price: 25000,
    maxPrice: 30000,
    imageUrl: "",
    category: "First Aid",
    subCategory: "Kits",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.6,
    isPopular: false,
    dosage: "Use contents as needed for cuts, burns, and minor injuries.",
    sideEffects: "None. Check expiry dates of antiseptic contents.",
    manufacturer: "Bort Medical",
    keywords: ["first aid", "bandage", "emergency", "kit", "wound", "antiseptic"],
    ageDosages: [],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 25000 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 27000 },
    ],
  },
  // ── Chronic Care ──────────────────────────────────
  {
    id: "m23",
    name: "Aspirin 81mg (Low Dose)",
    description: "Antiplatelet agent used to reduce the risk of heart attack and stroke. Anti-inflammatory. Often prescribed for long-term cardiovascular protection.",
    price: 3000,
    maxPrice: 4000,
    imageUrl: "",
    category: "Chronic Care",
    subCategory: "Cardiovascular",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.5,
    isPopular: false,
    dosage: "Adults: 81mg once daily. Take with or after food to reduce stomach irritation.",
    sideEffects: "GI irritation, increased bleeding risk. Avoid if allergic to NSAIDs.",
    manufacturer: "Bayer AG",
    keywords: ["aspirin", "heart", "cardiovascular", "antiplatelet", "chronic", "low dose"],
    ageDosages: [
      { range: "Adult (18+)", instructions: "81mg once daily as prescribed by physician" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 3000 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 3200 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 3500 },
      { pharmacyName: "Remera Modern Pharmacy", stockStatus: "available", price: 4000 },
    ],
  },
  // ── Nutrition ─────────────────────────────────────
  {
    id: "m24",
    name: "Omega-3 Fish Oil (60 Capsules)",
    description: "High-potency omega-3 fish oil providing EPA and DHA. Supports heart health, brain function, and reduces inflammation. Burp-free formula.",
    price: 15000,
    maxPrice: 18000,
    imageUrl: "https://images.unsplash.com/photo-1579920461416-442ece8dd087?w=600&q=80",
    category: "Nutrition",
    subCategory: "Supplements",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.7,
    isPopular: false,
    dosage: "2 capsules daily with meals.",
    sideEffects: "Fishy aftertaste, mild GI upset with high doses. Store in cool dry place.",
    manufacturer: "Nordic Naturals",
    keywords: ["omega-3", "fish oil", "heart", "brain", "supplement", "epa", "dha"],
    ageDosages: [
      { range: "Adult (18+)", instructions: "2 capsules daily with meals" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 15000 },
      { pharmacyName: "HealthPlus Nyamirambo", stockStatus: "available", price: 16500 },
    ],
  },
  {
    id: "m25",
    name: "Protein Shake Mix (Vanilla, 500g)",
    description: "Whey protein supplement for muscle recovery, meal replacement, and nutritional support. 24g protein per serving with low sugar content.",
    price: 35000,
    maxPrice: 42000,
    imageUrl: "",
    category: "Nutrition",
    subCategory: "Protein",
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: false,
    rating: 4.4,
    isPopular: false,
    dosage: "Mix 1 scoop (30g) with 200ml water or milk. Consume within 30 minutes of exercise.",
    sideEffects: "Bloating in lactose-intolerant individuals. Use lactose-free milk if needed.",
    manufacturer: "Optimum Nutrition",
    keywords: ["protein", "whey", "supplement", "nutrition", "shake", "muscle"],
    ageDosages: [
      { range: "Adult (18+)", instructions: "1–2 scoops daily as dietary supplement" },
    ],
    marketingPharmacies: [
      { pharmacyName: "FARUMASI Pharmacy", stockStatus: "available", price: 35000 },
      { pharmacyName: "City Chemist", stockStatus: "available", price: 38000 },
    ],
  },
];

// ── Orders ────────────────────────────────────
export const mockActiveOrders: Order[] = [
  {
    id: "ORD-7829X",
    status: "out_for_delivery",
    items: "Panadol Extra, Vitamin C",
    total: "RWF 25,000",
    date: "Today, 10:30 AM",
    createdAt: new Date().toISOString(),
    pharmacy: "Kigali Main Pharmacy",
    deliveryFee: 1500,
    pharmacyPrice: 23500,
    assignedDriverName: "Jean-Paul Nkurunziza",
    assignedDriverPhone: "+250780000000",
  },
];

export const mockPastOrders: Order[] = [
  {
    id: "ORD-7800A",
    status: "delivered",
    items: "Amoxicillin 500mg",
    total: "RWF 10,000",
    date: "May 14, 2026",
    createdAt: new Date(Date.now() - 86400000 * 11).toISOString(),
    pharmacy: "HealthFirst Pharma",
  },
  {
    id: "ORD-7755B",
    status: "delivered",
    items: "Ibuprofen 400mg, ORS",
    total: "RWF 3,800",
    date: "May 10, 2026",
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    pharmacy: "Central Pharmacy",
  },
  {
    id: "ORD-7701C",
    status: "cancelled",
    items: "Metformin 850mg",
    total: "RWF 4,500",
    date: "May 2, 2026",
    createdAt: new Date(Date.now() - 86400000 * 23).toISOString(),
    pharmacy: "Kigali City Pharmacy",
    cancellationReason: "Prescription expired",
  },
];

// ── Notifications ─────────────────────────────
export const mockNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "Order Update",
    message: "Your order ORD-7829X is out for delivery! Driver Jean-Paul is on the way.",
    time: new Date(Date.now() - 10 * 60000).toISOString(),
    category: "order_shipped",
    isRead: false,
  },
  {
    id: "n2",
    title: "Health Tip of the Day",
    message: "Staying hydrated helps your kidneys function better. Aim for 8 glasses daily.",
    time: new Date(Date.now() - 2 * 3600000).toISOString(),
    category: "health_tip",
    isRead: false,
  },
  {
    id: "n3",
    title: "Prescription Refill Reminder",
    message: "Your Metformin 850mg is running low. Time to refill your prescription.",
    time: new Date(Date.now() - 24 * 3600000).toISOString(),
    category: "reminder",
    isRead: false,
  },
  {
    id: "n4",
    title: "Special Offer",
    message: "Get 10% off Vitamin C supplements this week. Valid at all partner pharmacies.",
    time: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    category: "promo",
    isRead: true,
  },
  {
    id: "n5",
    title: "Order Delivered",
    message: "Your order ORD-7800A has been successfully delivered.",
    time: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    category: "order",
    isRead: true,
  },
  {
    id: "n6",
    title: "Flash Sale Alert",
    message: "Limited-time deals on antibiotics and vitamins. Offer ends tonight at midnight.",
    time: new Date(Date.now() - 22 * 3600000).toISOString(),
    category: "promo",
    isRead: true,
  },
];

// ── Health Articles ───────────────────────────
export const mockHealthArticles: HealthArticle[] = [
  {
    id: "a1",
    title: "The Science of Hydration",
    subtitle: "More than just drinking water.",
    summary: "Why water is the most critical nutrient for your body's daily functions and how it affects your brain.",
    category: "General Health",
    readTimeMin: 4,
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
    source: "Journal of Biological Chemistry",
    publishedAt: new Date("2024-01-15"),
    fullContent: `Water is essential for life, making up about 60% of the adult human body. Every cell, tissue, and organ in your body needs water to work properly.

**Regulates Body Temperature**
Water stored in middle layers of the skin surfaces as sweat when the body heats up. As it evaporates, it cools the body.

**Lubricates Joints**
Cartilage, found in joints and the disks of the spine, contains around 80 percent water. Long-term dehydration can reduce the joints' shock-absorbing ability, leading to joint pain.

**Boosts Performance**
Dehydration reduces performance in activities lasting longer than 30 minutes. If you don't stay hydrated, your physical performance can suffer.

**Prevents Headaches**
Dehydration can trigger headaches and migraine in some individuals. Research has shown that water can relieve headaches in those who are dehydrated.`,
  },
  {
    id: "a2",
    title: "Mastering Sleep Hygiene",
    subtitle: "The secret to 8 hours of deep rest.",
    summary: "Optimizing your environment and habits for restorative deep sleep.",
    category: "Wellness",
    readTimeMin: 6,
    imageUrl: "https://images.unsplash.com/photo-1541781777631-fa95375ed299?w=800&q=80",
    source: "National Sleep Foundation",
    publishedAt: new Date("2024-02-08"),
    fullContent: `Sleep services to restore the body and mind. 7–9 hours recommended for adults.

**The Circadian Rhythm**
Your body has a natural time-keeping clock. It helps you stay awake and tells your body when to sleep.

**Blue Light Exposure**
Electronic devices emit blue light that tricks your brain into thinking it is still daytime. Limit screens at least 1 hour before bed.

**Caffeine**
When consumed late in the day, caffeine stimulates your nervous system and may stop your body from relaxing at night.`,
  },
  {
    id: "r1",
    title: "Flu & Cold Recovery",
    subtitle: "Virus Defense Protocol",
    summary: "Science-backed natural methods to shorten recovery time.",
    category: "Remedies",
    readTimeMin: 4,
    imageUrl: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=800&q=80",
    source: "Mayo Clinic",
    publishedAt: new Date("2024-03-22"),
    fullContent: `Influenza is a viral infection that attacks your respiratory system. Rest is paramount, but these natural methods can support recovery.

**Honey and Tea**
Honey is a natural cough suppressant. Mix 2 teaspoons of honey with herbal tea or warm water and lemon.

**Steam Inhalation**
Inhaling steam helps thin mucus and drain the sinuses. Pour hot water into a bowl, drape a towel over your head, and breathe deeply for 5–10 minutes.

**Zinc Supplementation**
Research suggests zinc lozenges may shorten the length of a cold if taken within 24 hours of symptoms appearing.`,
  },
  {
    id: "r2",
    title: "Natural Diabetes Management",
    subtitle: "Lifestyle Control",
    summary: "How diet and stress management significantly impact blood sugar.",
    category: "Chronic Care",
    readTimeMin: 7,
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    source: "American Diabetes Association",
    publishedAt: new Date("2024-04-10"),
    fullContent: `Type 2 diabetes management relies heavily on lifestyle.

**Fiber-Rich Diet**
Fiber slows carb digestion and sugar absorption, promoting a more gradual rise in blood sugar levels. Focus on non-starchy vegetables, legumes, and whole grains.

**Apple Cider Vinegar**
Research shows it promotes lower fasting blood sugar levels. Mix 1 tsp in a glass of water before a meal.

**Stress Management**
When stressed, your body releases glucagon and cortisol, causing blood sugar to rise. Yoga and mindfulness can improve insulin secretion.`,
  },
  {
    id: "s1",
    title: "Understanding Family Planning Options",
    subtitle: "Reproductive Health Guide",
    summary: "A comprehensive overview of modern family planning methods.",
    category: "SRH",
    readTimeMin: 5,
    imageUrl: "https://images.unsplash.com/photo-1549480112-9c17adfed579?w=800&q=80",
    source: "Medical Review Board",
    publishedAt: new Date("2024-05-18"),
    fullContent: `Selecting the right birth control depends on your health, lifestyle, and protection needs.

**Condoms**
Provide dual protection against pregnancy and STIs.

**Pills & Implants**
Hormonal methods with high effectiveness when used correctly.

**Natural Methods**
Tracking fertility awareness through temperature and cycle tracking.

Always consult a healthcare provider before starting any family planning method.`,
  },
  {
    id: "m1",
    title: "Managing Workplace Stress",
    subtitle: "Mental Wellness at Work",
    summary: "How to identify and manage burnout before it affects your health.",
    category: "Mental Health",
    readTimeMin: 5,
    imageUrl: "https://images.unsplash.com/photo-1555529733-0e670560f8e1?w=800&q=80",
    videoUrl: "https://www.youtube.com/watch?v=hnpQrMqDoAE",
    source: "Medical Review Board",
    publishedAt: new Date("2024-06-05"),
    fullContent: `Burnout is a state of emotional, physical, and mental exhaustion caused by excessive stress.

**Tip 1**: Take micro-breaks every 90 minutes.

**Tip 2**: Set clear boundaries on your availability outside work hours.

**Tip 3**: Communicate openly with your team about workloads.

**Tip 4**: Practice mindfulness — even 5 minutes of focused breathing can significantly reduce stress hormones.`,
  },
  {
    id: "n1",
    title: "Building a Balanced Plate",
    subtitle: "Nutrition Fundamentals",
    summary: "The foundation of a healthy diet explained simply.",
    category: "Nutrition",
    readTimeMin: 4,
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
    source: "Medical Review Board",
    publishedAt: new Date("2024-07-12"),
    fullContent: `The foundation of a healthy diet is a balanced plate.

Fill half your plate with vegetables and fruits, one quarter with lean protein, and one quarter with whole grains. Avoid highly processed sugars to maintain steady energy levels.

**Key nutrients to focus on:**
- Iron (spinach, lean meat, legumes)
- Calcium (dairy, fortified foods)
- Vitamin D (sunlight, fatty fish)
- Omega-3 (fish, flaxseed, walnuts)`,
  },
  // Mother & Babies
  {
    id: "mb1",
    title: "Postpartum Care Essentials",
    subtitle: "Taking care of yourself after childbirth",
    summary: "Key steps and symptoms to watch out for during postpartum recovery.",
    category: "Mother & Babies",
    readTimeMin: 4,
    imageUrl: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80",
    source: "Maternal Health Association",
    publishedAt: new Date("2024-08-05"),
    fullContent: `Recovering from childbirth takes time and patience. Ensure you get plenty of rest, stay nutrient-rich, and monitor any concerning symptoms.

Always speak with your healthcare provider about post-birth bleeding, physical recovery, and your mental well-being.

**Key postpartum tips:**
- Rest whenever baby sleeps
- Stay hydrated (especially if breastfeeding)
- Eat iron-rich foods to rebuild blood supply
- Seek support for postpartum mood changes`,
  },
  {
    id: "mb2",
    title: "First Foods for Your Baby",
    subtitle: "Navigating the transition to solids",
    summary: "A quick guide on when and how to start feeding your baby solid foods safely.",
    category: "Mother & Babies",
    readTimeMin: 3,
    imageUrl: "https://images.unsplash.com/photo-1453227588063-bb302b62f50b?w=800&q=80",
    source: "Pediatrics Institute",
    publishedAt: new Date("2024-08-20"),
    fullContent: `The American Academy of Pediatrics recommends starting solid foods around 6 months of age, when the baby shows signs of readiness (like sitting up and showing interest).

Introduce one single-ingredient food at a time, such as pureed vegetables or iron-fortified cereals.

**Signs of readiness:**
- Baby can sit up with minimal support
- Baby shows interest in food
- Baby can hold head steady
- Loss of tongue-thrust reflex`,
  },
  // Did You Know?
  {
    id: "dy1",
    title: "Raw Onions & Lungs",
    subtitle: "Nature's Antihistamine",
    summary: "Eating raw onions can help clear airways due to rich Quercetin content.",
    category: "Did You Know?",
    readTimeMin: 2,
    imageUrl: "https://images.unsplash.com/photo-1620574387735-3624d75b2dbc?w=800&q=80",
    source: "Am. J. Physiol.",
    publishedAt: new Date("2024-09-01"),
    fullContent: `Did you know that eating raw onions can help with respiratory issues?

**The Science**
Onions, specifically red onions, are one of the highest food sources of Quercetin — a powerful antioxidant flavonoid that acts as a natural antihistamine and anti-inflammatory agent.

**The Research**
A study published in the American Journal of Physiology found that Quercetin helps relax the airway muscles (bronchodilation), beneficial for people suffering from asthma or bronchitis.

**How to Consume**
To get the maximum benefit, onions should be eaten raw. Cooking can degrade some of the compounds.`,
  },
  {
    id: "dy2",
    title: "Garlic as Antibiotic",
    subtitle: "Ancient Defense",
    summary: "Garlic releases Allicin when crushed, a mighty antimicrobial compound.",
    category: "Did You Know?",
    readTimeMin: 2,
    imageUrl: "https://images.unsplash.com/photo-1615485925763-867862880b1a?w=800&q=80",
    source: "J. Antimicrobial Chemotherapy",
    publishedAt: new Date("2024-09-15"),
    fullContent: `Did you know garlic was used in World War I to treat gangrene?

**The Science**
When a garlic clove is crushed or chewed, it releases a compound called Allicin. This serves as a defense mechanism for the plant against pests, but for humans it has potent antibacterial properties.

**The Research**
Studies have shown garlic to be effective against a wide spectrum of bacteria, including Salmonella and E. coli. Garlic extract can inhibit bacterial growth to a similar degree as some standard antibiotics.

**Tip**
Let crushed garlic sit for 10 minutes before cooking. This allows the enzymatic reaction that creates Allicin to fully occur.`,
  },
];

// ── Pharmacists ───────────────────────────────
export const mockPharmacists: Pharmacist[] = [
  {
    id: "ph1",
    name: "Dr. Emmanuel Niyomugaba",
    specialty: "Clinical Pharmacology",
    imageUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80",
    organization: "HealthPlus Pharmacy",
    status: "available",
    yearsExperience: 8,
    rating: 4.9,
  },
  {
    id: "ph2",
    name: "Sandrine Mukamana",
    specialty: "Pediatric Pharmacy",
    imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80",
    organization: "KG Pharmacy",
    status: "busy",
    yearsExperience: 5,
    rating: 4.7,
  },
  {
    id: "ph3",
    name: "Pierre Habimana",
    specialty: "General Pharmacy",
    imageUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80",
    organization: "Central Medical Hub",
    status: "available",
    yearsExperience: 12,
    rating: 4.8,
  },
  {
    id: "ph4",
    name: "Dr. Claudine Umubyeyi",
    specialty: "Oncology Pharmacy",
    imageUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80",
    organization: "King Faisal Hospital Pharmacy",
    status: "available",
    yearsExperience: 10,
    rating: 4.9,
  },
  {
    id: "ph5",
    name: "Jean-Baptiste Ndayisaba",
    specialty: "Infectious Disease Pharmacy",
    imageUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80",
    organization: "CHUK Pharmacy",
    status: "offline",
    yearsExperience: 7,
    rating: 4.6,
  },
  {
    id: "ph6",
    name: "Ange Uwimana",
    specialty: "Nutrition & Supplement Advisory",
    imageUrl: "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&q=80",
    organization: "Wellness Hub Rwanda",
    status: "available",
    yearsExperience: 4,
    rating: 4.8,
  },
];

// ── Pharmacist Bookings ───────────────────────
export const mockBookings: PharmacistBooking[] = [
  {
    id: "b1",
    pharmacistId: "ph1",
    pharmacistName: "Dr. Emmanuel Niyomugaba",
    type: "General Consultation",
    date: new Date(Date.now() + 2 * 24 * 3600000).toISOString(),
    time: "10:00 AM",
    notes: "Follow up on diabetes management and Metformin dosage review",
    status: "Confirmed",
  },
];

// ── Pharmacies ────────────────────────────────
export const mockPharmacies: Pharmacy[] = [
  {
    id: "p1",
    name: "FARUMASI Pharmacy",
    locationName: "Kigali Heights, KG 7 Ave",
    coordinates: [-1.9540, 30.0926],
    supportedInsurances: ["RSSB", "UAP", "MMI"],
    isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&q=80",
    province: "Kigali City",
    district: "Gasabo",
  },
  {
    id: "p2",
    name: "City Chemist",
    locationName: "UTC Building, City Center",
    coordinates: [-1.9441, 30.0619],
    supportedInsurances: ["RSSB", "RADIANT"],
    isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&q=80",
    province: "Kigali City",
    district: "Nyarugenge",
  },
  {
    id: "p3",
    name: "HealthPlus Nyamirambo",
    locationName: "Nyamirambo Market",
    coordinates: [-1.9804, 30.0416],
    supportedInsurances: ["RSSB", "UAP"],
    isOpen: true,
    imageUrl: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600&q=80",
    province: "Kigali City",
    district: "Nyarugenge",
  },
  {
    id: "p4",
    name: "Remera Modern Pharmacy",
    locationName: "Giporoso, Remera",
    coordinates: [-1.9610, 30.1118],
    supportedInsurances: ["RSSB", "MMI"],
    isOpen: false,
    imageUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&q=80",
    province: "Kigali City",
    district: "Gasabo",
  },
];

// ── Mock Digital Prescriptions ────────────────
export const mockDigitalPrescriptions: DigitalPrescription[] = [
  {
    id: "rx-002",
    patientId: "u1",
    doctorName: "Dr. Eric Nshimiyimana",
    hospitalName: "King Faisal Hospital",
    diagnosis: "Upper Respiratory Tract Infection",
    items: [
      { id: "rxi-001", medicineName: "Amoxicillin", strength: "500mg", dose: "1 capsule", frequency: "3x daily", duration: "7 days", quantity: 21 },
      { id: "rxi-002", medicineName: "Paracetamol", strength: "500mg", dose: "2 tablets", frequency: "3x daily", duration: "5 days", quantity: 30 },
    ],
    status: "sent_to_patient",
    issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    qrCode: "RX-002-QR",
  },
  {
    id: "rx-004",
    patientId: "u1",
    doctorName: "Dr. Solange Ingabire",
    hospitalName: "CHUK",
    diagnosis: "Asthma — Maintenance",
    items: [
      { id: "rxi-003", medicineName: "Salbutamol Inhaler", strength: "100mcg", dose: "2 puffs", frequency: "As needed", duration: "30 days", quantity: 1 },
      { id: "rxi-004", medicineName: "Beclomethasone Inhaler", strength: "50mcg", dose: "2 puffs", frequency: "2x daily", duration: "30 days", quantity: 1 },
    ],
    status: "fulfilled",
    issuedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    qrCode: "RX-004-QR",
    selectedPharmacyId: "p1",
    orderId: "ord-004",
  },
];
