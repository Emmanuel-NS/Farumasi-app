"""
Seed script for FARUMASI — creates demo users and entities.

Usage (from farumasi_api/):
    python scripts/seed.py
"""
# NOTE: This file is fully rewritten to match the actual SQLAlchemy models.

import asyncio
import sys
import os
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.core.security import hash_password
from app.core.constants import (
    UserRole, UserStatus, EntityStatus,
    ProductApprovalStatus, ListingAvailability, PrescriptionType, PrescriptionStatus,
)
from app.models.user import User
from app.models.patient import PatientProfile, Address
from app.models.doctor import DoctorProfile
from app.models.pharmacist import PharmacistProfile
from app.models.rider import RiderProfile
from app.models.hospital import Hospital
from app.models.pharmacy import Pharmacy
from app.models.partner import PartnerCompany
from app.models.product import ProductCatalogueItem, ProductListing
from app.models.prescription import DigitalPrescription, PrescriptionItem
from app.models.article import HealthArticle
import app.models  # noqa — ensure all models are registered
from app.core.constants import VerificationStatus, ArticleStatus
from datetime import datetime, timezone

DEMO_USERS = [
    {
        "email": "admin@farumasi.com",
        "password": "Admin@12345",
        "full_name": "Super Admin",
        "role": UserRole.SUPER_ADMIN,
    },
    # Doctors
    {
        "email": "doctor@farumasi.com",
        "password": "Doctor@12345",
        "full_name": "Dr. Amara Nziza",
        "role": UserRole.DOCTOR,
        "phone": "+250788000001",
    },
    {
        "email": "doctor2@farumasi.com",
        "password": "Doctor@12345",
        "full_name": "Dr. Chantal Mukeshimana",
        "role": UserRole.DOCTOR,
        "phone": "+250788000011",
    },
    # Patients
    {
        "email": "patient@farumasi.com",
        "password": "Patient@12345",
        "full_name": "Jean Mugabo",
        "role": UserRole.PATIENT,
        "phone": "+250788000002",
    },
    {
        "email": "patient2@farumasi.com",
        "password": "Patient@12345",
        "full_name": "Amina Uwase",
        "role": UserRole.PATIENT,
        "phone": "+250788000012",
    },
    {
        "email": "patient3@farumasi.com",
        "password": "Patient@12345",
        "full_name": "Patrick Nzeyimana",
        "role": UserRole.PATIENT,
        "phone": "+250788000013",
    },
    # Pharmacists
    {
        "email": "pharmacist@farumasi.com",
        "password": "Pharmacist@12345",
        "full_name": "Grace Uwimana",
        "role": UserRole.PHARMACIST,
        "phone": "+250788000003",
    },
    {
        "email": "pharmacist2@farumasi.com",
        "password": "Pharmacist@12345",
        "full_name": "Dr. Olivier Habimana",
        "role": UserRole.PHARMACIST,
        "phone": "+250788000014",
    },
    {
        "email": "pharmacist3@farumasi.com",
        "password": "Pharmacist@12345",
        "full_name": "Marie-Claire Ineza",
        "role": UserRole.PHARMACIST,
        "phone": "+250788000015",
    },
    # Pharmacy admin
    {
        "email": "pharmacy_admin@farumasi.com",
        "password": "Pharmacy@12345",
        "full_name": "Pharma Owner",
        "role": UserRole.PHARMACY_ADMIN,
        "phone": "+250788000004",
    },
    {
        "email": "pharmacy_admin2@farumasi.com",
        "password": "Pharmacy@12345",
        "full_name": "Thierry Rugamba",
        "role": UserRole.PHARMACY_ADMIN,
        "phone": "+250788000016",
    },
    {
        "email": "partner_admin@farumasi.com",
        "password": "Partner@12345",
        "full_name": "Partner Admin",
        "role": UserRole.PARTNER_COMPANY_ADMIN,
        "phone": "+250788000005",
    },
    {
        "email": "rider@farumasi.com",
        "password": "Rider@12345",
        "full_name": "Bruno Nkurunziza",
        "role": UserRole.RIDER,
        "phone": "+250788000006",
    },
    {
        "email": "rider2@farumasi.com",
        "password": "Rider@12345",
        "full_name": "Innocent Mugisha",
        "role": UserRole.RIDER,
        "phone": "+250788000017",
    },
    {
        "email": "hospital_admin@farumasi.com",
        "password": "Hospital@12345",
        "full_name": "Honore Habimana",
        "role": UserRole.HOSPITAL_ADMIN,
        "phone": "+250788000007",
    },
    {
        "email": "finance@farumasi.com",
        "password": "Finance@12345",
        "full_name": "Finance Admin",
        "role": UserRole.FINANCE_ADMIN,
        "phone": "+250788000020",
    },
    {
        "email": "operations@farumasi.com",
        "password": "Operations@12345",
        "full_name": "Operations Admin",
        "role": UserRole.OPERATIONS_ADMIN,
        "phone": "+250788000021",
    },
    {
        "email": "compliance@farumasi.com",
        "password": "Compliance@12345",
        "full_name": "Compliance Admin",
        "role": UserRole.COMPLIANCE_ADMIN,
        "phone": "+250788000022",
    },
]

