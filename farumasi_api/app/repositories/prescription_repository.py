from __future__ import annotations

from typing import List, Optional, Sequence

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.prescription import DigitalPrescription, PrescriptionItem, PrescriptionReview
from app.models.patient import PatientProfile
from app.repositories.base import BaseRepository


def _full_load_options():
    return (
        selectinload(DigitalPrescription.items),
        selectinload(DigitalPrescription.patient).selectinload(PatientProfile.user),
    )


class PrescriptionRepository(BaseRepository[DigitalPrescription]):
    model = DigitalPrescription

    async def get_with_items(self, prescription_id: str) -> Optional[DigitalPrescription]:
        result = await self.db.execute(
            select(DigitalPrescription)
            .where(DigitalPrescription.id == prescription_id)
            .options(selectinload(DigitalPrescription.items))
        )
        return result.scalar_one_or_none()

    async def get_full(self, prescription_id: str) -> Optional[DigitalPrescription]:
        """Load a prescription with items + patient.user eagerly (safe for PrescriptionOut)."""
        result = await self.db.execute(
            select(DigitalPrescription)
            .where(DigitalPrescription.id == prescription_id)
            .options(*_full_load_options())
        )
        return result.scalar_one_or_none()

    async def list_full(
        self,
        *,
        patient_id: Optional[str] = None,
        doctor_id: Optional[str] = None,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[DigitalPrescription], int]:
        conditions = []
        if patient_id is not None:
            conditions.append(DigitalPrescription.patient_id == patient_id)
        if doctor_id is not None:
            conditions.append(DigitalPrescription.doctor_id == doctor_id)
        if status is not None:
            conditions.append(DigitalPrescription.status == status)

        count_q = select(func.count(DigitalPrescription.id))
        if conditions:
            count_q = count_q.where(*conditions)
        total = (await self.db.execute(count_q)).scalar_one()

        q = select(DigitalPrescription).options(*_full_load_options())
        if conditions:
            q = q.where(*conditions)
        q = q.order_by(DigitalPrescription.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return list(result.scalars().all()), int(total or 0)

    async def get_by_patient(self, patient_id: str) -> List[DigitalPrescription]:
        result = await self.db.execute(
            select(DigitalPrescription)
            .where(DigitalPrescription.patient_id == patient_id)
            .options(*_full_load_options())
            .order_by(DigitalPrescription.created_at.desc())
        )
        return list(result.scalars().all())


class PrescriptionReviewRepository(BaseRepository[PrescriptionReview]):
    model = PrescriptionReview

    async def get_with_prescription(self, review_id: str) -> Optional[PrescriptionReview]:
        result = await self.db.execute(
            select(PrescriptionReview).where(PrescriptionReview.id == review_id)
        )
        return result.scalar_one_or_none()

    async def list_filtered(
        self,
        *,
        pharmacist_id: Optional[str] = None,
        prescription_id: Optional[str] = None,
        review_status: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[PrescriptionReview], int]:
        conditions = []
        if pharmacist_id is not None:
            conditions.append(PrescriptionReview.pharmacist_id == pharmacist_id)
        if prescription_id is not None:
            conditions.append(PrescriptionReview.prescription_id == prescription_id)
        if review_status is not None:
            conditions.append(PrescriptionReview.review_status == review_status)

        count_q = select(func.count(PrescriptionReview.id))
        if conditions:
            count_q = count_q.where(*conditions)
        total = (await self.db.execute(count_q)).scalar_one()

        q = select(PrescriptionReview)
        if conditions:
            q = q.where(*conditions)
        q = q.order_by(PrescriptionReview.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return list(result.scalars().all()), int(total or 0)

