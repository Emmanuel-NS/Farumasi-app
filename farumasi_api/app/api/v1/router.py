from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    config,
    patients,
    doctors,
    hospitals,
    pharmacists,
    pharmacies,
    partners,
    sellers,
    seller_applications,
    riders,
    products,
    product_requests,
    listings,
    insurance,
    prescriptions,
    recommendations,
    orders,
    deliveries,
    revenue,
    withdrawals,
    webhooks,
    articles,
    notifications,
    analytics,
    uploads,
    admin,
    content,
    admin_content,
    manual_payments,
    consultations,
    audit,
    translations,
)

api_router = APIRouter()

# ─── Phase 1 (STABLE) ───────────────────────────────────────────────────────
# Contract frozen and covered by tests/test_phase1_smoke.py. Safe to depend on.
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(config.router, prefix="/config", tags=["Configuration"])
api_router.include_router(content.router, prefix="/content", tags=["Content"])

# ─── Phase 2+ (EXPERIMENTAL) ────────────────────────────────────────────────
# Work-in-progress. Endpoints, schemas, and behavior may change without notice
# until promoted to stable. Tagged "(experimental)" so OpenAPI / Swagger UI
# clearly signals this to consumers.
_EXP = "experimental"

api_router.include_router(patients.router, prefix="/patients", tags=[f"Patients ({_EXP})"])
api_router.include_router(doctors.router, prefix="/doctors", tags=[f"Doctors ({_EXP})"])
api_router.include_router(hospitals.router, prefix="/hospitals", tags=[f"Hospitals ({_EXP})"])
api_router.include_router(pharmacists.router, prefix="/pharmacists", tags=[f"Pharmacists ({_EXP})"])
api_router.include_router(pharmacies.router, prefix="/pharmacies", tags=[f"Pharmacies ({_EXP})"])
api_router.include_router(partners.router, prefix="/partners", tags=[f"Partners ({_EXP})"])
api_router.include_router(sellers.router, prefix="/sellers", tags=[f"Sellers ({_EXP})"])
api_router.include_router(seller_applications.router, prefix="/seller-applications", tags=[f"Seller Applications ({_EXP})"])
api_router.include_router(riders.router, prefix="/riders", tags=[f"Riders ({_EXP})"])
api_router.include_router(products.router, prefix="/products", tags=[f"Products ({_EXP})"])
api_router.include_router(product_requests.router, prefix="/product-requests", tags=[f"Product Requests ({_EXP})"])
api_router.include_router(listings.router, prefix="/listings", tags=[f"Listings ({_EXP})"])
api_router.include_router(insurance.router, prefix="/insurance-providers", tags=[f"Insurance ({_EXP})"])
api_router.include_router(prescriptions.router, prefix="/prescriptions", tags=[f"Prescriptions ({_EXP})"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=[f"Recommendations ({_EXP})"])
api_router.include_router(orders.router, prefix="/orders", tags=[f"Orders ({_EXP})"])
api_router.include_router(deliveries.router, prefix="/deliveries", tags=[f"Deliveries ({_EXP})"])
api_router.include_router(revenue.router, prefix="/revenue", tags=[f"Revenue ({_EXP})"])
api_router.include_router(withdrawals.router, prefix="/withdrawals", tags=[f"Withdrawals ({_EXP})"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=[f"Webhooks ({_EXP})"])
api_router.include_router(articles.router, prefix="/articles", tags=[f"Articles ({_EXP})"])
api_router.include_router(notifications.router, prefix="/notifications", tags=[f"Notifications ({_EXP})"])
api_router.include_router(analytics.router, prefix="/analytics", tags=[f"Analytics ({_EXP})"])
api_router.include_router(uploads.router, prefix="/uploads", tags=[f"Uploads ({_EXP})"])
api_router.include_router(admin.router, prefix="/admin", tags=[f"Admin ({_EXP})"])
api_router.include_router(
    manual_payments.router,
    prefix="/admin/manual-payments",
    tags=[f"Manual Payments ({_EXP})"],
)
api_router.include_router(
    admin_content.router,
    prefix="/admin/content-pages",
    tags=[f"Content Pages ({_EXP})"],
)
api_router.include_router(consultations.router, prefix="/consultations", tags=[f"Consultations ({_EXP})"])
api_router.include_router(audit.router, prefix="/audit", tags=[f"Audit ({_EXP})"])
api_router.include_router(translations.router, prefix="/translations", tags=[f"Translations ({_EXP})"])
