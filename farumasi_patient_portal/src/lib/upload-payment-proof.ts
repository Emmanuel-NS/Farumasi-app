import api from "@/lib/api";
import { compressImageForUpload } from "@/lib/compress-upload-image";

const UPLOAD_TIMEOUT_MS = 120_000;
const MAX_PROOF_BYTES = 10 * 1024 * 1024;

export async function uploadPaymentProof(file: File): Promise<string> {
  const prepared = await compressImageForUpload(file);
  if (prepared.size > MAX_PROOF_BYTES) {
    throw new Error(
      `File is too large after compression (${Math.round(prepared.size / 1024 / 1024)} MB). Try a smaller screenshot.`,
    );
  }

  const form = new FormData();
  form.append("file", prepared);
  const { data } = await api.post<{ url: string }>("/uploads/payment-proof", form, {
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return data.url;
}
