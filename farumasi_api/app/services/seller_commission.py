from __future__ import annotations

from app.core.config import settings


def effective_commission_rate_percent(stored_percent: float | None) -> float:
    """Return the commission % applied on order subtotals for this seller."""
    if stored_percent is not None:
        return float(stored_percent)
    return round(settings.PLATFORM_COMMISSION_RATE * 100, 2)


def commission_rate_source(stored_percent: float | None) -> str:
    return "custom" if stored_percent is not None else "platform_default"
