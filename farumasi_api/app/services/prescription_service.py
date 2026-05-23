from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, ValidationError, BusinessRuleError
from app.core.constants import PrescriptionType, PrescriptionStatus, UserRole
from app.models.prescription import DigitalPrescription, PrescriptionItem, PrescriptionReview
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile
from app.repositories.prescription_repository import PrescriptionRepository, PrescriptionReviewRepository
from app.schemas.prescription import PrescriptionCreate, PrescriptionUpdate, PrescriptionItemCreate, PrescriptionReviewCreate, PrescriptionUploadCreate
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.models.user import User


class PrescriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PrescriptionRepository(db)

    async def create_prescription(
        self, data: PrescriptionCreate, actor: User
    ) -> DigitalPrescription:
        if not data.items:
            raise ValidationError("Prescription must have at least one medicine item")

        # Resolve patient profile
        patient_result = await self.db.execute(
            select(PatientProfile).where(PatientProfile.user_id == data.patient_id)
            if actor.role == UserRole.PATIENT
            else select(PatientProfile).where(PatientProfile.id == data.patient_id)
        )
        patient = patient_result.scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient")

        doctor_id = None
        hospital_id = None
        if actor.role == UserRole.DOCTOR:
            doc_result = await self.db.execute(
                select(DoctorProfile).where(DoctorProfile.user_id == actor.id)
            )
            doctor = doc_result.scalar_one_or_none()
            if doctor:
                doctor_id = doctor.id
                hospital_id = doctor.hospital_id

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
            item = PrescriptionItem(
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
            self.db.add(item)

        await self.db.flush()

        # Notify patient
        notif = NotificationService(self.db)
        await notif.prescription_created(patient.user_id, rx.id)

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="prescription.created",
            entity_type="DigitalPrescription",
            entity_id=rx.id,
        )

        result = await self.db.execute(
            select(DigitalPrescription).where(DigitalPrescription.id == rx.id).options(selectinload(DigitalPrescription.items))
        )
        return result.scalar_one()

    async def get_prescription(self, prescription_id: str) -> DigitalPrescription:
        rx = await self.repo.get_with_items(prescription_id)
        if not rx:
            raise NotFoundError("Prescription", prescription_id)
        return rx

    async def get_patient_prescriptions(self, patient_id: str) -> List[DigitalPrescription]:
        return await self.repo.get_by_patient(patient_id)

    async def patient_upload(
        self, data: PrescriptionUploadCreate, actor: User
    ) -> DigitalPrescription:
        """Patient uploads a scanned/photo prescription — creates a PATIENT_UPLOADED record."""
        patient_result = await self.db.execute(
            select(PatientProfile).where(PatientProfile.user_id == actor.id)
        )
        patient = patient_result.scalar_one_or_none()
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
        await self.db.commit()
        result = await self.db.execute(
            select(DigitalPrescription).where(DigitalPrescription.id == rx.id)
            .options(selectinload(DigitalPrescription.items))
        )
        return result.scalar_one()

    async def update_status(
        self, prescription_id: str, new_status: PrescriptionStatus, actor: User
    ) -> DigitalPrescription:
        rx = await self.repo.get_with_items(prescription_id)
        if not rx:
            raise NotFoundError("Prescription", prescription_id)
        rx.status = new_status
        await self.db.commit()
        return rx

    async def upload_prescription(
        self, patient: PatientProfile, file_url: str, notes: Optional[str] = None
    ) -> DigitalPrescription:
        rx = DigitalPrescription(
            patient_id=patient.id,
            prescription_type=PrescriptionType.PATIENT_UPLOADED,
            status=PrescriptionStatus.ACTIVE,
            uploaded_file_url=file_url,
            notes=notes,
        )
        self.db.add(rx)
        await self.db.flush()
        return rx

    async def add_item(
        self, prescription_id: str, data: PrescriptionItemCreate, actor: User
    ) -> PrescriptionItem:
        rx = await self.repo.get_by_id(prescription_id)
        if not rx:
            raise NotFoundError("Prescription", prescription_id)

        item = PrescriptionItem(
            prescription_id=prescription_id,
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

    async def review_prescription(
        self, data: PrescriptionReviewCreate, pharmacist_id: str
    ) -> PrescriptionReview:
        rx = await self.repo.get_by_id(data.prescription_id)
        if not rx:
            raise NotFoundError("Prescription", data.prescription_id)

        review = PrescriptionReview(
            prescription_id=data.prescription_id,
            pharmacist_id=pharmacist_id,
            review_status=data.review_status,
            review_notes=data.review_notes,
            safety_flags=data.safety_flags,
        )
        self.db.add(review)
        # Update prescription status
        rx.status = PrescriptionStatus.REVIEWED
        await self.db.flush()
        return review
