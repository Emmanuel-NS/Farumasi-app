import { api } from "@/lib/api";

export const consultationsService = {
  deleteMessage(consultationId: string, messageId: string) {
    return api.delete(`/consultations/${consultationId}/messages/${messageId}`);
  },

  editMessage(consultationId: string, messageId: string, content: string) {
    return api.patch(`/consultations/${consultationId}/messages/${messageId}`, {
      content,
    });
  },

  clearChat(consultationId: string) {
    return api.delete(`/consultations/${consultationId}/messages`);
  },
};
