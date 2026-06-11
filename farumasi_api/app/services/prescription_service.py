from __future__ import annotations

from typing import List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    NotFoundError,
    ValidationError,
    AuthorizationError,
    BusinessRuleError,
)
from app.core.constants import (
    PrescriptionType,
    PrescriptionStatus,
    ReviewStatus,
    UserRole,
    ProductApprovalStatus,
)
from app.models.prescription import DigitalPrescription, PrescriptionItem, PrescriptionReview
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile
from app.models.pharmacist import PharmacistProfile
from app.models.product import ProductCatalogueItem
from app.models.user import User
from app.repositories.prescription_repository import (
    PrescriptionRepository,
    PrescriptionReviewRepository,
)
from app.schemas.prescription import (
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionUploadCreate,
    PrescriptionItemCreate,
    PrescriptionItemUpdate,
    PrescriptionReviewCreate,
    PrescriptionReviewUpdate,
)
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService


_REVIEWER_ROLES = {
    UserRole.PHARMACIST,
    UserRole.PHARMACY_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.FINANCE_ADMIN,
    UserRole.COMPLIANCE_ADMIN,
}


class PrescriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PrescriptionRepository(db)
        self.review_repo = PrescriptionReviewRepository(db)

    # ── Helpers ──────────────────────────────────────────────────────────
    async def _get_or_404(self, prescription_id: str) -> DigitalPrescription:
        rx = await self.repo.get_full(prescription_id)
        if not rx:
            raise NotFoundError("Prescription", prescription_id)
        return rx

    async def _resolve_patient(self, *, actor: User, patient_id: str) -> PatientProfile:
        """Look up patient by profile id; when caller is the patient, also accept their user_id."""
        result = await self.db.execute(
            select(PatientProfile).where(PatientProfile.id == patient_id)
        )
        patient = result.scalar_one_or_none()
        if patient is None and actor.role == UserRole.PATIENT:
            result = await self.db.execute(
                select(PatientProfile).where(PatientProfile.user_id == actor.id)
            )
            patient = result.scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient", patient_id)
        return patient

    async def _resolve_doctor(self, actor: User) -> DoctorProfile:
        result = await self.db.execute(
            select(DoctorProfile).where(DoctorProfile.user_id == actor.id)
        )
        doctor = result.scalar_one_or_none()
        if not doctor:
            raise NotFoundError("Doctor profile")
        return doctor

    async def _resolve_pharmacist(self, actor: User) -> PharmacistProfile:
        result = await self.db.execute(
            select(PharmacistProfile).where(PharmacistProfile.user_id == actor.id)
        )
        pharmacist = result.scalar_one_or_none()
        if not pharmacist:
            raise NotFoundError("Pharmacist profile")
        return pharmacist

    async def _validate_product_id(self, product_id: Optional[str]) -> None:
        if not product_id:
            return
        result = await self.db.execute(
            select(ProductCatalogueItem).where(ProductCatalogueItem.id == product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            raise ValidationError(f"Product {product_id} not found")
        if product.approval_status != ProductApprovalStatus.APPROVED:
            raise BusinessRuleError(
                "Only approved products may be linked to prescription items"
            )

    def _assert_can_view(self, rx: DigitalPrescription, actor: User) -> None:
        role = actor.role
        if role == UserRole.SUPER_ADMIN:
            return
        if role in _REVIEWER_ROLES:
            return
        if role == UserRole.PATIENT:
            if rx.patient and rx.patient.user_id == actor.id:
                return
            raise AuthorizationError("Patients can only view their own prescriptions")
        if role == UserRole.DOCTOR:
            # Doctor may view prescriptions they created
            # (doctor_id is the DoctorProfile id, not user_id — resolve lazily via cache)
            # We compare via doctor profile user_id when available
            return self._assert_doctor_owns(rx, actor)
        raise AuthorizationError("Not allowed to view this prescription")

    async def _doctor_owns(self, rx: DigitalPrescription, actor: User) -> bool:
        if rx.doctor_id is None:
            return False
        result = await self.db.execute(
            select(DoctorProfile.user_id).where(DoctorProfile.id == rx.doctor_id)
        )
        owner_user_id = result.scalar_one_or_none()
        return owner_user_id == actor.id

    def _assert_doctor_owns(self, rx: DigitalPrescription, actor: User) -> None:
        # Synchronous shim — callers should prefer _assert_can_view_async for doctors
        # but doctor checks need DB. Real enforcement happens in _assert_can_view_async.
        return

    async def _assert_can_view_async(self, rx: DigitalPrescription, actor: User) -> None:
        role = actor.role
        if role == UserRole.SUPER_ADMIN or role in _REVIEWER_ROLES:
            return
        if role == UserRole.PATIENT:
            if rx.patient and rx.patient.user_id == actor.id:
                return
            raise AuthorizationError("Patients can only view their own prescriptions")
        if role == UserRole.DOCTOR:
            if await self._doctor_owns(rx, actor):
                return
            raise AuthorizationError("Doctors can only view prescriptions they created")
        raise AuthorizationError("Not allowed to view this prescription")

    async def _assert_can_edit(self, rx: DigitalPrescription, actor: User) -> None:
        role = actor.role
        if role == UserRole.SUPER_ADMIN:
            return
        if role == UserRole.DOCTOR:
            if not await self._doctor_owns(rx, actor):
                raise AuthorizationError(
                    "Doctors can only edit prescriptions they created"
                )
            if rx.status not in (PrescriptionStatus.DRAFT, PrescriptionStatus.ACTIVE):
                raise BusinessRuleError(
                    "Only draft or active prescriptions can be edited"
                )
            return
        # Pharmacists and pharmacy admins may manage prescription items so they can
        # build a cart on behalf of the patient from an uploaded prescription.
        # Allowed while the prescription is still pending review or under review.
        if role in (UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN):
            editable_statuses = {
                PrescriptionStatus.ACTIVE,
                PrescriptionStatus.DRAFT,
                PrescriptionStatus.REVIEWED,  # allow re-editing a previously sent cart
            }
            # Also handle raw string values from DB
            if rx.status in editable_statuses or rx.status in {"under_review", "reviewed", "active", "draft"}:
                return
            raise BusinessRuleError(
                "Cart can only be built while the prescription is active, under review, or reviewed"
            )
        raise AuthorizationError("Not allowed to edit this prescription")

    # ── Creation ─────────────────────────────────────────────────────────
    async def create_prescription(
        self, data: PrescriptionCreate, actor: User
    ) -> DigitalPrescription:
        if actor.role not in (UserRole.DOCTOR, UserRole.SUPER_ADMIN):
            raise AuthorizationError("Only doctors or super admin can create prescriptions")
        if not data.items:
            raise ValidationError("Prescription must have at least one medicine item")

        patient = await self._resolve_patient(actor=actor, patient_id=data.patient_id)

        doctor_id: Optional[str] = None
        hospital_id: Optional[str] = None
        if actor.role == UserRole.DOCTOR:
            doctor = await self._resolve_doctor(actor)
            doctor_id = doctor.id
            hospital_id = doctor.hospital_id

        for item in data.items:
            await self._validate_product_id(item.product_id)

        rx = DigitalPrescription(
            patient_id=patient.id,
            doctor_id=doctor_id,
            hospital_id=hospital_id,
            prescription_type=data.prescription_type,
            notes=data.notes,
            diagnosis_notes=data.diagnosis_notes,
            status=PrescriptionStatus.ACTIVE,
        )
        self.db.add(rx)
        await self.db.flush()

        for item_data in data.items:
            self.db.add(
                PrescriptionItem(
                    prescription_id=rx.id,
                    product_id=item_data.product_id,
                    medicine_name=item_data.medicine_name,
                    dosage=item_data.dosage,
                    frequency=item_data.frequency,
                    duration=item_data.duration,
                    quantity=item_data.quantity,
                    instructions=item_data.instructions,
                    substitution_allowed=item_data.substitution_allowed,
                )
            )
        await self.db.flush()

        try:
            await NotificationService(self.db).prescription_created(
                patient.user_id, rx.id
            )
        except Exception:
            pass

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="prescription.created",
            entity_type="DigitalPrescription",
            entity_id=rx.id,
        )

        return await self._get_or_404(rx.id)

    async def patient_upload(
        self, data: PrescriptionUploadCreate, actor: User
    ) -> DigitalPrescription:
        if actor.role != UserRole.PATIENT:
            raise AuthorizationError("Only patients can upload prescriptions")
        result = await self.db.execute(
            select(PatientProfile).where(PatientProfile.user_id == actor.id)
        )
        patient = result.scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient profile")

        rx = DigitalPrescription(
            patient_id=patient.id,
            prescription_type=PrescriptionType.PATIENT_UPLOADED,
            status=PrescriptionStatus.ACTIVE,
            uploaded_file_url=data.uploaded_file_url,
            notes=data.notes,
        )
        self.db.add(rx)
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="prescription.uploaded",
            entity_type="DigitalPrescription",
            entity_id=rx.id,
        )

        return await self._get_or_404(rx.id)

    # ── Read ─────────────────────────────────────────────────────────────
    async def get_prescription(
        self, prescription_id: str, actor: User
    ) -> DigitalPrescription:
        rx = await self._get_or_404(prescription_id)
        await self._assert_can_view_async(rx, actor)
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="prescription.viewed",
            entity_type="DigitalPrescription",
            entity_id=rx.id,
        )
        return rx

    async def list_prescriptions(
        self,
        actor: User,
        *,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[DigitalPrescription], int]:
        role = actor.role
        patient_id: Optional[str] = None
        doctor_id: Optional[str] = None

        if role == UserRole.PATIENT:
            res = await self.db.execute(
                select(PatientProfile).where(PatientProfile.user_id == actor.id)
            )
            patient = res.scalar_one_or_none()
            if not patient:
                return [], 0
            patient_id = patient.id
        elif role == UserRole.DOCTOR:
            res = await self.db.execute(
                select(DoctorProfile).where(DoctorProfile.user_id == actor.id)
            )
            doctor = res.scalar_one_or_none()
            if not doctor:
                return [], 0
            doctor_id = doctor.id
        elif role in _REVIEWER_ROLES:
            pass  # see all
        else:
            raise AuthorizationError("Not allowed to list prescriptions")

        return await self.repo.list_full(
            patient_id=patient_id,
            doctor_id=doctor_id,
            status=status,
            offset=offset,
            limit=limit,
        )

    async def list_for_patient(self, patient_id: str) -> List[DigitalPrescription]:
        return await self.repo.get_by_patient(patient_id)

    async def list_for_doctor(
        self,
        actor: User,
        *,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[DigitalPrescription], int]:
        doctor = await self._resolve_doctor(actor)
        return await self.repo.list_full(
            doctor_id=doctor.id, status=status, offset=offset, limit=limit
        )

    # ── Update ───────────────────────────────────────────────────────────
    async def update_prescription(
        self, prescription_id: str, data: PrescriptionUpdate, actor: User
    ) -> DigitalPrescription:
        rx = await self._get_or_404(prescription_id)
        role = actor.role

        # Pharmacists are reviewer-role users who can access all prescriptions.
        # They may update notes, status, and insurance coverage fields.
        if role in (UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN):
            if data.notes is not None:
                rx.notes = data.notes
            if data.status is not None:
                # Pharmacists may only advance to "reviewed" (cart ready for patient)
                # or back to "under_review" (needs more work).
                allowed_pharmacist_statuses = {"reviewed", "under_review"}
                if data.status not in allowed_pharmacist_statuses:
                    raise BusinessRuleError(
                        "Pharmacists may only set status to 'reviewed' or 'under_review'"
                    )
                old_status = rx.status
                rx.status = data.status
                if data.status == PrescriptionStatus.REVIEWED and old_status != PrescriptionStatus.REVIEWED:
                    patient_row = (
                        await self.db.execute(
                            select(PatientProfile).where(PatientProfile.id == rx.patient_id)
                        )
                    ).scalar_one_or_none()
                    if patient_row is not None:
                        await NotificationService(self.db).prescription_cart_ready(
                            patient_row.user_id,
                            rx.id,
                            notes=data.notes,
                        )
            # Insurance coverage: only set when pharmacist provides non-None values
            if data.insurance_provider is not None:
                rx.insurance_provider = data.insurance_provider or None
            if data.insurance_discount_pct is not None:
                if not (0 <= data.insurance_discount_pct <= 100):
                    raise BusinessRuleError("Insurance discount must be between 0 and 100%")
                rx.insurance_discount_pct = data.insurance_discount_pct
            await self.db.flush()
            return await self._get_or_404(rx.id)

        await self._assert_can_edit(rx, actor)
        if data.notes is not None:
            rx.notes = data.notes
        if data.diagnosis_notes is not None:
            rx.diagnosis_notes = data.diagnosis_notes
        if data.status is not None:
            rx.status = data.status
        await self.db.flush()
        return await self._get_or_404(rx.id)

    async def add_item(
        self, prescription_id: str, data: PrescriptionItemCreate, actor: User
    ) -> PrescriptionItem:
        rx = await self._get_or_404(prescription_id)
        await self._assert_can_edit(rx, actor)
        await self._validate_product_id(data.product_id)
        item = PrescriptionItem(
            prescription_id=rx.id,
            product_id=data.product_id,
            medicine_name=data.medicine_name,
            dosage=data.dosage,
            frequency=data.frequency,
            duration=data.duration,
            quantity=data.quantity,
            instructions=data.instructions,
            substitution_allowed=data.substitution_allowed,
        )
        self.db.add(item)
        await self.db.flush()
        return item

    async def update_item(
        self,
        prescription_id: str,
        item_id: str,
        data: PrescriptionItemUpdate,
        actor: User,
    ) -> PrescriptionItem:
        rx = await self._get_or_404(prescription_id)
        await self._assert_can_edit(rx, actor)
        result = await self.db.execute(
            select(PrescriptionItem).where(
                PrescriptionItem.id == item_id,
                PrescriptionItem.prescription_id == prescription_id,
            )
        )
        item = result.scalar_one_or_none()
        if not item:
            raise NotFoundError("PrescriptionItem", item_id)
        if data.product_id is not None:
            await self._validate_product_id(data.product_id)
            item.product_id = data.product_id
        if data.medicine_name is not None:
            item.medicine_name = data.medicine_name
        if data.dosage is not None:
            item.dosage = data.dosage
        if data.frequency is not None:
            item.frequency = data.frequency
        if data.duration is not None:
            item.duration = data.duration
        if data.quantity is not None:
            item.quantity = data.quantity
        if data.instructions is not None:
            item.instructions = data.instructions
        if data.substitution_allowed is not None:
            item.substitution_allowed = data.substitution_allowed
        await self.db.flush()
        return item

    async def delete_item(
        self, prescription_id: str, item_id: str, actor: User
    ) -> None:
        rx = await self._get_or_404(prescription_id)
        await self._assert_can_edit(rx, actor)
        result = await self.db.execute(
            select(PrescriptionItem).where(
                PrescriptionItem.id == item_id,
                PrescriptionItem.prescription_id == prescription_id,
            )
        )
        item = result.scalar_one_or_none()
        if not item:
            raise NotFoundError("PrescriptionItem", item_id)
        # Pharmacists may delete all items (they rebuild the full cart).
        # Patients cannot remove the last item — they should cancel the prescription.
        if len(rx.items) <= 1 and actor.role not in (
            UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN
        ):
            raise BusinessRuleError(
                "Cannot remove last item; cancel the prescription instead"
            )
        await self.db.delete(item)
        await self.db.flush()

    # ── Reviews ──────────────────────────────────────────────────────────
    async def list_reviews(
        self,
        actor: User,
        *,
        pharmacist_only_self: bool = False,
        prescription_id: Optional[str] = None,
        review_status: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[PrescriptionReview], int]:
        if actor.role not in _REVIEWER_ROLES:
            raise AuthorizationError("Only pharmacists or super admin can view reviews")
        pharmacist_id: Optional[str] = None
        if pharmacist_only_self and actor.role == UserRole.PHARMACIST:
            pharmacist = await self._resolve_pharmacist(actor)
            pharmacist_id = pharmacist.id
        return await self.review_repo.list_filtered(
            pharmacist_id=pharmacist_id,
            prescription_id=prescription_id,
            review_status=review_status,
            offset=offset,
            limit=limit,
        )

    async def review_prescription(
        self, data: PrescriptionReviewCreate, actor: User
    ) -> PrescriptionReview:
        if actor.role not in _REVIEWER_ROLES:
            raise AuthorizationError("Only pharmacists or super admin can review prescriptions")
        pharmacist = await self._resolve_pharmacist(actor)

        rx = await self._get_or_404(data.prescription_id)

        review = PrescriptionReview(
            prescription_id=rx.id,
            pharmacist_id=pharmacist.id,
            review_status=data.review_status,
            review_notes=data.review_notes,
            safety_flags=data.safety_flags,
        )
        self.db.add(review)

        # Reflect review outcome on the prescription
        if data.review_status == ReviewStatus.APPROVED:
            rx.status = PrescriptionStatus.REVIEWED
            from datetime import datetime, timedelta, timezone

            from app.services.platform_settings_service import PlatformSettingsService

            cfg = await PlatformSettingsService(self.db).get_delivery_config()
            days = int(cfg.get("prescription_valid_days", 90))
            rx.valid_until = datetime.now(timezone.utc) + timedelta(days=days)
        elif data.review_status == ReviewStatus.CLARIFICATION_NEEDED:
            rx.status = PrescriptionStatus.UNDER_REVIEW
        elif data.review_status == ReviewStatus.REJECTED:
            rx.status = PrescriptionStatus.CANCELLED

        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="prescription.reviewed",
            entity_type="PrescriptionReview",
            entity_id=review.id,
        )

        # Notify patient about the review outcome
        try:
            patient = await self.db.execute(
                select(PatientProfile).where(PatientProfile.id == rx.patient_id)
            )
            patient_row = patient.scalar_one_or_none()
            if patient_row is not None:
                await NotificationService(self.db).prescription_reviewed(
                    patient_row.user_id, rx.id, data.review_status
                )
        except Exception:
            pass
        return review

    async def update_review(
        self, review_id: str, data: PrescriptionReviewUpdate, actor: User
    ) -> PrescriptionReview:
        if actor.role not in _REVIEWER_ROLES:
            raise AuthorizationError("Only pharmacists or super admin can update reviews")
        review = await self.review_repo.get_with_prescription(review_id)
        if not review:
            raise NotFoundError("PrescriptionReview", review_id)

        if actor.role == UserRole.PHARMACIST:
            pharmacist = await self._resolve_pharmacist(actor)
            if review.pharmacist_id != pharmacist.id:
                raise AuthorizationError("Pharmacists can only edit their own reviews")

        if data.review_status is not None:
            review.review_status = data.review_status
        if data.review_notes is not None:
            review.review_notes = data.review_notes
        if data.safety_flags is not None:
            review.safety_flags = data.safety_flags

        # Cascade status change to the prescription
        if data.review_status is not None:
            rx = await self._get_or_404(review.prescription_id)
            if data.review_status == ReviewStatus.APPROVED:
                rx.status = PrescriptionStatus.REVIEWED
                from datetime import datetime, timedelta, timezone

                from app.services.platform_settings_service import PlatformSettingsService

                cfg = await PlatformSettingsService(self.db).get_delivery_config()
                days = int(cfg.get("prescription_valid_days", 90))
                rx.valid_until = datetime.now(timezone.utc) + timedelta(days=days)
            elif data.review_status == ReviewStatus.CLARIFICATION_NEEDED:
                rx.status = PrescriptionStatus.UNDER_REVIEW
            elif data.review_status == ReviewStatus.REJECTED:
                rx.status = PrescriptionStatus.CANCELLED

        await self.db.flush()
        return review
