from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.prescription import DigitalPrescription, PrescriptionItem, PrescriptionReview
from app.repositories.base import BaseRepository


class PrescriptionRepository(BaseRepository[DigitalPrescription]):
    model = DigitalPrescription

    async def get_with_items(self, prescription_id: str) -> Optional[DigitalPrescription]:
        result = await self.db.execute(
            select(DigitalPrescription)
            .where(DigitalPrescription.id == prescription_id)
            .options(selectinload(DigitalPrescription.items))
        )
        return result.scalar_one_or_none()

    async def get_by_patient(self, patient_id: str) -> List[DigitalPrescription]:
        result = await self.db.execute(
            select(DigitalPrescription)
            .where(DigitalPrescription.patient_id == patient_id)
            .options(selectinload(DigitalPrescription.items))
            .order_by(DigitalPrescription.created_at.desc())
        )
        return list(result.scalars().all())


class PrescriptionReviewRepository(BaseRepository[PrescriptionReview]):
    model = PrescriptionReview