DEMO_PRODUCTS = [
    # ── Analgesics / Pain Relief ──────────────────────────────────────────
    {
        "name": "Paracetamol 500mg", "generic_name": "Paracetamol",
        "dosage_form": "Tablet", "strength": "500mg",
        "prescription_required": False, "category": "Analgesics",
        "manufacturer": "Sulfo Industries Rwanda",
        "description": "First-line analgesic and antipyretic for mild to moderate pain and fever.",
    },
    {
        "name": "Ibuprofen 400mg", "generic_name": "Ibuprofen",
        "dosage_form": "Tablet", "strength": "400mg",
        "prescription_required": False, "category": "Analgesics",
        "manufacturer": "Strides Pharma",
        "description": "NSAID for pain relief, fever, and inflammation.",
    },
    {
        "name": "Diclofenac 50mg", "generic_name": "Diclofenac Sodium",
        "dosage_form": "Tablet", "strength": "50mg",
        "prescription_required": False, "category": "Analgesics",
        "manufacturer": "Novartis",
        "description": "Anti-inflammatory analgesic for musculoskeletal and joint pain.",
    },
    {
        "name": "Tramadol 50mg", "generic_name": "Tramadol HCl",
        "dosage_form": "Capsule", "strength": "50mg",
        "prescription_required": True, "category": "Analgesics",
        "manufacturer": "Grünenthal",
        "description": "Opioid analgesic for moderate to severe pain.",
    },
    # ── Antibiotics ───────────────────────────────────────────────────────
    {
        "name": "Amoxicillin 500mg", "generic_name": "Amoxicillin",
        "dosage_form": "Capsule", "strength": "500mg",
        "prescription_required": True, "category": "Antibiotics",
        "manufacturer": "GSK",
        "description": "Broad-spectrum penicillin antibiotic for respiratory, ear, and urinary infections.",
    },
    {
        "name": "Ciprofloxacin 500mg", "generic_name": "Ciprofloxacin",
        "dosage_form": "Tablet", "strength": "500mg",
        "prescription_required": True, "category": "Antibiotics",
        "manufacturer": "Bayer",
        "description": "Fluoroquinolone antibiotic for UTIs, typhoid, and GI infections.",
    },
    {
        "name": "Metronidazole 400mg", "generic_name": "Metronidazole",
        "dosage_form": "Tablet", "strength": "400mg",
        "prescription_required": True, "category": "Antibiotics",
        "manufacturer": "Aventis Pharma",
        "description": "Antibiotic and antiprotozoal for anaerobic bacterial and parasitic infections.",
    },
    {
        "name": "Azithromycin 500mg", "generic_name": "Azithromycin",
        "dosage_form": "Tablet", "strength": "500mg",
        "prescription_required": True, "category": "Antibiotics",
        "manufacturer": "Pfizer",
        "description": "Macrolide antibiotic for respiratory tract infections, STIs, and skin infections.",
    },
    {
        "name": "Doxycycline 100mg", "generic_name": "Doxycycline Hyclate",
        "dosage_form": "Capsule", "strength": "100mg",
        "prescription_required": True, "category": "Antibiotics",
        "manufacturer": "Actavis",
        "description": "Tetracycline antibiotic used for malaria prophylaxis, chest infections, and STIs.",
    },
    # ── Antimalarials ─────────────────────────────────────────────────────
    {
        "name": "Artemether/Lumefantrine 20/120mg", "generic_name": "Artemether+Lumefantrine",
        "dosage_form": "Tablet", "strength": "20/120mg",
        "prescription_required": True, "category": "Antimalarials",
        "manufacturer": "Novartis (Coartem)",
        "description": "First-line ACT treatment for uncomplicated Plasmodium falciparum malaria.",
    },
    {
        "name": "Quinine Sulphate 300mg", "generic_name": "Quinine Sulphate",
        "dosage_form": "Tablet", "strength": "300mg",
        "prescription_required": True, "category": "Antimalarials",
        "manufacturer": "Guilini Pharma",
        "description": "Antimalarial for treatment of severe and complicated malaria.",
    },
    # ── Antidiabetics ─────────────────────────────────────────────────────
    {
        "name": "Metformin 500mg", "generic_name": "Metformin HCl",
        "dosage_form": "Tablet", "strength": "500mg",
        "prescription_required": True, "category": "Antidiabetics",
        "manufacturer": "Merck",
        "description": "First-line oral antidiabetic for type 2 diabetes; improves insulin sensitivity.",
    },
    {
        "name": "Glibenclamide 5mg", "generic_name": "Glibenclamide",
        "dosage_form": "Tablet", "strength": "5mg",
        "prescription_required": True, "category": "Antidiabetics",
        "manufacturer": "Sanofi",
        "description": "Sulfonylurea used to lower blood glucose in type 2 diabetes.",
    },
    # ── Antihypertensives / Cardiovascular ────────────────────────────────
    {
        "name": "Amlodipine 5mg", "generic_name": "Amlodipine Besylate",
        "dosage_form": "Tablet", "strength": "5mg",
        "prescription_required": True, "category": "Antihypertensives",
        "manufacturer": "Pfizer",
        "description": "Calcium channel blocker for hypertension and angina.",
    },
    {
        "name": "Lisinopril 10mg", "generic_name": "Lisinopril",
        "dosage_form": "Tablet", "strength": "10mg",
        "prescription_required": True, "category": "Antihypertensives",
        "manufacturer": "AstraZeneca",
        "description": "ACE inhibitor for hypertension, heart failure, and post-MI management.",
    },
    {
        "name": "Hydrochlorothiazide 25mg", "generic_name": "Hydrochlorothiazide",
        "dosage_form": "Tablet", "strength": "25mg",
        "prescription_required": True, "category": "Antihypertensives",
        "manufacturer": "Novartis",
        "description": "Thiazide diuretic used as add-on therapy for hypertension.",
    },
    # ── Gastrointestinal ──────────────────────────────────────────────────
    {
        "name": "Omeprazole 20mg", "generic_name": "Omeprazole",
        "dosage_form": "Capsule", "strength": "20mg",
        "prescription_required": False, "category": "Gastrointestinal",
        "manufacturer": "AstraZeneca",
        "description": "Proton pump inhibitor for acid reflux, gastric ulcers, and GERD.",
    },
    {
        "name": "Oral Rehydration Salts", "generic_name": "ORS (Glucose-Electrolyte)",
        "dosage_form": "Sachet", "strength": "27.9g/sachet",
        "prescription_required": False, "category": "Gastrointestinal",
        "manufacturer": "Unicef/WHO Standard",
        "description": "First-line treatment for dehydration from diarrhea and vomiting.",
    },
    {
        "name": "Mebendazole 500mg", "generic_name": "Mebendazole",
        "dosage_form": "Tablet", "strength": "500mg",
        "prescription_required": False, "category": "Gastrointestinal",
        "manufacturer": "Janssen",
        "description": "Anthelmintic for intestinal worm infections (roundworm, hookworm, whipworm).",
    },
    # ── Respiratory ───────────────────────────────────────────────────────
    {
        "name": "Salbutamol Inhaler 100mcg", "generic_name": "Salbutamol",
        "dosage_form": "Inhaler", "strength": "100mcg/dose",
        "prescription_required": True, "category": "Respiratory",
        "manufacturer": "GSK (Ventolin)",
        "description": "Short-acting bronchodilator for asthma and COPD symptom relief.",
    },
    {
        "name": "Beclomethasone Inhaler 200mcg", "generic_name": "Beclomethasone Dipropionate",
        "dosage_form": "Inhaler", "strength": "200mcg/dose",
        "prescription_required": True, "category": "Respiratory",
        "manufacturer": "Chiesi",
        "description": "Inhaled corticosteroid for maintenance therapy in asthma.",
    },
    # ── Vitamins & Supplements ────────────────────────────────────────────
    {
        "name": "Vitamin C 500mg", "generic_name": "Ascorbic Acid",
        "dosage_form": "Tablet", "strength": "500mg",
        "prescription_required": False, "category": "Vitamins & Supplements",
        "manufacturer": "Bayer",
        "description": "Essential vitamin for immune support and antioxidant protection.",
    },
    {
        "name": "Vitamin D3 1000IU", "generic_name": "Cholecalciferol",
        "dosage_form": "Tablet", "strength": "1000IU",
        "prescription_required": False, "category": "Vitamins & Supplements",
        "manufacturer": "Solgar",
        "description": "Vitamin D supplement for bone health, immune function, and calcium absorption.",
    },
    {
        "name": "Ferrous Sulphate 200mg", "generic_name": "Ferrous Sulphate",
        "dosage_form": "Tablet", "strength": "200mg",
        "prescription_required": False, "category": "Vitamins & Supplements",
        "manufacturer": "Actavis",
        "description": "Iron supplement for iron-deficiency anaemia and pregnancy supplementation.",
    },
    {
        "name": "Folic Acid 5mg", "generic_name": "Folic Acid",
        "dosage_form": "Tablet", "strength": "5mg",
        "prescription_required": False, "category": "Vitamins & Supplements",
        "manufacturer": "Strides Pharma",
        "description": "B-vitamin supplement for anaemia prevention and neural tube defect prevention in pregnancy.",
    },
    # ── Allergy / Cold ────────────────────────────────────────────────────
    {
        "name": "Cetirizine 10mg", "generic_name": "Cetirizine HCl",
        "dosage_form": "Tablet", "strength": "10mg",
        "prescription_required": False, "category": "Antihistamines",
        "manufacturer": "UCB",
        "description": "Non-drowsy antihistamine for allergic rhinitis, urticaria, and hay fever.",
    },
    {
        "name": "Loratadine 10mg", "generic_name": "Loratadine",
        "dosage_form": "Tablet", "strength": "10mg",
        "prescription_required": False, "category": "Antihistamines",
        "manufacturer": "Schering-Plough",
        "description": "Long-acting antihistamine for allergy symptoms with minimal sedation.",
    },
]

