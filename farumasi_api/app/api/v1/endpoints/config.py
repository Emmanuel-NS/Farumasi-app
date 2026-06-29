from __future__ import annotations

import asyncio
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

    pickup_only = is_outside_kigali(to_lat, to_lon) or road_km > max_km
    reason = None
    if is_outside_kigali(to_lat, to_lon):
        reason = (
            "Delivery is only available within Kigali city limits. "
            "Your location appears outside our delivery area — please choose pickup."
        )
    elif road_km > max_km:
        reason = (
            f"Delivery is not available beyond {max_km:.0f} km from the pharmacy "
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


class DistanceDestIn(BaseModel):
    id: str
    lat: float
    lon: float


class RoadDistanceBatchIn(BaseModel):
    from_lat: float
    from_lon: float
    destinations: list[DistanceDestIn] = Field(default_factory=list, max_length=30)


class RoadDistanceItemOut(BaseModel):
    id: str
    distance_km: float
    road_distance_km: float


class RoadDistanceBatchOut(BaseModel):
    distances: list[RoadDistanceItemOut]


@router.post("/road-distances", response_model=RoadDistanceBatchOut)
async def road_distances_batch(data: RoadDistanceBatchIn):
    """Road distances from patient → pharmacies (OSRM with Haversine fallback)."""

    async def one(dest: DistanceDestIn) -> RoadDistanceItemOut:
        straight = haversine_km(data.from_lat, data.from_lon, dest.lat, dest.lon)
        road = await road_distance_km(data.from_lat, data.from_lon, dest.lat, dest.lon)
        return RoadDistanceItemOut(
            id=dest.id,
            distance_km=straight,
            road_distance_km=road,
        )

    sem = asyncio.Semaphore(4)

    async def limited(dest: DistanceDestIn) -> RoadDistanceItemOut:
        async with sem:
            return await one(dest)

    distances = await asyncio.gather(*[limited(d) for d in data.destinations])
    return RoadDistanceBatchOut(distances=list(distances))


@router.get("/public")
async def public_config(db: AsyncSession = Depends(get_db)):
    from app.core.config import settings

    svc = PlatformSettingsService(db)
    cfg = await svc.get_delivery_config()
    pay_cfg = await svc.get_payment_config()
    methods = ["mtn_momo", "card"]
    manual_momo = None
    if pay_cfg.get("manual_momo_enabled", True):
        methods.append("manual_momo")
        code = (pay_cfg.get("manual_momo_pay_code") or "").strip()
        template = pay_cfg.get("manual_momo_dial_template") or "*182*8*1*{code}#"
        dial = template.replace("{code}", code) if code else None
        manual_momo = {
            "enabled": True,
            "merchant_name": pay_cfg.get("manual_momo_merchant_name") or "FARUMASI",
            "pay_code": code or None,
            "dial_string": dial,
            "instructions": pay_cfg.get("manual_momo_instructions"),
        }
    return {
        "delivery": cfg,
        "supported_languages": ["en", "rw", "fr", "sw"],
        "oauth": {
            "supabase_url": settings.SUPABASE_URL or None,
            "supabase_anon_key": settings.SUPABASE_ANON_KEY or None,
            "google_web_client_id": settings.GOOGLE_WEB_CLIENT_ID or None,
        },
        "payments": {
            "provider": "mtn_madapi",
            "card_provider": "pesapal",
            "processing_fee_percent": float(settings.PAYMENT_PROCESSING_FEE_PERCENT or 0),
            "currency": settings.PAYMENT_CURRENCY,
            "methods": methods,
            "default_payment_method": "mtn_momo",
            "manual_momo": manual_momo,
        },
    }


class PaymentConfigUpdate(BaseModel):
    manual_momo_enabled: Optional[bool] = None
    manual_momo_merchant_name: Optional[str] = None
    manual_momo_pay_code: Optional[str] = None
    manual_momo_dial_template: Optional[str] = None
    manual_momo_instructions: Optional[str] = None


@router.get("/payments", dependencies=[Depends(require_super_admin())])
async def get_payment_config(db: AsyncSession = Depends(get_db)):
    return await PlatformSettingsService(db).get_payment_config()


@router.put("/payments", dependencies=[Depends(require_super_admin())])
async def update_payment_config(
    data: PaymentConfigUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    svc = PlatformSettingsService(db)
    current = await svc.get_payment_config()
    patch = data.model_dump(exclude_unset=True)
    current.update(patch)
    updated = await svc.set_payment_config(current)
    from app.services.audit_service import AuditService

    await AuditService(db).log(
        actor_user_id=actor.id,
        action="platform_settings.payment.update",
        entity_type="PlatformSetting",
        entity_id="payment_config",
        new_value=patch,
    )
    await db.commit()
    return updated


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
