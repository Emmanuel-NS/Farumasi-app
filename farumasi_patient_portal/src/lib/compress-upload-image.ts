/** Prepare camera/gallery images for upload — resize and re-encode as JPEG. */
export async function compressImageForUpload(
  file: File,
  opts?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxBytes?: number;
  },
): Promise<File> {
  const maxWidth = opts?.maxWidth ?? 1920;
  const maxHeight = opts?.maxHeight ?? 1920;
  const quality = opts?.quality ?? 0.82;
  const maxBytes = opts?.maxBytes ?? 2.5 * 1024 * 1024;

  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  if (file.size <= 400_000 && file.type === "image/jpeg") {
    return file;
  }

  if (typeof document === "undefined") return file;

  try {
    const compressed = await new Promise<File | null>((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }
            const base = file.name.replace(/\.[^.]+$/, "") || "proof";
            resolve(
              new File([blob], `${base}.jpg`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              }),
            );
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      img.src = objectUrl;
    });

    if (!compressed) return file;
    if (compressed.size > maxBytes && quality > 0.55) {
      return compressImageForUpload(compressed, {
        ...opts,
        quality: Math.max(0.55, quality - 0.12),
        maxWidth: Math.round(maxWidth * 0.85),
        maxHeight: Math.round(maxHeight * 0.85),
      });
    }
    return compressed.size < file.size ? compressed : file;
  } catch {
    return file;
  }
}