# Stable external images for catalogue items (articles already use Unsplash).
_CATEGORY_PRODUCT_IMAGES = {
    "Analgesics": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
    "Antibiotics": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",
    "Antimalarials": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
    "Antidiabetics": "https://images.unsplash.com/photo-1550572017-4c427d3c8ef2?w=800&q=80",
    "Antihypertensives": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80",
    "Gastrointestinal": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",
    "Respiratory": "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=800&q=80",
    "Vitamins & Supplements": "https://images.unsplash.com/photo-1550572017-edd153b80906?w=800&q=80",
    "Antihistamines": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",
}
_DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80"


def _product_image_url(product_data: dict) -> str:
    if product_data.get("image_url"):
        return product_data["image_url"]
    category = product_data.get("category") or ""
    return _CATEGORY_PRODUCT_IMAGES.get(category, _DEFAULT_PRODUCT_IMAGE)


PHARMACIST_EXTRAS = [
    {
        "email": "pharmacist@farumasi.com",
        "specialization": "Clinical Pharmacy",
        "bio": "Specialist in chronic disease management with 8 years of experience in Rwanda.",
        "years_of_experience": 8,
        "pharmacy_name": "Kigali City Pharmacy",
    },
    {
        "email": "pharmacist2@farumasi.com",
        "specialization": "Infectious Diseases",
        "bio": "Expert in HIV/AIDS treatment protocols and antimalarial therapy.",
        "years_of_experience": 6,
        "pharmacy_name": "Kigali City Pharmacy",
    },
    {
        "email": "pharmacist3@farumasi.com",
        "specialization": "Maternal & Child Health",
        "bio": "Focused on prenatal vitamins, pediatric dosing, and maternal care medications.",
        "years_of_experience": 4,
        "pharmacy_name": "Remera Medicare Pharmacy",
    },
]


