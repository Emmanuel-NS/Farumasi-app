from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services.recommendation_service import RecommendationService

router = APIRouter()


@router.post("/pharmacies", response_model=RecommendationResponse)
async def recommend_pharmacies(
    data: RecommendationRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Return up to top-3 ranked pharmacies/partners for a prescription or ad-hoc basket."""
    return await RecommendationService(db).recommend(data, actor)


@router.get(
    "/prescription/{prescription_id}",
    response_model=RecommendationResponse,
)
async def recommend_for_prescription(
    prescription_id: str,
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
    preferred_delivery: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Shortcut for an existing prescription: pass only location and delivery preference."""
    return await RecommendationService(db).recommend_for_prescription(
        prescription_id=prescription_id,
        actor=actor,
        latitude=lat,
        longitude=lon,
        preferred_delivery=preferred_delivery,
    )
