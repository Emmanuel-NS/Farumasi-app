"""Product-type rules for pharmacy vs partner sellers (Rwanda FDA alignment)."""
from __future__ import annotations

from app.core.constants import ProductType


PHARMACY_ONLY_PRODUCT_TYPES = frozenset({ProductType.MEDICINE.value})

PARTNER_ALLOWED_PRODUCT_TYPES = frozenset(
    {
        ProductType.MEDICAL_DEVICE.value,
        ProductType.FOOD_SUPPLEMENTS.value,
        ProductType.COSMETICS.value,
    }
)


def is_medicine_product(product_type: str | None) -> bool:
    return (product_type or ProductType.MEDICINE.value) == ProductType.MEDICINE.value


def partner_may_list_product(product_type: str | None) -> bool:
    return not is_medicine_product(product_type)


def pharmacy_may_list_product(_product_type: str | None) -> bool:
    return True
