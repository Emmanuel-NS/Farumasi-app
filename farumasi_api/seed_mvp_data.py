"""
MVP Seed Script - Seeds realistic data for all portals
Run: cd farumasi_api && python seed_mvp_data.py
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import random

os.environ['DATABASE_URL'] = 'postgresql+asyncpg://farumasi:farumasi_pass@localhost:5432/farumasi_db'
sys.path.insert(0, '.')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

engine = create_async_engine(os.environ['DATABASE_URL'])
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Key IDs from the database
PARTNER_KIGALI = '7e36f817-5595-4cf3-b0f3-21476204367d'   # Kigali City Pharmacy (partner)
PARTNER_MEDIHUB = 'c996b5e3-7955-4b3c-a407-d7728e48d4d8'  # MediHub Rwanda (partner)
PHARMACY_KIGALI = '03d5fcdd-e5fd-4b36-b17c-f96d6eb35135'  # Kigali City Pharmacy (pharmacy)
PHARMACY_REMERA = '5524db64-1317-487d-a09e-dee16a53b8de'   # Remera Medicare Pharmacy

PATIENT_1 = '574d0e8c-dcf3-4174-8092-f0559a0a7137'  # patient@farumasi.com (patient_profile.id)
PATIENT_2 = '54053750-ac34-442d-9aa3-a02f05360ab7'  # patient2@farumasi.com
PATIENT_3 = '7fadd3c0-cd8a-44da-8422-f3619f86f40c'  # patient3@farumasi.com

PATIENT_USER_1 = 'db23c2a3-1b1e-4515-85ca-fc12a7e65924'  # patient@farumasi.com user.id
PATIENT_USER_2 = '3f56f42f-3e1d-469b-95f5-7fe9f1dd7643'  # patient2@farumasi.com user.id
PATIENT_USER_3 = 'd3db805d-4afd-445c-ac76-05143a6a912b'  # patient3@farumasi.com user.id
PHARMACIST_1 = '27a471f2-05e1-4e50-acf3-c2690a5f15c8'   # pharmacist@farumasi.com user.id
PHARMACIST_2 = 'e5c67a93-bcf9-408e-986c-de9560867103'   # pharmacist2@farumasi.com user.id

def uid():
    return str(uuid.uuid4())

def now():
    return datetime.now(timezone.utc)

def days_ago(n):
    return datetime.now(timezone.utc) - timedelta(days=n)


async def get_listing_ids(session: AsyncSession):
    """Get product listing IDs with their prices."""
    r = await session.execute(text(
        "SELECT id, product_id, price, (SELECT name FROM product_catalogue_items WHERE id=pl.product_id) as name "
        "FROM product_listings pl LIMIT 20"
    ))
    return r.fetchall()


async def seed_orders(session: AsyncSession, listings):
    """Seed realistic orders for partner companies."""
    print("Seeding orders...")
    
    statuses = ['pending', 'confirmed', 'processing', 'completed', 'completed', 'completed', 'cancelled']
    delivery_methods = ['pickup', 'delivery']
    
    order_data = [
        # Partner Kigali orders (pharmacy_admin portal)
        {
            'patient_id': PATIENT_1,
            'partner_company_id': PARTNER_KIGALI,
            'order_status': 'completed',
            'days': 2,
            'total': 8500,
            'items_count': 3,
        },
        {
            'patient_id': PATIENT_2,
            'partner_company_id': PARTNER_KIGALI,
            'order_status': 'completed',
            'days': 4,
            'total': 12000,
            'items_count': 2,
        },
        {
            'patient_id': PATIENT_3,
            'partner_company_id': PARTNER_KIGALI,
            'order_status': 'completed',
            'days': 6,
            'total': 6500,
            'items_count': 1,
        },
        {
            'patient_id': PATIENT_1,
            'partner_company_id': PARTNER_KIGALI,
            'order_status': 'processing',
            'days': 0,
            'total': 9200,
            'items_count': 2,
        },
        {
            'patient_id': PATIENT_2,
            'partner_company_id': PARTNER_KIGALI,
            'order_status': 'confirmed',
            'days': 1,
            'total': 15000,
            'items_count': 4,
        },
        {
            'patient_id': PATIENT_3,
            'partner_company_id': PARTNER_KIGALI,
            'order_status': 'pending',
            'days': 0,
            'total': 5500,
            'items_count': 1,
        },
        # MediHub orders
        {
            'patient_id': PATIENT_1,
            'partner_company_id': PARTNER_MEDIHUB,
            'order_status': 'completed',
            'days': 3,
            'total': 22000,
            'items_count': 5,
        },
        {
            'patient_id': PATIENT_2,
            'partner_company_id': PARTNER_MEDIHUB,
            'order_status': 'completed',
            'days': 7,
            'total': 18500,
            'items_count': 3,
        },
        {
            'patient_id': PATIENT_3,
            'partner_company_id': PARTNER_MEDIHUB,
            'order_status': 'confirmed',
            'days': 1,
            'total': 11000,
            'items_count': 2,
        },
        {
            'patient_id': PATIENT_1,
            'partner_company_id': PARTNER_MEDIHUB,
            'order_status': 'processing',
            'days': 0,
            'total': 7500,
            'items_count': 2,
        },
        # Pharmacy (not partner) orders
        {
            'patient_id': PATIENT_1,
            'pharmacy_id': PHARMACY_REMERA,
            'order_status': 'completed',
            'days': 5,
            'total': 4500,
            'items_count': 1,
        },
        {
            'patient_id': PATIENT_2,
            'pharmacy_id': PHARMACY_REMERA,
            'order_status': 'completed',
            'days': 10,
            'total': 9800,
            'items_count': 2,
        },
    ]
    
    order_ids = []
    for od in order_data:
        order_id = uid()
        order_code = f"ORD-{random.randint(10000, 99999)}"
        created_at = days_ago(od['days'])
        total = od['total']
        delivery_fee = 500 if random.random() > 0.5 else 0
        commission = round(total * 0.05)
        subtotal = total - delivery_fee
        net_amount = total - commission
        
        dm = 'delivery' if delivery_fee > 0 else 'pickup'
        
        partner_id = od.get('partner_company_id')
        pharmacy_id = od.get('pharmacy_id')
        
        await session.execute(text("""
            INSERT INTO orders (
                id, order_code, patient_id, pharmacy_id, partner_company_id,
                order_status, payment_status, delivery_method, delivery_address,
                subtotal, delivery_fee, platform_commission, total_amount, net_partner_amount,
                notes, created_at, updated_at
            ) VALUES (
                :id, :code, :patient_id, :pharmacy_id, :partner_id,
                :status, :pay_status, :dm, :addr,
                :subtotal, :dfee, :commission, :total, :net,
                :notes, :created_at, :created_at
            )
        """), {
            'id': order_id,
            'code': order_code,
            'patient_id': od['patient_id'],
            'pharmacy_id': pharmacy_id,
            'partner_id': partner_id,
            'status': od['order_status'],
            'pay_status': 'paid' if od['order_status'] == 'completed' else 'pending',
            'dm': dm,
            'addr': 'Kigali, Rwanda',
            'subtotal': subtotal,
            'dfee': delivery_fee,
            'commission': commission,
            'total': total,
            'net': net_amount,
            'notes': 'Regular order',
            'created_at': created_at,
        })
        
        # Add 1-3 order items
        for i in range(min(od['items_count'], len(listings))):
            listing = listings[i % len(listings)]
            listing_id, product_id, price, product_name = listing
            qty = random.randint(1, 3)
            item_total = float(price) * qty
            
            await session.execute(text("""
                INSERT INTO order_items (
                    id, order_id, product_listing_id, product_id,
                    product_name, quantity, unit_price, total_price,
                    created_at, updated_at
                ) VALUES (
                    :id, :order_id, :listing_id, :product_id,
                    :name, :qty, :price, :total,
                    :created_at, :created_at
                )
            """), {
                'id': uid(),
                'order_id': order_id,
                'listing_id': listing_id,
                'product_id': product_id,
                'name': product_name or 'Medicine',
                'qty': qty,
                'price': float(price),
                'total': item_total,
                'created_at': created_at,
            })
        
        order_ids.append((order_id, od.get('partner_company_id'), od.get('pharmacy_id'), od['order_status'], total, commission, created_at))
    
    print(f"  Created {len(order_data)} orders")
    return order_ids


async def seed_revenue(session: AsyncSession, order_ids):
    """Seed revenue records for completed orders."""
    print("Seeding revenue records...")
    count = 0
    for order_id, partner_id, pharmacy_id, status, total, commission, created_at in order_ids:
        if status == 'completed':
            net = total - commission
            partner_type = 'partner_company' if partner_id else 'pharmacy'
            await session.execute(text("""
                INSERT INTO revenue_records (
                    id, order_id, partner_type, pharmacy_id, partner_company_id,
                    gross_amount, platform_commission, net_amount, status,
                    created_at, updated_at
                ) VALUES (
                    :id, :order_id, :ptype, :pharm_id, :partner_id,
                    :gross, :commission, :net, :status,
                    :created_at, :created_at
                )
            """), {
                'id': uid(),
                'order_id': order_id,
                'ptype': partner_type,
                'pharm_id': pharmacy_id,
                'partner_id': partner_id,
                'gross': total,
                'commission': commission,
                'net': net,
                'status': 'settled',
                'created_at': created_at,
            })
            count += 1
    print(f"  Created {count} revenue records")


async def seed_product_requests(session: AsyncSession):
    """Seed product requests for pharmacists."""
    print("Seeding product requests...")
    
    requests = [
        {
            'requester_user_id': PHARMACIST_1,
            'requester_type': 'pharmacist',
            'pharmacy_id': PHARMACY_KIGALI,
            'product_name': 'Metformin 850mg',
            'category': 'Antidiabetic',
            'product_type': 'medicine',
            'manufacturer': 'Sun Pharma',
            'brand': 'Glucophage',
            'description': 'Antidiabetic medication for type 2 diabetes',
            'intended_use': 'Management of type 2 diabetes mellitus',
            'proposed_price': 3500,
            'status': 'pending',
            'days': 1,
        },
        {
            'requester_user_id': PHARMACIST_1,
            'requester_type': 'pharmacist',
            'pharmacy_id': PHARMACY_KIGALI,
            'product_name': 'Lisinopril 10mg',
            'category': 'Cardiovascular',
            'product_type': 'medicine',
            'manufacturer': 'Cipla',
            'brand': 'Zestril',
            'description': 'ACE inhibitor for hypertension',
            'intended_use': 'Treatment of hypertension and heart failure',
            'proposed_price': 4200,
            'status': 'pending',
            'days': 2,
        },
        {
            'requester_user_id': PHARMACIST_2,
            'requester_type': 'pharmacist',
            'pharmacy_id': PHARMACY_KIGALI,
            'product_name': 'Omeprazole 20mg',
            'category': 'Gastrointestinal',
            'product_type': 'medicine',
            'manufacturer': 'Dr Reddys',
            'brand': 'Prilosec',
            'description': 'Proton pump inhibitor for acid reflux',
            'intended_use': 'Treatment of gastric ulcers and GERD',
            'proposed_price': 2800,
            'status': 'approved',
            'days': 5,
        },
        {
            'requester_user_id': PHARMACIST_2,
            'requester_type': 'pharmacist',
            'pharmacy_id': PHARMACY_KIGALI,
            'product_name': 'Azithromycin 500mg',
            'category': 'Antibiotic',
            'product_type': 'medicine',
            'manufacturer': 'Zithromax',
            'brand': 'Zithromax',
            'description': 'Macrolide antibiotic for bacterial infections',
            'intended_use': 'Treatment of respiratory and skin infections',
            'proposed_price': 5500,
            'status': 'pending',
            'days': 0,
        },
        {
            'requester_user_id': PHARMACIST_1,
            'requester_type': 'pharmacist',
            'pharmacy_id': PHARMACY_KIGALI,
            'product_name': 'Vitamin D3 1000IU',
            'category': 'Supplement',
            'product_type': 'food_supplements',
            'manufacturer': 'Nature Made',
            'brand': 'Nature Made D3',
            'description': 'Vitamin D3 supplement for bone health',
            'intended_use': 'Prevention and treatment of vitamin D deficiency',
            'proposed_price': 1500,
            'status': 'rejected',
            'days': 8,
        },
    ]
    
    for req in requests:
        await session.execute(text("""
            INSERT INTO product_requests (
                id, requester_user_id, requester_type, pharmacy_id, partner_company_id,
                product_name, category, product_type, manufacturer, brand,
                description, intended_use, proposed_price, status,
                created_at, updated_at
            ) VALUES (
                :id, :user_id, :req_type, :pharm_id, NULL,
                :name, :cat, :ptype, :mfr, :brand,
                :desc, :use, :price, :status,
                :created_at, :created_at
            )
        """), {
            'id': uid(),
            'user_id': req['requester_user_id'],
            'req_type': req['requester_type'],
            'pharm_id': req['pharmacy_id'],
            'name': req['product_name'],
            'cat': req['category'],
            'ptype': req['product_type'],
            'mfr': req['manufacturer'],
            'brand': req['brand'],
            'desc': req['description'],
            'use': req['intended_use'],
            'price': req['proposed_price'],
            'status': req['status'],
            'created_at': days_ago(req['days']),
        })
    
    print(f"  Created {len(requests)} product requests")


async def seed_notifications(session: AsyncSession):
    """Seed notifications for all users."""
    print("Seeding notifications...")
    
    notifications = [
        # Patient notifications (use users.id)
        (PATIENT_USER_1, 'Order Confirmed', 'Your order ORD-12345 has been confirmed and is being processed.', 'order', False),
        (PATIENT_USER_1, 'Order Delivered', 'Your order ORD-11234 has been delivered successfully.', 'order', True),
        (PATIENT_USER_1, 'Prescription Reminder', 'Your prescription for Paracetamol 500mg is due for renewal.', 'health', False),
        (PATIENT_USER_2, 'Order Processing', 'Your order is being prepared by the pharmacy.', 'order', False),
        (PATIENT_USER_2, 'New Products Available', 'New antimalarial medicines are now available near you.', 'promo', True),
        (PATIENT_USER_3, 'Low Stock Alert', 'Amoxicillin 500mg at Kigali City Pharmacy is running low.', 'alert', False),
        (PATIENT_USER_3, 'Order Completed', 'Your order has been completed. Rate your experience!', 'order', True),
        # Pharmacist notifications (use users.id)
        (PHARMACIST_1, 'New Order Received', 'A new order ORD-54321 has been placed and requires your attention.', 'order', False),
        (PHARMACIST_1, 'Low Stock Warning', 'Metformin 500mg stock is below reorder level (5 units remaining).', 'alert', False),
        (PHARMACIST_1, 'Product Request Approved', 'Your request for Omeprazole 20mg has been approved.', 'system', True),
        (PHARMACIST_2, 'New Order Received', 'Order ORD-67890 needs processing - 2 items.', 'order', False),
        (PHARMACIST_2, 'Inventory Update Required', 'Please update stock levels for 3 expiring items.', 'alert', False),
    ]
    
    for user_id, title, message, category, read_status in notifications:
        created_at = days_ago(random.randint(0, 14))
        await session.execute(text("""
            INSERT INTO notifications (
                id, user_id, title, message, category, read_status,
                created_at, updated_at
            ) VALUES (
                :id, :user_id, :title, :message, :cat, :read,
                :created_at, :created_at
            )
        """), {
            'id': uid(),
            'user_id': user_id,
            'title': title,
            'message': message,
            'cat': category,
            'read': read_status,
            'created_at': created_at,
        })
    
    print(f"  Created {len(notifications)} notifications")


async def main():
    print("=== Farumasi MVP Data Seeder ===\n")
    
    async with AsyncSessionLocal() as session:
        async with session.begin():
            try:
                # Check what's already seeded
                r = await session.execute(text('SELECT COUNT(*) FROM product_requests'))
                req_count = r.scalar()
                r = await session.execute(text("SELECT COUNT(*) FROM orders WHERE partner_company_id IS NOT NULL"))
                partner_order_count = r.scalar()
                r = await session.execute(text('SELECT COUNT(*) FROM notifications WHERE category IN (\'order\',\'alert\',\'health\',\'promo\',\'system\')'))
                notif_count = r.scalar()
                
                # Get existing listing IDs
                listings = await get_listing_ids(session)
                if not listings:
                    print("ERROR: No product listings found. Run the main seeder first.")
                    return
                print(f"Found {len(listings)} product listings to reference\n")
                print(f"Existing: {partner_order_count} partner orders, {req_count} product requests, {notif_count} notifications\n")
                
                # Seed all data
                if partner_order_count < 5:
                    order_ids = await seed_orders(session, listings)
                    await seed_revenue(session, order_ids)
                else:
                    print("Skipping orders/revenue (already seeded)")
                
                if req_count < 3:
                    await seed_product_requests(session)
                else:
                    print("Skipping product requests (already seeded)")
                
                await seed_notifications(session)
                
                print("\n=== Seeding completed successfully! ===")
                
            except Exception as e:
                print(f"\nERROR: {e}")
                import traceback
                traceback.print_exc()
                raise

asyncio.run(main())
