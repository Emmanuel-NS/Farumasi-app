/** Consult chat attachment helpers — keep product vs image vs file distinct. */

const PRODUCT_PATH = /\/(?:store|inventory|products)\/([^/?#]+)/i;
const UPLOAD_PATH = /\/uploads\//i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i;

export function isUploadAttachmentUrl(url: string): boolean {
  return UPLOAD_PATH.test(url);
}

export function isProductAttachmentUrl(url: string): boolean {
  if (isUploadAttachmentUrl(url)) return false;
  return PRODUCT_PATH.test(url);
}

/** Store route for a shared product, or undefined when not a product link. */
export function consultProductPath(url: string | null | undefined): string | undefined {
  if (!url || !isProductAttachmentUrl(url)) return undefined;
  const match = url.match(PRODUCT_PATH);
  if (!match) return undefined;
  return `/store/${match[1]}`;
}

export function productIdFromPath(url?: string | null): string | undefined {
  const path = consultProductPath(url ?? undefined);
  if (!path) return undefined;
  const match = path.match(/\/store\/([^/?#]+)/i);
  return match?.[1];
}

function isLikelyImageUrl(url: string): boolean {
  return (
    /^data:image\//i.test(url) ||
    /^blob:/i.test(url) ||
    IMAGE_EXT.test(url) ||
    /\/uploads\/(?:images?|media)\//i.test(url) ||
    (url.includes("res.cloudinary.com/") && /\/image\//i.test(url))
  );
}

export function inferAttachmentType(
  url: string | null | undefined,
  declared?: string | null,
): "image" | "file" | "product" | undefined {
  if (!url) return undefined;

  const normalizedDeclared =
    declared === "image" || declared === "file" || declared === "product"
      ? declared
      : undefined;

  if (isUploadAttachmentUrl(url)) {
    if (normalizedDeclared === "image" || normalizedDeclared === "file") {
      return normalizedDeclared;
    }
    return isLikelyImageUrl(url) ? "image" : "file";
  }

  if (isProductAttachmentUrl(url)) return "product";
  if (normalizedDeclared === "product") return "product";
  if (normalizedDeclared === "image") return isLikelyImageUrl(url) ? "image" : "file";
  if (normalizedDeclared === "file") return "file";
  if (isLikelyImageUrl(url)) return "image";
  return "file";
}
