"""
Import all models here so Alembic's env.py can discover them all
when it calls `Base.metadata`.
"""
from app.models.base import Base
from app.models.user import User
from app.models.insurance import InsuranceProvider
from app.models.hospital import Hospital, Department
from app.models.hospital_admin import HospitalAdminProfile
from app.models.patient import PatientProfile, Address
from app.models.doctor import DoctorProfile
from app.models.pharmacist import PharmacistProfile
from app.models.rider import RiderProfile
from app.models.pharmacy import Pharmacy, pharmacy_insurance
from app.models.partner import PartnerCompany
from app.models.product import ProductCatalogueItem, ProductListing, ProductRequest
from app.models.prescription import DigitalPrescription, PrescriptionItem, PrescriptionReview
from app.models.recommendation import PharmacyRecommendation
from app.models.order import Order, OrderItem
from app.models.delivery import Delivery
from app.models.revenue import RevenueRecord, WithdrawalRequest
from app.models.article import HealthArticle, ArticleLike, ArticleSave, ArticleComment
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.models.consultation import Consultation, ChatMessage
from app.models.seller_change_request import SellerChangeRequest
from app.models.owner_payout_profile import OwnerPayoutProfile
from app.models.payment_transaction import PaymentTransaction
from app.models.email_verification_challenge import EmailVerificationChallenge
from app.models.platform_setting import PlatformSetting
from app.models.data_export_job import DataExportJob
from app.models.refund_request import RefundRequest
from app.models.translation_cache import TranslationCache, TranslationUsageDaily

__all__ = [
    "Base",
    "User",
    "InsuranceProvider",
    "Hospital",
    "Department",
    "HospitalAdminProfile",
    "PatientProfile",
    "Address",
    "DoctorProfile",
    "PharmacistProfile",
    "RiderProfile",
    "Pharmacy",
    "pharmacy_insurance",
    "PartnerCompany",
    "ProductCatalogueItem",
    "ProductListing",
    "ProductRequest",
    "DigitalPrescription",
    "PrescriptionItem",
    "PrescriptionReview",
    "PharmacyRecommendation",
    "Order",
    "OrderItem",
    "Delivery",
    "RevenueRecord",
    "WithdrawalRequest",
    "HealthArticle",
    "ArticleLike",
    "ArticleSave",
    "ArticleComment",
    "Notification",
    "AuditLog",
    "Consultation",
    "ChatMessage",
    "SellerChangeRequest",
]
