import type { BackendListing, BackendProduct } from "@/lib/services/listings.service";
import type { ProductSortKey } from "@/components/products/products-toolbar";

export function sortProducts(items: BackendProduct[], sort: ProductSortKey): BackendProduct[] {
  const copy = [...items];
  switch (sort) {
    case "name_desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    case "category":
      return copy.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "") || a.name.localeCompare(b.name));
    case "rx_first":
      return copy.sort((a, b) => Number(b.prescription_required) - Number(a.prescription_required) || a.name.localeCompare(b.name));
    case "name_asc":
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function sortListings(items: BackendListing[], sort: ProductSortKey): BackendListing[] {
  const copy = [...items];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price_desc":
      return copy.sort((a, b) => b.price - a.price);
    case "stock_asc":
      return copy.sort((a, b) => a.stock_quantity - b.stock_quantity);
    case "stock_desc":
      return copy.sort((a, b) => b.stock_quantity - a.stock_quantity);
    case "name_desc":
      return copy.sort((a, b) => (b.product?.name ?? "").localeCompare(a.product?.name ?? ""));
    case "category":
      return copy.sort(
        (a, b) =>
          (a.product?.category ?? "").localeCompare(b.product?.category ?? "") ||
          (a.product?.name ?? "").localeCompare(b.product?.name ?? ""),
      );
    case "rx_first":
      return copy.sort(
        (a, b) =>
          Number(b.product?.prescription_required) - Number(a.product?.prescription_required) ||
          (a.product?.name ?? "").localeCompare(b.product?.name ?? ""),
      );
    case "name_asc":
    default:
      return copy.sort((a, b) => (a.product?.name ?? "").localeCompare(b.product?.name ?? ""));
  }
}
