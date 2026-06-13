import api from "@/lib/api";

export interface ApiMessage {
  id: string;
  content: string | null;
  sender_id: string;
  sender_name: string;
  sent_at: string;
  is_read: boolean;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
}

export interface ApiConsultation {
  id: string;
  patient_id: string;
  patient_name: string;
  pharmacist_id: string;
  pharmacist_name: string;
  status: string;
  created_at: string;
  messages: ApiMessage[];
}

export interface ConsultationPreview {
  id: string;
  patientName: string;
  lastMessage?: string;
  lastAt?: string;
  unread: number;
}

function previewText(lastMsg: ApiMessage | undefined): string {
  if (!lastMsg) return "No messages yet";
  if (lastMsg.content) return lastMsg.content;
  if (lastMsg.attachment_type === "image") return "📷 Photo";
  if (lastMsg.attachment_type === "product")
    return `🛒 ${lastMsg.attachment_name ?? "Product"}`;
  if (lastMsg.attachment_type === "file")
    return `📎 ${lastMsg.attachment_name ?? "File"}`;
  return "No messages yet";
}

function toPreview(c: ApiConsultation, myId?: string): ConsultationPreview {
  const lastMsg = c.messages?.[c.messages.length - 1];
  const unread = (c.messages ?? []).filter(
    (m) => !m.is_read && m.sender_id !== myId,
  ).length;
  return {
    id: c.id,
    patientName: c.patient_name,
    lastMessage: previewText(lastMsg),
    lastAt: lastMsg?.sent_at,
    unread,
  };
}

export const consultationsService = {
  async list(limit = 20, myId?: string): Promise<ConsultationPreview[]> {
    const { data } = await api.get<{ items?: ApiConsultation[] }>(
      "/consultations/",
      { params: { limit } },
    );
    const items = data.items ?? [];
    return items
      .map((c) => toPreview(c, myId))
      .sort((a, b) => {
        const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
        const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
        return tb - ta;
      });
  },

  async unreadCount(myId?: string): Promise<number> {
    try {
      const { data } = await api.get<{ items?: ApiConsultation[] }>(
        "/consultations/",
        { params: { limit: 50 } },
      );
      const items = data.items ?? [];
      return items.reduce((sum, c) => {
        const unread = (c.messages ?? []).filter(
          (m) => !m.is_read && m.sender_id !== myId,
        ).length;
        return sum + unread;
      }, 0);
    } catch {
      return 0;
    }
  },
};
