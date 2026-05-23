from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.patient import PatientProfile
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.core.exceptions import NotFoundError

router = APIRouter()


@router.post("/", response_model=RecommendationResponse)
async def get_recommendations(
    data: RecommendationRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == actor.id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise NotFoundError("Patient profile")
    return await RecommendationService(db).recommend(data, patient_id=patient.id)
