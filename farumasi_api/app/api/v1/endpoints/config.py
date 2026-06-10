from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_super_admin
from app.models.user import User
from app.services.platform_settings_service import PlatformSettingsService
from app.utils.distance import haversine_km, is_outside_kigali, road_distance_km
from app.services.platform_settings_service import calculate_delivery_fee_from_config

router = APIRouter()


class DeliveryQuoteOut(BaseModel):
    distance_km: float
    road_distance_km: float
    delivery_fee_rwf: float
    delivery_available: bool
    pickup_only_reason: Optional[str] = None
    max_delivery_km: float
    tiers: list


@router.get("/delivery-quote", response_model=DeliveryQuoteOut)
async def delivery_quote(
    from_lat: float = Query(...),
    from_lon: float = Query(...),
    to_lat: float = Query(...),
    to_lon: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    cfg = await PlatformSettingsService(db).get_delivery_config()
    max_km = float(cfg.get("max_delivery_km", 20))
    straight = haversine_km(from_lat, from_lon, to_lat, to_lon)
    road_factor = float(cfg.get("road_distance_factor", 1.3))
    road_km = await road_distance_km(from_lat, from_lon, to_lat, to_lon)
    fee = calculate_delivery_fee_from_config(road_km, cfg)

    pickup_only = road_km > max_km and is_outside_kigali(to_lat, to_lon)
    reason = None
    if pickup_only:
        reason = (
            f"Delivery is not available beyond {max_km:.0f} km outside Kigali "
            f"({road_km:.1f} km). Please choose pickup."
        )

    return DeliveryQuoteOut(
        distance_km=straight,
        road_distance_km=road_km,
        delivery_fee_rwf=0.0 if pickup_only else fee,
        delivery_available=not pickup_only,
        pickup_only_reason=reason,
        max_delivery_km=max_km,
        tiers=cfg.get("tiers") or [],
    )


@router.get("/public")
async def public_config(db: AsyncSession = Depends(get_db)):
    cfg = await PlatformSettingsService(db).get_delivery_config()
    return {
        "delivery": cfg,
        "supported_languages": ["en", "rw", "fr", "sw"],
    }


class DeliveryConfigUpdate(BaseModel):
    tiers: Optional[list] = None
    base_over_20_rwf: Optional[float] = None
    extra_km_fee_rwf: Optional[float] = None
    max_delivery_km: Optional[float] = None
    unpaid_order_ttl_minutes: Optional[int] = None
    prescription_valid_days: Optional[int] = None


@router.put("/delivery", dependencies=[Depends(require_super_admin())])
async def update_delivery_config(
    data: DeliveryConfigUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    svc = PlatformSettingsService(db)
    current = await svc.get_delivery_config()
    patch = data.model_dump(exclude_unset=True)
    current.update(patch)
    updated = await svc.set_delivery_config(current)
    from app.services.audit_service import AuditService

    await AuditService(db).log(
        actor_user_id=actor.id,
        action="platform_settings.delivery.update",
        entity_type="PlatformSetting",
        entity_id="delivery_config",
        new_value=patch,
    )
    return updated
