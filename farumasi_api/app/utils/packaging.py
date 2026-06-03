"""Packaging class rules and order-line pricing for partial selling."""
from __future__ import annotations

from typing import Optional, Tuple

from app.core.constants import PARTIAL_SELLING_CLASSES, PackagingClass, SellMode
from app.core.exceptions import BusinessRuleError, ValidationError
from app.models.product import ProductCatalogueItem, ProductListing

# Default minimum units when pharmacist has not set min_partial_quantity
_DEFAULT_MIN_PARTIAL: dict[str, int] = {
    PackagingClass.TABLETS_CAPSULES.value: 2,
    PackagingClass.SACHETS.value: 1,
    PackagingClass.AMPOULES_VIALS.value: 1,
}


def packaging_allows_partial(packaging_class: Optional[str]) -> bool:
    return packaging_class in PARTIAL_SELLING_CLASSES


def effective_min_partial_quantity(product: ProductCatalogueItem) -> int:
    if product.min_partial_quantity is not None and product.min_partial_quantity >= 1:
        return int(product.min_partial_quantity)
    pc = product.packaging_class
    if pc in _DEFAULT_MIN_PARTIAL:
        return _DEFAULT_MIN_PARTIAL[pc]  # type: ignore[index]
    return 1


def validate_product_packaging_fields(
    *,
    packaging_class: Optional[str],
    units_per_pack: Optional[int],
    min_partial_quantity: Optional[int],
    partial_unit_name: Optional[str],
) -> None:
    if not packaging_class:
        return
    if packaging_allows_partial(packaging_class):
        if not partial_unit_name or not str(partial_unit_name).strip():
            raise ValidationError("Unit name is required for partial-selling packaging (e.g. tablet, sachet)")
        min_q = min_partial_quantity if min_partial_quantity is not None else _DEFAULT_MIN_PARTIAL.get(
            packaging_class, 1
        )
        if packaging_class == PackagingClass.TABLETS_CAPSULES and min_q < 2:
            raise ValidationError("Minimum order for tablets/capsules must be at least 2 units")
        if min_q < 1:
            raise ValidationError("Minimum partial quantity must be at least 1")
        if units_per_pack is not None and units_per_pack < 1:
            raise ValidationError("Units per pack must be at least 1 when specified")
    else:
        if min_partial_quantity is not None or partial_unit_name:
            raise ValidationError(
                "Partial unit fields are only allowed for tablets/capsules, sachets, or ampoules/vials"
            )


def validate_listing_prices(
    product: ProductCatalogueItem,
    price: float,
    unit_price: Optional[float],
) -> None:
    if price < 0:
        raise ValidationError("Pack/container price cannot be negative")
    if product.allows_partial_selling:
        if unit_price is None or unit_price <= 0:
            raise ValidationError(
                f"Per-{product.partial_unit_name or 'unit'} price is required for this packaging class"
            )
    elif unit_price is not None:
        raise ValidationError("Unit price is only allowed for partial-selling products")


def resolve_order_line(
    listing: ProductListing,
    product: Optional[ProductCatalogueItem],
    quantity: int,
    sell_mode: str = SellMode.PACK,
) -> Tuple[float, int, str]:
    """Return (unit_price, stock_units_to_deduct, normalized_sell_mode)."""
    if quantity < 1:
        raise ValidationError("Quantity must be at least 1")

    mode = sell_mode if sell_mode in (SellMode.PACK, SellMode.PARTIAL) else SellMode.PACK

    if mode == SellMode.PARTIAL:
        if not product or not product.allows_partial_selling:
            raise BusinessRuleError("This product cannot be sold in partial units")
        if listing.unit_price is None or float(listing.unit_price) <= 0:
            raise BusinessRuleError(
                f"Pharmacy has not set a per-{product.partial_unit_name or 'unit'} price for this item"
            )
        min_q = effective_min_partial_quantity(product)
        if quantity < min_q:
            unit = product.partial_unit_name or "units"
            raise BusinessRuleError(f"Minimum order is {min_q} {unit}")
        return float(listing.unit_price), quantity, SellMode.PARTIAL

    # Whole pack / container
    if product and product.allows_partial_selling:
        units = product.units_per_pack or 1
        stock_units = quantity * max(1, int(units))
    else:
        stock_units = quantity
    return float(listing.price), stock_units, SellMode.PACK
