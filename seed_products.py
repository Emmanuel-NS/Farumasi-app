"""Seed product catalogue via the running FastAPI backend (super_admin auto-approves)."""
import sys
import requests

BASE = "http://localhost:8000/api/v1"

# Login as super_admin
r = requests.post(f"{BASE}/auth/login", json={"email": "admin@test.com", "password": "Test1234!"})
r.raise_for_status()
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

PRODUCTS = [
    # Pain Relief
    {"name": "Paracetamol", "generic_name": "Paracetamol", "category": "Pain Relief", "dosage_form": "Tablet", "strength": "500mg", "manufacturer": "PharmaCo", "prescription_required": False, "description": "Relieves mild to moderate pain and reduces fever.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Ibuprofen", "generic_name": "Ibuprofen", "category": "Pain Relief", "dosage_form": "Tablet", "strength": "400mg", "manufacturer": "MediLab", "prescription_required": False, "description": "Anti-inflammatory pain reliever for headaches, muscle pain, and fever.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Diclofenac Gel", "generic_name": "Diclofenac Sodium", "category": "Pain Relief", "dosage_form": "Gel", "strength": "1%", "manufacturer": "TopicaLab", "prescription_required": False, "description": "Topical gel for joint and muscle pain relief.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},

    # Antibiotics
    {"name": "Amoxicillin", "generic_name": "Amoxicillin", "category": "Antibiotics", "dosage_form": "Capsule", "strength": "500mg", "manufacturer": "BioMed", "prescription_required": True, "description": "Broad-spectrum antibiotic for bacterial infections.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Azithromycin", "generic_name": "Azithromycin", "category": "Antibiotics", "dosage_form": "Tablet", "strength": "250mg", "manufacturer": "BioMed", "prescription_required": True, "description": "Antibiotic used to treat respiratory and skin infections.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Metronidazole", "generic_name": "Metronidazole", "category": "Antibiotics", "dosage_form": "Tablet", "strength": "400mg", "manufacturer": "GenePharma", "prescription_required": True, "description": "Antibiotic effective against anaerobic bacteria and parasites.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},

    # Vitamins
    {"name": "Vitamin C", "generic_name": "Ascorbic Acid", "category": "Vitamins", "dosage_form": "Tablet", "strength": "1000mg", "manufacturer": "NutriPlus", "prescription_required": False, "description": "Antioxidant vitamin that supports immune function.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Vitamin D3", "generic_name": "Cholecalciferol", "category": "Vitamins", "dosage_form": "Capsule", "strength": "1000 IU", "manufacturer": "NutriPlus", "prescription_required": False, "description": "Supports bone health and immune system.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Multivitamin Complex", "generic_name": "Multivitamin", "category": "Vitamins", "dosage_form": "Tablet", "strength": "Daily dose", "manufacturer": "HealthVit", "prescription_required": False, "description": "Complete daily multivitamin with minerals.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},

    # Cold & Flu
    {"name": "Cetirizine", "generic_name": "Cetirizine HCl", "category": "Cold & Flu", "dosage_form": "Tablet", "strength": "10mg", "manufacturer": "AllerCure", "prescription_required": False, "description": "Non-drowsy antihistamine for allergy and cold symptoms.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Loratadine Syrup", "generic_name": "Loratadine", "category": "Cold & Flu", "dosage_form": "Syrup", "strength": "5mg/5ml", "manufacturer": "PediMed", "prescription_required": False, "description": "Antihistamine syrup suitable for children and adults.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},

    # Malaria
    {"name": "Artemether/Lumefantrine", "generic_name": "Artemether + Lumefantrine", "category": "Malaria", "dosage_form": "Tablet", "strength": "20mg/120mg", "manufacturer": "TropicaLab", "prescription_required": True, "description": "First-line treatment for uncomplicated malaria.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Quinine Sulphate", "generic_name": "Quinine", "category": "Malaria", "dosage_form": "Tablet", "strength": "300mg", "manufacturer": "TropicaLab", "prescription_required": True, "description": "Anti-malarial for severe and complicated malaria.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},

    # Digestive Health
    {"name": "Omeprazole", "generic_name": "Omeprazole", "category": "Digestive Health", "dosage_form": "Capsule", "strength": "20mg", "manufacturer": "GastroCare", "prescription_required": False, "description": "Proton pump inhibitor for heartburn and acid reflux.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "ORS Sachets", "generic_name": "Oral Rehydration Salts", "category": "Digestive Health", "dosage_form": "Powder", "strength": "One sachet", "manufacturer": "HydraMed", "prescription_required": False, "description": "Oral rehydration solution for diarrhoea and dehydration.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},

    # Chronic Care
    {"name": "Amlodipine", "generic_name": "Amlodipine Besylate", "category": "Chronic Care", "dosage_form": "Tablet", "strength": "5mg", "manufacturer": "CardioMed", "prescription_required": True, "description": "Calcium channel blocker for hypertension.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Metformin", "generic_name": "Metformin HCl", "category": "Diabetes", "dosage_form": "Tablet", "strength": "500mg", "manufacturer": "DiabetaCare", "prescription_required": True, "description": "First-line medication for type 2 diabetes management.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Atorvastatin", "generic_name": "Atorvastatin", "category": "Chronic Care", "dosage_form": "Tablet", "strength": "20mg", "manufacturer": "CardioMed", "prescription_required": True, "description": "Statin for lowering cholesterol and reducing cardiovascular risk.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},

    # Skincare
    {"name": "Hydrocortisone Cream", "generic_name": "Hydrocortisone", "category": "Skincare", "dosage_form": "Cream", "strength": "1%", "manufacturer": "DermaCare", "prescription_required": False, "description": "Mild corticosteroid cream for skin inflammation and itching.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Clotrimazole Cream", "generic_name": "Clotrimazole", "category": "Skincare", "dosage_form": "Cream", "strength": "1%", "manufacturer": "MycoMed", "prescription_required": False, "description": "Antifungal cream for ringworm, athlete's foot, and thrush.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},

    # First Aid
    {"name": "Povidone Iodine", "generic_name": "Povidone Iodine", "category": "First Aid", "dosage_form": "Solution", "strength": "10%", "manufacturer": "WoundCare", "prescription_required": False, "description": "Antiseptic solution for wound cleaning and disinfection.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Sterile Gauze Swabs", "generic_name": "Gauze", "category": "First Aid", "dosage_form": "Dressing", "strength": "10cm x 10cm", "manufacturer": "MedSupply", "prescription_required": False, "description": "Sterile gauze for wound dressing and first aid.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},

    # Mother & Baby
    {"name": "Folic Acid", "generic_name": "Folic Acid", "category": "Mother & Baby", "dosage_form": "Tablet", "strength": "5mg", "manufacturer": "MaternaCare", "prescription_required": False, "description": "Essential supplement for pregnancy to prevent neural tube defects.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
    {"name": "Iron + Folic Acid", "generic_name": "Ferrous Sulphate + Folic Acid", "category": "Mother & Baby", "dosage_form": "Tablet", "strength": "200mg/0.4mg", "manufacturer": "MaternaCare", "prescription_required": False, "description": "Combined iron and folic acid supplement for pregnancy.", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80"},
]

created = 0
skipped = 0
for p in PRODUCTS:
    resp = requests.post(f"{BASE}/products/", json=p, headers=headers)
    if resp.status_code == 201:
        created += 1
        print(f"  ✓ {p['name']}")
    else:
        skipped += 1
        print(f"  ✗ {p['name']} → {resp.status_code}: {resp.text[:80]}")

print(f"\nDone: {created} created, {skipped} failed")
