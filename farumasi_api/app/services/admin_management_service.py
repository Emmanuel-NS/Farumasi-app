from __future__ import annotations

import secrets
import string
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import (
    EntityStatus,
    ListingAvailability,
    PrescriptionStatus,
    ProductApprovalStatus,
    ProductType,
    UserRole,
    UserStatus,
    order_bucket_statuses,
)
from app.core.exceptions import AuthorizationError, ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.partner import PartnerCompany
from app.models.pharmacist import PharmacistProfile
from app.models.pharmacy import Pharmacy
from app.models.prescription import DigitalPrescription, PrescriptionItem
from app.models.revenue import WithdrawalRequest
from app.models.order import Order
from app.models.product import ProductCatalogueItem, ProductListing
from app.models.rider import RiderProfile
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.admin_management import (
    AdminCreateUserRequest,
    AdminCreateUserResponse,
    OnboardPartnerRequest,
    OnboardPharmacyRequest,
    OnboardSellerResponse,
    PrescriptionAdminSummary,
    PrescriptionStatusCount,
    OrderAdminSummary,
    PatientCatalogInsights,
    ProductTypeInsight,
    SellerFinanceSummary,
)
from app.schemas.revenue import WithdrawalOut, RevenueOut, coerce_payout_details
from app.schemas.user import UserOut
from app.services.audit_service import AuditService
from app.services.revenue_service import RevenueService
from app.services.product_service import open_seller_listing_filter
from app.services.seller_change_request_service import SellerChangeRequestService


_PATIENT_VISIBLE_AVAILABILITY = (
    ListingAvailability.AVAILABLE.value,
    ListingAvailability.LOW_STOCK.value,
)

_PRODUCT_TYPE_LABELS: dict[str, str] = {
    ProductType.MEDICINE.value: "Medicines",
    ProductType.FOOD_SUPPLEMENTS.value: "Supplements",
    ProductType.MEDICAL_DEVICE.value: "Devices",
    ProductType.COSMETICS.value: "Cosmetics",
}

_PRESCRIPTION_LABELS: dict[str, str] = {
    PrescriptionStatus.DRAFT.value: "Draft",
    PrescriptionStatus.ACTIVE.value: "New / active",
    PrescriptionStatus.UNDER_REVIEW.value: "Under review",
    PrescriptionStatus.REVIEWED.value: "Reviewed (cart ready)",
    PrescriptionStatus.FULFILLED.value: "Fulfilled",
    PrescriptionStatus.PARTIALLY_FULFILLED.value: "Partially fulfilled",
    PrescriptionStatus.CANCELLED.value: "Cancelled",
    PrescriptionStatus.EXPIRED.value: "Expired",
}


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$"
    return "".join(secrets.choice(alphabet) for _ in range(length))