async def seed():
    engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as db:
        # ─── Users ───────────────────────────────────────────────────────
        created_users: dict[str, User] = {}
        email_to_user: dict[str, User] = {}
        for ud in DEMO_USERS:
            existing = (await db.execute(select(User).where(User.email == ud["email"]))).scalar_one_or_none()
            if existing:
                created_users[ud["role"]] = existing
                email_to_user[ud["email"]] = existing
                print(f"  [skip] {ud['email']} already exists")
                continue

            user = User(
                email=ud["email"],
                password_hash=hash_password(ud["password"]),
                full_name=ud["full_name"],
                role=ud["role"],
                phone=ud.get("phone"),
                status=UserStatus.ACTIVE,
            )
            db.add(user)
            await db.flush()
            created_users[ud["role"]] = user
            email_to_user[ud["email"]] = user
            print(f"  [+] Created user: {ud['email']}")

        fallback_user = list(created_users.values())[0]

        # ─── Hospital ─────────────────────────────────────────────────────
        hospital_result = await db.execute(select(Hospital).limit(1))
        hospital = hospital_result.scalar_one_or_none()
        if not hospital:
            hospital = Hospital(
                name="King Faisal Hospital",
                address="KG 544 St, Kigali",
                district="Gasabo",
                phone="+250788100001",
                email="info@kfh.rw",
                status=EntityStatus.ACTIVE,
            )
            db.add(hospital)
            await db.flush()
            print(f"  [+] Hospital: {hospital.name}")
        else:
            print(f"  [skip] Hospital already exists")

        # ─── Doctor profiles ──────────────────────────────────────────────
        doctor_emails = ["doctor@farumasi.com", "doctor2@farumasi.com"]
        doctor_specialties = ["General Medicine", "Pediatrics & Obstetrics"]
        for i, email in enumerate(doctor_emails):
            doc_user = email_to_user.get(email)
            if doc_user:
                existing_doc = (await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == doc_user.id))).scalar_one_or_none()
                if not existing_doc:
                    db.add(DoctorProfile(
                        user_id=doc_user.id,
                        hospital_id=hospital.id,
                        specialty=doctor_specialties[i],
                        license_number=f"RWA-DOC-00{i+1}",
                        status=EntityStatus.ACTIVE,
                    ))
                    print(f"  [+] Doctor profile for {email}")

        # ─── Patient profiles ──────────────────────────────────────────────
        patient_data = [
            {"email": "patient@farumasi.com", "dob": date(1993, 5, 20), "gender": "male", "lat": -1.9500, "lon": 30.0600},
            {"email": "patient2@farumasi.com", "dob": date(1990, 8, 14), "gender": "female", "lat": -1.9441, "lon": 30.0619},
            {"email": "patient3@farumasi.com", "dob": date(2000, 3, 7), "gender": "male", "lat": -1.9600, "lon": 30.0500},
        ]
        for pd in patient_data:
            pat_user = email_to_user.get(pd["email"])
            if pat_user:
                existing_pat = (await db.execute(select(PatientProfile).where(PatientProfile.user_id == pat_user.id))).scalar_one_or_none()
                if not existing_pat:
                    patient = PatientProfile(
                        user_id=pat_user.id,
                        date_of_birth=pd["dob"],
                        gender=pd["gender"],
                    )
                    db.add(patient)
                    await db.flush()
                    db.add(Address(
                        patient_id=patient.id,
                        label="Home",
                        line1="KG 11 Ave",
                        district="Gasabo",
                        latitude=pd["lat"],
                        longitude=pd["lon"],
                        is_default=True,
                    ))
                    print(f"  [+] Patient profile for {pd['email']}")

        # ─── Pharmacist profiles ───────────────────────────────────────────
        for extra in PHARMACIST_EXTRAS:
            ph_user = email_to_user.get(extra["email"])
            if ph_user:
                existing_ph = (await db.execute(select(PharmacistProfile).where(PharmacistProfile.user_id == ph_user.id))).scalar_one_or_none()
                if not existing_ph:
                    db.add(PharmacistProfile(
                        user_id=ph_user.id,
                        license_number=f"RWA-PHARM-{extra['email'][:4].upper()}",
                        specialization=extra["specialization"],
                        bio=extra["bio"],
                        years_of_experience=extra["years_of_experience"],
                        status=EntityStatus.ACTIVE,
                    ))
                    print(f"  [+] Pharmacist profile for {extra['email']}")
                else:
                    # Update specialization/bio if missing
                    if not existing_ph.specialization:
                        existing_ph.specialization = extra["specialization"]
                        existing_ph.bio = extra["bio"]
                        existing_ph.years_of_experience = extra["years_of_experience"]
                        print(f"  [update] Pharmacist profile enriched for {extra['email']}")

        # ─── Rider profiles ────────────────────────────────────────────────
        for email in ["rider@farumasi.com", "rider2@farumasi.com"]:
            rider_user = email_to_user.get(email)
            if rider_user:
                existing_rider = (await db.execute(select(RiderProfile).where(RiderProfile.user_id == rider_user.id))).scalar_one_or_none()
                if not existing_rider:
                    db.add(RiderProfile(user_id=rider_user.id, vehicle_type="motorcycle"))
                    print(f"  [+] Rider profile for {email}")

        # ─── Pharmacies ────────────────────────────────────────────────────
        pharmacies_data = [
            {
                "owner_email": "pharmacy_admin@farumasi.com",
                "name": "Kigali City Pharmacy",
                "address": "KN 3 Ave, Kigali",
                "district": "Nyarugenge",
                "lat": -1.9441, "lon": 30.0619,
                "phone": "+250788200001",
                "email": "info@kigalicitypharm.rw",
            },
            {
                "owner_email": "pharmacy_admin2@farumasi.com",
                "name": "Remera Medicare Pharmacy",
                "address": "KG 15 Ave, Remera",
                "district": "Gasabo",
                "lat": -1.9560, "lon": 30.1052,
                "phone": "+250788200002",
                "email": "info@remerapharm.rw",
            },
        ]
        seeded_pharmacies = []
        for phd in pharmacies_data:
            owner = email_to_user.get(phd["owner_email"]) or fallback_user
            existing_pharm = (await db.execute(select(Pharmacy).where(Pharmacy.name == phd["name"]).limit(1))).scalar_one_or_none()
            if not existing_pharm:
                pharm = Pharmacy(
                    owner_user_id=owner.id,
                    name=phd["name"],
                    address=phd["address"],
                    district=phd["district"],
                    latitude=phd["lat"],
                    longitude=phd["lon"],
                    phone=phd["phone"],
                    email=phd["email"],
                    is_open=True,
                    accepts_delivery=True,
                    status=EntityStatus.ACTIVE,
                )
                db.add(pharm)
                await db.flush()
                seeded_pharmacies.append(pharm)
                print(f"  [+] Pharmacy: {phd['name']}")
            else:
                seeded_pharmacies.append(existing_pharm)
                print(f"  [skip] Pharmacy {phd['name']} exists")

        pharmacy = seeded_pharmacies[0] if seeded_pharmacies else None

        # ─── Link pharmacist staff to their pharmacy ──────────────────────
        pharmacies_by_name = {p.name: p for p in seeded_pharmacies}
        for extra in PHARMACIST_EXTRAS:
            target_name = extra.get("pharmacy_name")
            if not target_name:
                continue
            target_pharm = pharmacies_by_name.get(target_name)
            ph_user = email_to_user.get(extra["email"])
            if not (target_pharm and ph_user):
                continue
            profile = (await db.execute(
                select(PharmacistProfile).where(PharmacistProfile.user_id == ph_user.id)
            )).scalar_one_or_none()
            if profile and profile.pharmacy_id != target_pharm.id:
                profile.pharmacy_id = target_pharm.id
                print(f"  [link] {extra['email']} -> {target_name}")

        # ─── Partner company ──────────────────────────────────────────────
        partner_admin_user = email_to_user.get("partner_admin@farumasi.com")
        medihub = (
            await db.execute(select(PartnerCompany).where(PartnerCompany.name == "MediHub Rwanda").limit(1))
        ).scalar_one_or_none()
        if not medihub:
            partner_company = PartnerCompany(
                owner_user_id=(partner_admin_user or fallback_user).id,
                name="MediHub Rwanda",
                business_registration_number="RWA-PART-001",
                address="KG 7 Ave, Kigali",
                district="Gasabo",
                latitude=-1.9350,
                longitude=30.0640,
                phone="+250788300001",
                email="info@medihub.rw",
                status=EntityStatus.ACTIVE,
            )
            db.add(partner_company)
            await db.flush()
            print(f"  [+] Partner: {partner_company.name}")
        else:
            partner_company = medihub
            if partner_admin_user and partner_company.owner_user_id != partner_admin_user.id:
                partner_company.owner_user_id = partner_admin_user.id
                print(f"  [fix] Partner owner linked to partner_admin@farumasi.com")
            print(f"  [skip] Partner MediHub Rwanda exists")

        # Legacy MVP rows: partner companies named like pharmacies — hide from patient store
        if seeded_pharmacies:
            pharm_names = [p.name for p in seeded_pharmacies]
            legacy_dupes = (
                await db.execute(
                    select(PartnerCompany).where(
                        PartnerCompany.name.in_(pharm_names),
                        PartnerCompany.id != partner_company.id,
                    )
                )
            ).scalars().all()
            for dup in legacy_dupes:
                dup.status = EntityStatus.SUSPENDED
                dup_listings = (
                    await db.execute(
                        select(ProductListing).where(ProductListing.partner_company_id == dup.id)
                    )
                ).scalars().all()
                for listing in dup_listings:
                    listing.status = EntityStatus.SUSPENDED
                print(f"  [fix] Suspended duplicate partner '{dup.name}' (use Pharmacy entity instead)")

        # ─── Products + Listings ──────────────────────────────────────────
        # pharmacy[0] = Kigali City Pharmacy  (all products, price tier A)
        # pharmacy[1] = Remera Medicare       (all products, price tier B)
        # partner_company = MediHub Rwanda    (first 15 products, price tier C)
        admin_user = email_to_user.get("admin@farumasi.com") or fallback_user
        pharm2 = seeded_pharmacies[1] if len(seeded_pharmacies) > 1 else None
        seeded_products = []
        for i, pd in enumerate(DEMO_PRODUCTS):
            existing_prod = (await db.execute(select(ProductCatalogueItem).where(ProductCatalogueItem.name == pd["name"]).limit(1))).scalar_one_or_none()
            image_url = _product_image_url(pd)
            if not existing_prod:
                product = ProductCatalogueItem(
                    approval_status=ProductApprovalStatus.APPROVED,
                    created_by_user_id=admin_user.id,
                    image_url=image_url,
                    **pd,
                )
                db.add(product)
                await db.flush()
                seeded_products.append(product)
            else:
                if not existing_prod.image_url:
                    existing_prod.image_url = image_url
                seeded_products.append(existing_prod)

        # Ensure every product has a listing for pharmacy[0]
        if pharmacy:
            for i, product in enumerate(seeded_products):
                existing_l = (await db.execute(
                    select(ProductListing)
                    .where(ProductListing.pharmacy_id == pharmacy.id, ProductListing.product_id == product.id)
                )).scalar_one_or_none()
                if not existing_l:
                    db.add(ProductListing(
                        pharmacy_id=pharmacy.id,
                        product_id=product.id,
                        price=round(1500 + (i * 250), 2),
                        stock_quantity=100,
                        expiry_date=date.today() + timedelta(days=365),
                        availability_status=ListingAvailability.AVAILABLE,
                        status=EntityStatus.ACTIVE,
                    ))

        # Ensure every product has a listing for pharmacy[1] (Remera Medicare)
        if pharm2:
            for i, product in enumerate(seeded_products):
                existing_l = (await db.execute(
                    select(ProductListing)
                    .where(ProductListing.pharmacy_id == pharm2.id, ProductListing.product_id == product.id)
                )).scalar_one_or_none()
                if not existing_l:
                    db.add(ProductListing(
                        pharmacy_id=pharm2.id,
                        product_id=product.id,
                        price=round(1600 + (i * 220), 2),
                        stock_quantity=80,
                        expiry_date=date.today() + timedelta(days=400),
                        availability_status=ListingAvailability.AVAILABLE,
                        status=EntityStatus.ACTIVE,
                    ))
            print(f"  [+] Listings ensured for {pharm2.name}")

        # Ensure the partner company has listings for first 15 products
        if partner_company:
            for i, product in enumerate(seeded_products[:15]):
                existing_l = (await db.execute(
                    select(ProductListing)
                    .where(ProductListing.partner_company_id == partner_company.id, ProductListing.product_id == product.id)
                )).scalar_one_or_none()
                if not existing_l:
                    db.add(ProductListing(
                        partner_company_id=partner_company.id,
                        product_id=product.id,
                        price=round(1400 + (i * 230), 2),
                        stock_quantity=200,
                        expiry_date=date.today() + timedelta(days=500),
                        availability_status=ListingAvailability.AVAILABLE,
                        status=EntityStatus.ACTIVE,
                    ))
            print(f"  [+] Listings ensured for partner: {partner_company.name}")

        if seeded_products:
            print(f"  [+] {len(seeded_products)} products seeded/verified with listings")

        # ─── Sample prescriptions (patient-uploaded) ──────────────────────
        patient1_user = email_to_user.get("patient@farumasi.com")
        if patient1_user:
            pat_result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == patient1_user.id))
            pat1 = pat_result.scalar_one_or_none()
            if pat1:
                existing_rx = (await db.execute(
                    select(DigitalPrescription).where(DigitalPrescription.patient_id == pat1.id).limit(1)
                )).scalar_one_or_none()
                if not existing_rx:
                    # Doctor-created prescription
                    doc_user = email_to_user.get("doctor@farumasi.com")
                    doc_result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == doc_user.id)) if doc_user else None
                    doctor = doc_result.scalar_one_or_none() if doc_result else None

                    rx1 = DigitalPrescription(
                        patient_id=pat1.id,
                        doctor_id=doctor.id if doctor else None,
                        hospital_id=hospital.id,
                        prescription_type=PrescriptionType.DOCTOR_CREATED,
                        status=PrescriptionStatus.ACTIVE,
                        diagnosis_notes="Type 2 Diabetes — initial management",
                        notes="Follow up in 4 weeks",
                    )
                    db.add(rx1)
                    await db.flush()
                    db.add(PrescriptionItem(
                        prescription_id=rx1.id,
                        medicine_name="Metformin 500mg",
                        dosage="500mg",
                        frequency="Twice daily",
                        duration="30 days",
                        quantity=60,
                        instructions="Take with food",
                    ))
                    db.add(PrescriptionItem(
                        prescription_id=rx1.id,
                        medicine_name="Amlodipine 5mg",
                        dosage="5mg",
                        frequency="Once daily",
                        duration="30 days",
                        quantity=30,
                        instructions="Take in the morning",
                    ))

                    # Patient-uploaded prescription
                    rx2 = DigitalPrescription(
                        patient_id=pat1.id,
                        prescription_type=PrescriptionType.PATIENT_UPLOADED,
                        status=PrescriptionStatus.ACTIVE,
                        uploaded_file_url=None,
                        notes="Uploaded prescription from hospital visit",
                    )
                    db.add(rx2)
                    print("  [+] Sample prescriptions for patient@farumasi.com")

        # ─── Verify pharmacies + pharmacists ───────────────────────────────
        all_pharmacies = (await db.execute(select(Pharmacy))).scalars().all()
        for pharm in all_pharmacies:
            if pharm.verification_status != VerificationStatus.VERIFIED:
                pharm.verification_status = VerificationStatus.VERIFIED
                print(f"  [update] Verified pharmacy: {pharm.name}")
            if not pharm.license_number:
                pharm.license_number = f"RWA-PHARM-{pharm.name[:4].upper().replace(' ', '')}-001"

        all_pharm_profiles = (await db.execute(select(PharmacistProfile))).scalars().all()
        for pp in all_pharm_profiles:
            if pp.verification_status != VerificationStatus.VERIFIED:
                pp.verification_status = VerificationStatus.VERIFIED
                print(f"  [update] Verified pharmacist profile: {pp.user_id}")

        # ─── Health articles ───────────────────────────────────────────────
        pharmacist1_user = email_to_user.get("pharmacist@farumasi.com")
        pharmacist1_profile = None
        if pharmacist1_user:
            pharmacist1_profile = (await db.execute(
                select(PharmacistProfile).where(PharmacistProfile.user_id == pharmacist1_user.id)
            )).scalar_one_or_none()

        DEMO_ARTICLES = [
            {
                "title": "Understanding Malaria Prevention in Rwanda",
                "slug": "malaria-prevention-rwanda",
                "category": "Infectious Diseases",
                "summary": "Malaria remains a leading health concern in Rwanda. Learn how to protect yourself and your family with the right medications and preventive measures.",
                "content": """Malaria is caused by the Plasmodium parasite transmitted through the bite of infected female Anopheles mosquitoes. In Rwanda, malaria transmission occurs throughout the year, with higher risk during the rainy seasons.

**Key Prevention Strategies**

1. **Use insecticide-treated bed nets (ITNs)**: Sleep under a long-lasting insecticidal net every night, even if you feel well.
2. **Indoor residual spraying (IRS)**: Support household spraying campaigns in your area.
3. **Antimalarial prophylaxis**: Travelers and high-risk individuals should consult a pharmacist about prophylactic medications.
4. **Eliminate standing water**: Mosquitoes breed in stagnant water. Remove buckets, tires, and other water containers from around your home.

**Recognizing Malaria Symptoms**

Early symptoms include fever, chills, headache, muscle aches, and fatigue. Without prompt treatment, malaria can progress to severe disease. If you experience these symptoms, visit a health facility immediately for a malaria rapid diagnostic test (RDT).

**First-Line Treatment**

Artemether-Lumefantrine (Coartem) is Rwanda's first-line treatment for uncomplicated malaria. Always complete the full course even if symptoms improve.

*Consult a Farumasi pharmacist for personalized advice on malaria prevention and treatment.*""",
                "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",
            },
            {
                "title": "Managing Type 2 Diabetes with Diet and Medication",
                "slug": "managing-type-2-diabetes",
                "category": "Chronic Disease",
                "summary": "Type 2 diabetes affects millions across Africa. Discover how lifestyle changes and medication work together for optimal blood sugar control.",
                "content": """Type 2 diabetes is a chronic condition in which the body does not use insulin effectively, leading to elevated blood sugar levels. In Rwanda, the prevalence of diabetes is rising due to urbanization, dietary changes, and sedentary lifestyles.

**Lifestyle Management**

- **Diet**: Reduce intake of refined carbohydrates, sugary drinks, and processed foods. Focus on vegetables, legumes, whole grains, and lean proteins.
- **Physical activity**: Aim for at least 150 minutes of moderate aerobic activity per week. Walking, cycling, and swimming are excellent choices.
- **Weight management**: Even modest weight loss (5–10% of body weight) can significantly improve blood sugar control.

**Medications**

Metformin is typically the first-line medication for type 2 diabetes. It works by reducing glucose production in the liver and improving insulin sensitivity. Other medications may be added as the condition progresses.

**Monitoring**

Regular blood glucose monitoring and HbA1c tests every 3 months help track your progress. Your healthcare team will guide you on target ranges.

**Complications to Watch For**

Uncontrolled diabetes can damage the kidneys, eyes, nerves, and blood vessels. Regular check-ups for blood pressure, cholesterol, kidney function, and eye health are essential.

*Use Farumasi to order your diabetes medications with home delivery and never miss a dose.*""",
                "image_url": "https://images.unsplash.com/photo-1593491205049-7f032d28cf01?w=800",
            },
            {
                "title": "Safe Use of Antibiotics: Why Completing the Course Matters",
                "slug": "safe-antibiotic-use",
                "category": "Antibiotics",
                "summary": "Antibiotic resistance is a growing global threat. Learn why finishing your prescribed course is critical for your health and the community.",
                "content": """Antibiotics are powerful medicines that fight bacterial infections. However, their misuse and overuse have led to antibiotic resistance — one of the most serious threats to global health.

**Why You Must Complete the Full Course**

When you stop taking antibiotics early because you feel better, some bacteria may survive. These surviving bacteria can multiply and become resistant to the antibiotic, making future infections harder to treat.

**Common Antibiotics and Their Uses**

- **Amoxicillin**: Used for chest, ear, throat, and urinary infections
- **Ciprofloxacin**: Used for urinary tract infections, typhoid, and diarrheal diseases
- **Metronidazole**: Used for dental infections, and certain intestinal infections

**What Not to Do**

- Do not share antibiotics with others
- Do not save antibiotics for later use
- Do not demand antibiotics for viral infections like the common cold or flu — antibiotics do not work against viruses

**Side Effects**

Common side effects include nausea, diarrhea, and yeast infections. Serious allergic reactions are rare but require immediate medical attention.

*Farumasi pharmacists can help you understand your antibiotic prescription and ensure you take it correctly.*""",
                "image_url": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800",
            },
            {
                "title": "High Blood Pressure: The Silent Killer You Can Control",
                "slug": "hypertension-control",
                "category": "Cardiovascular",
                "summary": "Hypertension often has no symptoms but dramatically increases risk of stroke and heart disease. Here's what you need to know.",
                "content": """Hypertension (high blood pressure) is often called the 'silent killer' because it rarely causes symptoms until serious damage has occurred. In Rwanda, hypertension prevalence is estimated at around 20% of adults.

**Understanding Blood Pressure Readings**

Blood pressure is measured in millimeters of mercury (mmHg) and written as two numbers:
- **Systolic pressure** (top number): pressure when the heart beats
- **Diastolic pressure** (bottom number): pressure when the heart rests between beats

Normal blood pressure is below 120/80 mmHg. Hypertension is diagnosed at 140/90 mmHg or higher.

**Risk Factors**

- High salt diet
- Physical inactivity
- Obesity
- Excessive alcohol consumption
- Smoking
- Family history of hypertension

**Lifestyle Changes**

The DASH (Dietary Approaches to Stop Hypertension) diet emphasizes fruits, vegetables, whole grains, and low-fat dairy while limiting saturated fats and sodium.

**Medications**

Common antihypertensive medications include:
- **Amlodipine** (calcium channel blocker)
- **Lisinopril** (ACE inhibitor)
- **Hydrochlorothiazide** (diuretic)

These medications are most effective when combined with lifestyle changes.

*Order your blood pressure medications through Farumasi for consistent, on-time delivery to your door.*""",
                "image_url": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800",
            },
            {
                "title": "Child Nutrition and Vitamins: Building Strong Foundations",
                "slug": "child-nutrition-vitamins",
                "category": "Pediatrics",
                "summary": "Proper nutrition in early childhood shapes lifelong health. Discover essential vitamins and nutrients for growing children in Rwanda.",
                "content": """The first 1,000 days of life — from conception to age two — are the most critical for brain development and long-term health. Good nutrition during this period has lifelong benefits.

**Essential Nutrients for Children**

- **Iron**: Critical for brain development and energy. Found in red meat, legumes, and dark leafy vegetables. Iron deficiency anemia is common in Rwanda.
- **Vitamin A**: Supports vision, immune function, and growth. Found in orange-colored fruits/vegetables and leafy greens.
- **Zinc**: Important for immune function and wound healing. Found in meat, shellfish, and legumes.
- **Vitamin D**: Essential for bone development. Sun exposure is the main source.
- **Iodine**: Critical for thyroid function and brain development. Use iodized salt.

**When to Supplement**

Most children who eat a varied diet do not need supplements. However, supplements may be recommended for:
- Exclusively breastfed infants (Vitamin D)
- Children with restricted diets
- Children recovering from illness

**Warning Signs of Malnutrition**

- Slow weight gain or weight loss
- Stunted growth (short for age)
- Frequent infections
- Pale skin or mucous membranes (sign of anemia)

*Farumasi stocks a full range of pediatric vitamins and supplements. Consult our pharmacists for age-appropriate recommendations.*""",
                "image_url": "https://images.unsplash.com/photo-1560472355-536de3962603?w=800",
            },
            {
                "title": "Asthma Management: Living Well with a Respiratory Condition",
                "slug": "asthma-management",
                "category": "Respiratory",
                "summary": "Asthma is manageable with the right treatment plan. Learn how to use your inhaler correctly and avoid common triggers.",
                "content": """Asthma is a chronic respiratory condition characterized by inflammation and narrowing of the airways, causing wheezing, shortness of breath, chest tightness, and coughing.

**Types of Asthma Medications**

1. **Reliever inhalers (rescue medications)**: Used when symptoms occur. Salbutamol (Ventolin) is the most common. These work quickly to open the airways.

2. **Preventer inhalers (controller medications)**: Used daily to reduce airway inflammation and prevent symptoms. Typically contain corticosteroids like beclomethasone.

**How to Use a Metered-Dose Inhaler (MDI) Correctly**

1. Shake the inhaler well
2. Breathe out fully
3. Place the mouthpiece in your mouth, sealing your lips around it
4. Start to breathe in slowly and press the canister down at the same time
5. Continue breathing in slowly and deeply
6. Hold your breath for 10 seconds
7. Breathe out slowly

**Common Triggers**

- Dust mites
- Pollen
- Smoke (tobacco and wood-burning)
- Cold air
- Exercise
- Respiratory infections

**Creating an Asthma Action Plan**

Work with your doctor to create a written asthma action plan that tells you what to do based on your symptoms or peak flow readings.

*Farumasi ensures your inhalers are always available with convenient home delivery.*""",
                "image_url": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800",
            },
        ]

        now = datetime.now(timezone.utc)
        for article_data in DEMO_ARTICLES:
            existing_article = (await db.execute(
                select(HealthArticle).where(HealthArticle.slug == article_data["slug"])
            )).scalar_one_or_none()
            if not existing_article:
                article = HealthArticle(
                    author_pharmacist_id=pharmacist1_profile.id if pharmacist1_profile else None,
                    title=article_data["title"],
                    slug=article_data["slug"],
                    summary=article_data["summary"],
                    content=article_data["content"],
                    category=article_data["category"],
                    image_url=article_data["image_url"],
                    status=ArticleStatus.PUBLISHED,
                    published_at=now,
                )
                db.add(article)
                print(f"  [+] Article: {article_data['title']}")
            else:
                print(f"  [skip] Article already exists: {article_data['slug']}")

        # Normalize legacy order statuses from MVP seed data
        from app.models.order import Order
        from app.core.constants import LEGACY_ORDER_STATUS_MAP
        legacy_fixed = 0
        for legacy, canonical in LEGACY_ORDER_STATUS_MAP.items():
            rows = (
                await db.execute(select(Order).where(Order.order_status == legacy))
            ).scalars().all()
            for order in rows:
                order.order_status = canonical
                legacy_fixed += 1
        if legacy_fixed:
            print(f"  [fix] Normalized {legacy_fixed} legacy order status(es)")

        await db.commit()
        print("\nSeed complete. Demo credentials:")
        for ud in DEMO_USERS:
            print(f"   {ud['email']}  /  {ud['password']}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
