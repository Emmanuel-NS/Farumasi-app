import api from "@/lib/api";

export const uploadService = {
  /** Logo or storefront photo shown on the patient store. */
  async uploadBrandImage(file: File, forApplication = false): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const endpoint = forApplication ? "/seller-applications/uploads/image" : "/uploads/image";
    const { data } = await api.post<{ url: string }>(endpoint, form);
    return data.url;
  },

  async uploadLicenseDocument(file: File, forApplication = false): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const contentType = (file.type || "").toLowerCase();
    const endpoint = forApplication
      ? contentType.startsWith("image/")
        ? "/seller-applications/uploads/image"
        : "/seller-applications/uploads/document"
      : contentType.startsWith("image/")
        ? "/uploads/image"
        : "/uploads/document";
    const { data } = await api.post<{ url: string }>(endpoint, form);
    return data.url;
  },
};
