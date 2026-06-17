import api from "@/lib/api";

export const uploadService = {
  async uploadLicenseDocument(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const contentType = (file.type || "").toLowerCase();
    const endpoint = contentType.startsWith("image/") ? "/uploads/image" : "/uploads/document";
    const { data } = await api.post<{ url: string }>(endpoint, form);
    return data.url;
  },
};
