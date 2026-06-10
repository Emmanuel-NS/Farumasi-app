from __future__ import annotations

import copy
import math
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.platform_defaults import DEFAULT_DELIVERY_CONFIG
from app.models.platform_setting import PlatformSetting

DELIVERY_CONFIG_KEY = "delivery_config"


class PlatformSettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_delivery_config(self) -> dict[str, Any]:
        result = await self.db.execute(
            select(PlatformSetting).where(PlatformSetting.key == DELIVERY_CONFIG_KEY)
        )
        row = result.scalar_one_or_none()
        if not row or not row.value:
            return copy.deepcopy(DEFAULT_DELIVERY_CONFIG)
        merged = copy.deepcopy(DEFAULT_DELIVERY_CONFIG)
        merged.update(row.value)
        return merged

    async def set_delivery_config(self, value: dict[str, Any]) -> dict[str, Any]:
        result = await self.db.execute(
            select(PlatformSetting).where(PlatformSetting.key == DELIVERY_CONFIG_KEY)
        )
        row = result.scalar_one_or_none()
        if row:
            row.value = value
        else:
            self.db.add(PlatformSetting(key=DELIVERY_CONFIG_KEY, value=value))
        await self.db.flush()
        return await self.get_delivery_config()


def calculate_delivery_fee_from_config(distance_km: float, config: dict[str, Any]) -> float:
    tiers = config.get("tiers") or DEFAULT_DELIVERY_CONFIG["tiers"]
    sorted_tiers = sorted(tiers, key=lambda t: float(t["max_km"]))
    for tier in sorted_tiers:
        if distance_km <= float(tier["max_km"]):
            return float(tier["fee_rwf"])
    base = float(config.get("base_over_20_rwf", 2500))
    extra_fee = float(config.get("extra_km_fee_rwf", 150))
    extra_km = math.ceil(distance_km - float(sorted_tiers[-1]["max_km"]))
    return base + extra_km * extra_fee