class AdminManagementService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def create_user(
        self, data: AdminCreateUserRequest, actor: User
    ) -> AdminCreateUserResponse:
        if data.role in (
            UserRole.SUPER_ADMIN,
            UserRole.OPERATIONS_ADMIN,
            UserRole.FINANCE_ADMIN,
            UserRole.COMPLIANCE_ADMIN,
        ):
            if actor.role != UserRole.SUPER_ADMIN:
                raise AuthorizationError("Only super admins can create admin accounts")

        if await self.user_repo.email_exists(data.email):
            raise ConflictError(f"Email '{data.email}' is already registered")

        temp_password = data.temporary_password or _generate_temp_password()
        user = await self.user_repo.create(
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            password_hash=hash_password(temp_password),
            role=data.role,
            status=UserStatus.ACTIVE,
            must_change_password=True,
            email_verified=True,
        )

        if data.role == UserRole.PHARMACIST:
            self.db.add(PharmacistProfile(user_id=user.id))
        elif data.role == UserRole.RIDER:
            self.db.add(RiderProfile(user_id=user.id))
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="admin.user.create",
            entity_type="User",
            entity_id=user.id,
            new_value={"email": user.email, "role": user.role},
        )
        return AdminCreateUserResponse(
            user=UserOut.model_validate(user),
            temporary_password=temp_password,
        )

    async def onboard_pharmacy(
        self, data: OnboardPharmacyRequest, actor: User
    ) -> OnboardSellerResponse:
        if await self.user_repo.email_exists(data.owner_email):
            raise ConflictError(f"Email '{data.owner_email}' is already registered")

        temp_password = data.temporary_password or _generate_temp_password()
        owner = await self.user_repo.create(
            full_name=data.owner_full_name,
            email=data.owner_email,
            phone=data.owner_phone,
            password_hash=hash_password(temp_password),
            role=UserRole.PHARMACY_ADMIN,
            status=UserStatus.ACTIVE,
            must_change_password=True,
            email_verified=True,
        )

        pharmacy = Pharmacy(
            owner_user_id=owner.id,
            name=data.name,
            email=data.email or data.owner_email,
            phone=data.phone or data.owner_phone,
            address=data.address,
            district=data.district,
            latitude=data.latitude,
            longitude=data.longitude,
            license_number=data.license_number,
            commission_rate_percent=data.commission_rate_percent,
            logo_url=data.logo_url,
            accepts_delivery=data.accepts_delivery,
            status=EntityStatus.ACTIVE,
        )
        self.db.add(pharmacy)
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="admin.pharmacy.onboard",
            entity_type="Pharmacy",
            entity_id=pharmacy.id,
            new_value={
                "name": pharmacy.name,
                "owner_email": owner.email,
                "commission_rate_percent": float(data.commission_rate_percent),
            },
        )
        return OnboardSellerResponse(
            owner=UserOut.model_validate(owner),
            temporary_password=temp_password,
            pharmacy_id=pharmacy.id,
        )

    async def onboard_partner(
        self, data: OnboardPartnerRequest, actor: User
    ) -> OnboardSellerResponse:
        if await self.user_repo.email_exists(data.owner_email):
            raise ConflictError(f"Email '{data.owner_email}' is already registered")

        temp_password = data.temporary_password or _generate_temp_password()
        owner = await self.user_repo.create(
            full_name=data.owner_full_name,
            email=data.owner_email,
            phone=data.owner_phone,
            password_hash=hash_password(temp_password),
            role=UserRole.PARTNER_COMPANY_ADMIN,
            status=UserStatus.ACTIVE,
            must_change_password=True,
            email_verified=True,
        )

        company = PartnerCompany(
            owner_user_id=owner.id,
            name=data.name,
            company_type=data.company_type,
            email=data.email or data.owner_email,
            phone=data.phone or data.owner_phone,
            address=data.address,
            district=data.district,
            latitude=data.latitude,
            longitude=data.longitude,
            business_registration_number=data.business_registration_number,
            commission_rate_percent=data.commission_rate_percent,
            logo_url=data.logo_url,
            description=data.description,
            status=EntityStatus.ACTIVE,
        )
        self.db.add(company)
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="admin.partner.onboard",
            entity_type="PartnerCompany",
            entity_id=company.id,
            new_value={
                "name": company.name,
                "owner_email": owner.email,
                "commission_rate_percent": float(data.commission_rate_percent),
            },
        )
        return OnboardSellerResponse(
            owner=UserOut.model_validate(owner),
            temporary_password=temp_password,
            partner_company_id=company.id,
        )

    async def pharmacy_finance(self, pharmacy_id: str) -> SellerFinanceSummary:
        result = await self.db.execute(
            select(Pharmacy)
            .options(selectinload(Pharmacy.owner))
            .where(Pharmacy.id == pharmacy_id)
        )
        pharmacy = result.scalar_one_or_none()
        if not pharmacy:
            raise NotFoundError("Pharmacy", pharmacy_id)

        return await self._seller_finance_summary(
            seller_type="pharmacy",
            seller_id=pharmacy.id,
            seller_name=pharmacy.name,
            commission_rate_percent=float(pharmacy.commission_rate_percent)
            if pharmacy.commission_rate_percent is not None
            else None,
            owner=pharmacy.owner,
            owner_user_id=pharmacy.owner_user_id,
            created_at=pharmacy.created_at,
            entity_filter=lambda r: r.pharmacy_id == pharmacy.id,
            pharmacy_id=pharmacy.id,
        )

    async def partner_finance(self, partner_id: str) -> SellerFinanceSummary:
        result = await self.db.execute(
            select(PartnerCompany)
            .options(selectinload(PartnerCompany.owner))
            .where(PartnerCompany.id == partner_id)
        )
        company = result.scalar_one_or_none()
        if not company:
            raise NotFoundError("PartnerCompany", partner_id)

        return await self._seller_finance_summary(
            seller_type="partner_company",
            seller_id=company.id,
            seller_name=company.name,
            commission_rate_percent=float(company.commission_rate_percent)
            if company.commission_rate_percent is not None
            else None,
            owner=company.owner,
            owner_user_id=company.owner_user_id,
            created_at=company.created_at,
            entity_filter=lambda r: r.partner_company_id == company.id,
            partner_company_id=company.id,
        )

    async def _seller_finance_summary(
        self,
        *,
        seller_type: str,
        seller_id: str,
        seller_name: str,
        commission_rate_percent: Optional[float],
        owner,
        owner_user_id: str,
        created_at,
        entity_filter,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> SellerFinanceSummary:
        rev_svc = RevenueService(self.db)
        revenue = await rev_svc.get_summary_for_owner(owner_user_id)
        all_records = await rev_svc.list_records_for_owner(owner_user_id)
        entity_records = [r for r in all_records if entity_filter(r)]
        withdrawals_raw = await rev_svc.list_withdrawals_for_owner(owner_user_id)
        withdrawals: list[WithdrawalOut] = []
        for w in withdrawals_raw[:15]:
            withdrawals.append(
                WithdrawalOut(
                    id=w.id,
                    requester_user_id=w.requester_user_id,
                    pharmacy_id=w.pharmacy_id,
                    partner_company_id=w.partner_company_id,
                    amount=float(w.amount),
                    payout_method=w.payout_method,
                    payout_details=coerce_payout_details(w.payout_details),
                    status=w.status,
                    admin_notes=w.admin_notes,
                    processed_by_user_id=w.processed_by_user_id,
                    created_at=w.created_at,
                    processed_at=w.processed_at,
                    payment_reference=w.payment_reference,
                    payment_proof_url=w.payment_proof_url,
                )
            )

        pharmacy_ids, partner_ids = await rev_svc._owner_entity_ids(owner_user_id)
        entity_count = len(pharmacy_ids) + len(partner_ids)
        scope_note = None
        if entity_count > 1:
            scope_note = (
                "Wallet totals include combined earnings across all pharmacies and "
                "companies owned by this partner (matches their partner portal)."
            )

        change_svc = SellerChangeRequestService(self.db)
        if pharmacy_id:
            pending_changes = [
                c
                for c in await change_svc.list_for_pharmacy(pharmacy_id)
                if c.status == "pending"
            ]
        else:
            pending_changes = [
                c
                for c in await change_svc.list_for_partner(partner_company_id or seller_id)
                if c.status == "pending"
            ]

        owner_out = UserOut.model_validate(owner) if owner else None
        record_outs = [
            RevenueOut(
                id=r.id,
                order_id=r.order_id,
                order_code=r.order.order_code if r.order else None,
                order_status=r.order.order_status if r.order else None,
                partner_type=r.partner_type,
                pharmacy_id=r.pharmacy_id,
                partner_company_id=r.partner_company_id,
                gross_amount=float(r.gross_amount),
                platform_commission=float(r.platform_commission),
                net_amount=float(r.net_amount),
                status=r.status,
                created_at=r.created_at,
            )
            for r in entity_records[:25]
        ]

        return SellerFinanceSummary(
            seller_type=seller_type,
            seller_id=seller_id,
            seller_name=seller_name,
            commission_rate_percent=commission_rate_percent,
            owner=owner_out,
            revenue=revenue,
            recent_withdrawals=withdrawals,
            recent_revenue_records=record_outs,
            pending_change_requests=pending_changes,
            wallet_scope="owner",
            wallet_scope_note=scope_note,
            created_at=created_at,
        )

    async def prescription_summary(self) -> PrescriptionAdminSummary:
        total = (await self.db.execute(select(func.count(DigitalPrescription.id)))).scalar_one() or 0

        status_rows = (
            await self.db.execute(
                select(DigitalPrescription.status, func.count(DigitalPrescription.id)).group_by(
                    DigitalPrescription.status
                )
            )
        ).all()
        by_status = [
            PrescriptionStatusCount(
                status=row[0],
                label=_PRESCRIPTION_LABELS.get(row[0], row[0].replace("_", " ").title()),
                count=int(row[1]),
            )
            for row in status_rows
        ]
        by_status.sort(key=lambda x: x.count, reverse=True)

        type_rows = (
            await self.db.execute(
                select(DigitalPrescription.prescription_type, func.count(DigitalPrescription.id)).group_by(
                    DigitalPrescription.prescription_type
                )
            )
        ).all()
        types = [
            PrescriptionStatusCount(
                status=row[0],
                label=row[0].replace("_", " ").title(),
                count=int(row[1]),
            )
            for row in type_rows
        ]

        with_items = (
            await self.db.execute(
                select(func.count(func.distinct(PrescriptionItem.prescription_id)))
            )
        ).scalar_one() or 0
        without_items = max(0, int(total) - int(with_items))
        total_items = (
            await self.db.execute(select(func.count(PrescriptionItem.id)))
        ).scalar_one() or 0

        counts = {row[0]: int(row[1]) for row in status_rows}
        new_requests = counts.get(PrescriptionStatus.DRAFT.value, 0) + counts.get(
            PrescriptionStatus.ACTIVE.value, 0
        )
        under_review = counts.get(PrescriptionStatus.UNDER_REVIEW.value, 0)
        cart_sent = counts.get(PrescriptionStatus.REVIEWED.value, 0)
        fulfilled = counts.get(PrescriptionStatus.FULFILLED.value, 0) + counts.get(
            PrescriptionStatus.PARTIALLY_FULFILLED.value, 0
        )
        cancelled_expired = counts.get(PrescriptionStatus.CANCELLED.value, 0) + counts.get(
            PrescriptionStatus.EXPIRED.value, 0
        )

        return PrescriptionAdminSummary(
            total=int(total),
            by_status=by_status,
            with_cart_items=int(with_items),
            without_cart_items=without_items,
            total_cart_items=int(total_items),
            types=types,
            new_requests=new_requests,
            under_review=under_review,
            cart_sent=cart_sent,
            fulfilled=fulfilled,
            cancelled_expired=cancelled_expired,
        )

    async def patient_catalog_insights(self) -> PatientCatalogInsights:
        listing_filters = [
            ProductListing.status == EntityStatus.ACTIVE.value,
            ProductListing.availability_status.in_(_PATIENT_VISIBLE_AVAILABILITY),
            ProductListing.stock_quantity > 0,
            ProductCatalogueItem.approval_status == ProductApprovalStatus.APPROVED.value,
            open_seller_listing_filter(),
        ]
        rows = (
            await self.db.execute(
                select(
                    ProductCatalogueItem.product_type,
                    ProductCatalogueItem.prescription_required,
                    func.count(ProductListing.id),
                )
                .join(
                    ProductCatalogueItem,
                    ProductListing.product_id == ProductCatalogueItem.id,
                )
                .where(*listing_filters)
                .group_by(
                    ProductCatalogueItem.product_type,
                    ProductCatalogueItem.prescription_required,
                )
            )
        ).all()

        by_type: dict[str, ProductTypeInsight] = {}
        total_listings = 0
        for product_type, rx_required, count in rows:
            key = product_type or ProductType.MEDICINE.value
            total_listings += int(count)
            if key not in by_type:
                by_type[key] = ProductTypeInsight(
                    product_type=key,
                    label=_PRODUCT_TYPE_LABELS.get(
                        key, key.replace("_", " ").title()
                    ),
                    total=0,
                    prescription_required=0,
                    over_the_counter=0,
                )
            insight = by_type[key]
            insight.total += int(count)
            if rx_required:
                insight.prescription_required += int(count)
            else:
                insight.over_the_counter += int(count)

        ordered_types = [
            ProductType.MEDICINE.value,
            ProductType.FOOD_SUPPLEMENTS.value,
            ProductType.MEDICAL_DEVICE.value,
            ProductType.COSMETICS.value,
        ]
        by_type_list: list[ProductTypeInsight] = []
        for key in ordered_types:
            if key in by_type:
                by_type_list.append(by_type.pop(key))
        by_type_list.extend(sorted(by_type.values(), key=lambda x: x.label))

        return PatientCatalogInsights(
            total_listings=total_listings,
            by_type=by_type_list,
        )

    async def orders_admin_summary(self) -> OrderAdminSummary:
        total = (await self.db.execute(select(func.count(Order.id)))).scalar_one() or 0

        async def count_bucket(bucket: str, *, prescription_only: bool = False) -> int:
            statuses = order_bucket_statuses(bucket)
            if not statuses:
                return 0
            filters = [Order.order_status.in_(statuses)]
            if prescription_only:
                filters.append(Order.prescription_id.isnot(None))
            return (
                await self.db.execute(select(func.count(Order.id)).where(*filters))
            ).scalar_one() or 0

        prescription_orders = (
            await self.db.execute(
                select(func.count(Order.id)).where(Order.prescription_id.isnot(None))
            )
        ).scalar_one() or 0
        partner_orders = max(0, int(total) - int(prescription_orders))
        completed_revenue = (
            await self.db.execute(
                select(func.coalesce(func.sum(Order.total_amount), 0.0)).where(
                    Order.order_status.in_(list(order_bucket_statuses("completed") or []))
                )
            )
        ).scalar_one() or 0

        return OrderAdminSummary(
            total=int(total),
            pending=await count_bucket("pending"),
            in_progress=await count_bucket("in_progress"),
            completed=await count_bucket("completed"),
            cancelled=await count_bucket("cancelled"),
            prescription_orders=int(prescription_orders),
            partner_orders=partner_orders,
            prescription_pending=await count_bucket("pending", prescription_only=True),
            prescription_in_progress=await count_bucket(
                "in_progress", prescription_only=True
            ),
            prescription_completed=await count_bucket(
                "completed", prescription_only=True
            ),
            prescription_cancelled=await count_bucket(
                "cancelled", prescription_only=True
            ),
            completed_revenue=float(completed_revenue),
        )

    async def _recent_withdrawals(
        self,
        *,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> list[WithdrawalOut]:
        q = select(WithdrawalRequest).order_by(WithdrawalRequest.created_at.desc()).limit(10)
        if pharmacy_id:
            q = q.where(WithdrawalRequest.pharmacy_id == pharmacy_id)
        if partner_company_id:
            q = q.where(WithdrawalRequest.partner_company_id == partner_company_id)
        rows = list((await self.db.execute(q)).scalars().all())
        return [WithdrawalOut.model_validate(row) for row in rows]
