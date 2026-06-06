from __future__ import annotations

from enum import Enum


class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    HOSPITAL_ADMIN = "hospital_admin"
    PHARMACIST = "pharmacist"
    PHARMACY_ADMIN = "pharmacy_admin"
    PARTNER_COMPANY_ADMIN = "partner_company_admin"
    RIDER = "rider"
    SUPER_ADMIN = "super_admin"
    OPERATIONS_ADMIN = "operations_admin"
    FINANCE_ADMIN = "finance_admin"
    COMPLIANCE_ADMIN = "compliance_admin"


class UserStatus(str, Enum):
    ACTIVE = "active"
    PENDING_VERIFICATION = "pending_verification"
    RESTRICTED = "restricted"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class VerificationStatus(str, Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class EntityStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class ProductType(str, Enum):
    MEDICINE = "medicine"
    MEDICAL_DEVICE = "medical_device"
    FOOD_SUPPLEMENTS = "food_supplements"
    COSMETICS = "cosmetics"


class ProductApprovalStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class ProductRequestStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    MORE_INFO_REQUIRED = "more_info_required"
    APPROVED = "approved"
    REJECTED = "rejected"


class PackagingClass(str, Enum):
    """Physical packaging form — controls whether a product can be sold in partial units."""
    TABLETS_CAPSULES = "tablets_capsules"    # allow partial
    SACHETS = "sachets"                      # allow partial
    AMPOULES_VIALS = "ampoules_vials"        # allow partial
    LIQUID_BOTTLE = "liquid_bottle"          # no partial
    OINTMENT_GEL_CREAM = "ointment_gel_cream"  # no partial
    EYE_EAR_NOSE_DROPS = "eye_ear_nose_drops"  # no partial
    INHALER_SPRAY = "inhaler_spray"          # no partial
    OTHER = "other"                          # no partial


PARTIAL_SELLING_CLASSES = {
    PackagingClass.TABLETS_CAPSULES,
    PackagingClass.SACHETS,
    PackagingClass.AMPOULES_VIALS,
}


class SellMode(str, Enum):
    """How the patient purchased a line item."""
    PACK = "pack"          # whole box / bottle / tube (fixed pack)
    PARTIAL = "partial"    # individual tablets, sachets, ampoules, etc.


class ListingAvailability(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    SUSPENDED = "suspended"


class PrescriptionType(str, Enum):
    DOCTOR_CREATED = "doctor_created"
    PATIENT_UPLOADED = "patient_uploaded"


class PrescriptionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    UNDER_REVIEW = "under_review"
    REVIEWED = "reviewed"
    FULFILLED = "fulfilled"
    PARTIALLY_FULFILLED = "partially_fulfilled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    CLARIFICATION_NEEDED = "clarification_needed"
    REJECTED = "rejected"


class OrderStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


# Legacy statuses stored in older seed/MVP data — map to current enum values.
LEGACY_ORDER_STATUS_MAP: dict[str, str] = {
    "processing": OrderStatus.PREPARING.value,
    "confirmed": OrderStatus.ACCEPTED.value,
    "pharmacy_accepted": OrderStatus.ACCEPTED.value,
    "in_transit": OrderStatus.OUT_FOR_DELIVERY.value,
}


def normalize_order_status(status: str) -> str:
    """Return a canonical order status string."""
    return LEGACY_ORDER_STATUS_MAP.get(status, status)


# ── Admin / portal order buckets (Pending → In progress → Completed / Cancelled) ──
ORDER_BUCKET_PENDING: frozenset[str] = frozenset({OrderStatus.PENDING.value})

ORDER_BUCKET_IN_PROGRESS: frozenset[str] = frozenset(
    {
        OrderStatus.ACCEPTED.value,
        OrderStatus.PREPARING.value,
        OrderStatus.READY_FOR_PICKUP.value,
        OrderStatus.OUT_FOR_DELIVERY.value,
        OrderStatus.DELIVERED.value,
        "confirmed",
        "processing",
        "pharmacy_accepted",
        "in_transit",
    }
)

ORDER_BUCKET_COMPLETED: frozenset[str] = frozenset({OrderStatus.COMPLETED.value})

ORDER_BUCKET_CANCELLED: frozenset[str] = frozenset(
    {
        OrderStatus.CANCELLED.value,
        OrderStatus.REJECTED.value,
        OrderStatus.FAILED.value,
    }
)

_ORDER_BUCKETS: dict[str, frozenset[str]] = {
    "pending": ORDER_BUCKET_PENDING,
    "in_progress": ORDER_BUCKET_IN_PROGRESS,
    "completed": ORDER_BUCKET_COMPLETED,
    "cancelled": ORDER_BUCKET_CANCELLED,
}


def order_bucket_statuses(bucket: str) -> list[str] | None:
    """Return raw DB status values for a high-level bucket filter."""
    statuses = _ORDER_BUCKETS.get(bucket)
    return list(statuses) if statuses else None


def classify_order_bucket(status: str) -> str:
    """Map any stored order_status to pending | in_progress | completed | cancelled."""
    raw = (status or OrderStatus.PENDING.value).lower()
    if raw in ORDER_BUCKET_CANCELLED:
        return "cancelled"
    if raw in ORDER_BUCKET_COMPLETED:
        return "completed"
    if raw in ORDER_BUCKET_PENDING:
        return "pending"
    if raw in ORDER_BUCKET_IN_PROGRESS:
        return "in_progress"
    normalized = normalize_order_status(raw)
    if normalized in ORDER_BUCKET_CANCELLED:
        return "cancelled"
    if normalized in ORDER_BUCKET_COMPLETED:
        return "completed"
    if normalized in ORDER_BUCKET_PENDING:
        return "pending"
    if normalized in ORDER_BUCKET_IN_PROGRESS:
        return "in_progress"
    return "in_progress"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class DeliveryMethod(str, Enum):
    DELIVERY = "delivery"
    PICKUP = "pickup"


class DeliveryStatus(str, Enum):
    PENDING_ASSIGNMENT = "pending_assignment"
    ASSIGNED = "assigned"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    GOING_TO_PICKUP = "going_to_pickup"
    ARRIVED_AT_PICKUP = "arrived_at_pickup"
    PICKED_UP = "picked_up"
    OUT_FOR_DELIVERY = "out_for_delivery"
    ARRIVED_AT_DESTINATION = "arrived_at_destination"
    QR_PENDING = "qr_pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RiderType(str, Enum):
    PER_TRIP = "per_trip"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class RiderAvailability(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    SUSPENDED = "suspended"


class DeliveryRejectionReason(str, Enum):
    TOO_FAR = "too_far"
    UNSAFE_AREA = "unsafe_area"
    VEHICLE_ISSUE = "vehicle_issue"
    PERSONAL_EMERGENCY = "personal_emergency"
    PACKAGE_NOT_READY = "package_not_ready"
    INVALID_ADDRESS = "invalid_address"
    PRICE_LOW = "price_low"
    OTHER = "other"


class RevenueStatus(str, Enum):
    PENDING = "pending"
    AVAILABLE = "available"
    WITHDRAWN = "withdrawn"
    REVERSED = "reversed"


class WithdrawalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSING = "processing"
    PAID = "paid"
    REJECTED = "rejected"


class ArticleStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class PartnerType(str, Enum):
    PHARMACY = "pharmacy"
    PARTNER_COMPANY = "partner_company"


# Permissions matrix
ROLE_PERMISSIONS: dict[str, set[str]] = {
    UserRole.SUPER_ADMIN: {"*"},  # full access
    UserRole.OPERATIONS_ADMIN: {
        "users:read", "users:update", "users:status",
        "hospitals:*", "pharmacies:*", "partners:*",
        "doctors:*", "orders:read", "deliveries:*",
        "audit:read",
    },
    UserRole.FINANCE_ADMIN: {
        "revenue:*", "withdrawals:*", "analytics:revenue",
    },
    UserRole.COMPLIANCE_ADMIN: {
        "products:approve", "pharmacies:verify", "partners:verify",
        "doctors:verify", "prescriptions:review", "product_requests:review",
        "audit:read",
    },
    UserRole.HOSPITAL_ADMIN: {
        "hospitals:read_own", "doctors:manage_own_hospital",
    },
    UserRole.DOCTOR: {
        "prescriptions:create", "prescriptions:read_own",
        "patients:read_basic", "products:read",
    },
    UserRole.PHARMACIST: {
        "prescriptions:review", "product_requests:review",
        "products:read", "products:update",
        "articles:*",
    },
    UserRole.PHARMACY_ADMIN: {
        "pharmacies:manage_own", "listings:manage_own",
        "orders:manage_own", "revenue:read_own",
        "withdrawals:create_own",
    },
    UserRole.PARTNER_COMPANY_ADMIN: {
        "partners:manage_own", "listings:manage_own",
        "orders:manage_own", "revenue:read_own",
        "withdrawals:create_own",
    },
    UserRole.PATIENT: {
        "patients:manage_own",
        "prescriptions:upload", "prescriptions:read_own",
        "orders:create", "orders:read_own",
        "recommendations:request",
        "articles:read",
    },
    UserRole.RIDER: {
        "deliveries:read_assigned", "deliveries:update_assigned",
        "riders:manage_own",
    },
}
