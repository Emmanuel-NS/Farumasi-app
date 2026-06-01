"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react";
import { pharmacistsService } from "@/lib/services/pharmacists.service";
import { productsService } from "@/lib/services/products.service";
import { api, mediaUrl } from "@/lib/api";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { GuestGate } from "@/components/shared/guest-gate";
import { useAuthStore } from "@/store/auth-store";
import type { Pharmacist, ChatMessage, Medicine } from "@/types";
import Link from "next/link";
import {
  Send,
  ChevronLeft,
  Search,
  X,
  MessageCircle,
  CheckCheck,
  Camera,
  Plus,
  Image as ImageIcon,
  FileText,
  EyeOff,
  Eye,
  Info,
  Download,
  Clock,
  Star,
  Mail,
  Phone,
  Briefcase,
  Package,
  ExternalLink,
  Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ConsultationSummary {
  id: string;
  pharmacistId: string;
  status: string;
  isAnonymous: boolean;
  messages: ChatMessage[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

interface ApiMessage {
  id: string;
  sender_id: string;
  content: string;
  sent_at?: string;
  created_at?: string;
  is_read?: boolean;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: "image" | "file" | "product" | null;
  attachment_size?: number | null;
}
interface ApiConsultation {
  id: string;
  patient_id: string;
  pharmacist_id: string;
  status: string;
  is_anonymous?: boolean;
  messages?: ApiMessage[];
}

interface PendingAttachment {
  url: string;
  name: string;
  type: "image" | "file" | "product";
  size: number;
}

type ThreadKey = string; // `${pharmacistId}|${anon ? 1 : 0}`

const STATUS_DOT: Record<string, string> = {
  available: "bg-green-500",
  busy: "bg-amber-400",
  offline: "bg-slate-300",
};

const keyOf = (phId: string, anon: boolean): ThreadKey =>
  `${phId}|${anon ? "1" : "0"}`;
const parseKey = (k: ThreadKey): { phId: string; anon: boolean } => {
  const [phId, anon] = k.split("|");
  return { phId, anon: anon === "1" };
};

function adaptMessages(raw: ApiMessage[] | undefined, myId: string | undefined): ChatMessage[] {
  return (raw ?? [])
    .map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      content: m.content ?? "",
      timestamp: new Date(m.sent_at ?? m.created_at ?? Date.now()),
      isMe: m.sender_id === myId,
      attachmentUrl: m.attachment_type === "product"
        ? (m.attachment_url ?? undefined)
        : mediaUrl(m.attachment_url ?? undefined) || undefined,
      attachmentName: m.attachment_name ?? undefined,
      attachmentType: (m.attachment_type ?? undefined) as
        | "image"
        | "file"
        | "product"
        | undefined,
      attachmentSize: m.attachment_size ?? undefined,
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function adaptConsultation(
  c: ApiConsultation,
  myId: string | undefined,
): ConsultationSummary {
  const messages = adaptMessages(c.messages, myId);
  const unreadCount = (c.messages ?? []).filter(
    (m) => m.sender_id !== myId && m.is_read === false,
  ).length;
  return {
    id: c.id,
    pharmacistId: c.pharmacist_id,
    status: c.status,
    isAnonymous: !!c.is_anonymous,
    messages,
    lastMessage: messages[messages.length - 1],
    unreadCount,
  };
}

function getErrDetail(e: unknown): string | undefined {
  const r = (e as { response?: { data?: { detail?: string } } })?.response;
  return r?.data?.detail;
}

function humanSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB

// ── Component ────────────────────────────────────────────────────────────────
export default function ConsultPage() {
  const t = useTranslation();
  const authUser = useAuthStore((s) => s.user);
  const myId = authUser?.id;

  const [pharmacists, setPharmacists] = useState<Pharmacist[]>([]);
  const [consultsByKey, setConsultsByKey] = useState<Map<ThreadKey, ConsultationSummary>>(
    new Map(),
  );
  const [selectedKey, setSelectedKey] = useState<ThreadKey | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "chats">("all");
  const [loadingChat, setLoadingChat] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Patient avatar persisted across reloads
  const [patientAvatar, setPatientAvatar] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("farumasi_patient_avatar");
    if (stored?.startsWith("data:")) setPatientAvatar(stored);
    else if (stored) localStorage.removeItem("farumasi_patient_avatar");
  }, []);

  // ── Initial loads ─────────────────────────────────────────────────────────
  useEffect(() => {
    pharmacistsService.list(50).then(setPharmacists).catch(() => {});
  }, []);

  // Preload existing consultations so chat history shows immediately
  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/consultations/", { params: { limit: 50 } });
        const items: ApiConsultation[] = data.items ?? [];
        if (cancelled) return;
        const map = new Map<ThreadKey, ConsultationSummary>();
        for (const c of items) {
          const summary = adaptConsultation(c, myId);
          const k = keyOf(summary.pharmacistId, summary.isAnonymous);
          const existing = map.get(k);
          const newer =
            !existing ||
            (summary.lastMessage &&
              existing.lastMessage &&
              summary.lastMessage.timestamp > existing.lastMessage.timestamp) ||
            (summary.lastMessage && !existing.lastMessage);
          if (newer) map.set(k, summary);
        }
        setConsultsByKey(map);
      } catch {
        // non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myId]);

  // ── Derived selection ─────────────────────────────────────────────────────
  const selectedParsed = selectedKey ? parseKey(selectedKey) : null;
  const selectedPh = useMemo(
    () =>
      selectedParsed
        ? pharmacists.find((p) => p.id === selectedParsed.phId) ?? null
        : null,
    [pharmacists, selectedParsed],
  );
  const selectedConsult = selectedKey ? consultsByKey.get(selectedKey) ?? null : null;
  const isAnon = selectedParsed?.anon ?? false;
  const messages = selectedConsult?.messages ?? [];

  // ── Poll current chat for inbound messages ────────────────────────────────
  useEffect(() => {
    const consultId = selectedConsult?.id;
    if (!consultId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/consultations/${consultId}`);
        const fresh = adaptConsultation(data, myId);
        const k = keyOf(fresh.pharmacistId, fresh.isAnonymous);
        setConsultsByKey((prev) => {
          const next = new Map(prev);
          const cur = next.get(k);
          const pending = (cur?.messages ?? []).filter((m) =>
            m.id.startsWith("tmp-"),
          );
          const merged = [...fresh.messages, ...pending];
          next.set(k, {
            ...fresh,
            messages: merged,
            lastMessage: merged[merged.length - 1],
          });
          return next;
        });
      } catch {
        // silently retry next tick
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConsult?.id, myId]);

  // Mark-as-read when opening a chat
  useEffect(() => {
    if (!selectedConsult?.id || selectedConsult.unreadCount === 0) return;
    const id = selectedConsult.id;
    const k = keyOf(selectedConsult.pharmacistId, selectedConsult.isAnonymous);
    api.patch(`/consultations/${id}/messages/read`).catch(() => {});
    setConsultsByKey((prev) => {
      const next = new Map(prev);
      const cur = next.get(k);
      if (cur) next.set(k, { ...cur, unreadCount: 0 });
      return next;
    });
  }, [
    selectedConsult?.id,
    selectedConsult?.unreadCount,
    selectedConsult?.pharmacistId,
    selectedConsult?.isAnonymous,
  ]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Reset transient chat-scoped UI when the selected thread changes
  useEffect(() => {
    setPendingAttachment(null);
    setAttachMenuOpen(false);
    setShowProfile(false);
    setInput("");
  }, [selectedKey]);

  // ── Open or start a thread ────────────────────────────────────────────────
  const openThread = useCallback(
    async (ph: Pharmacist, anon: boolean) => {
      const k = keyOf(ph.id, anon);
      setSelectedKey(k);
      const existing = consultsByKey.get(k);
      if (existing) return;
      setLoadingChat(true);
      try {
        const { data } = await api.post("/consultations/", {
          pharmacist_id: ph.id,
          is_anonymous: anon,
        });
        const summary = adaptConsultation(data, myId);
        const realKey = keyOf(summary.pharmacistId, summary.isAnonymous);
        setConsultsByKey((prev) => new Map(prev).set(realKey, summary));
        setSelectedKey(realKey);
      } catch (e) {
        const detail = getErrDetail(e);
        toast.error(detail ?? "Couldn't start the conversation. Please try again.");
        setSelectedKey(null);
      } finally {
        setLoadingChat(false);
      }
    },
    [consultsByKey, myId],
  );

  // Toggle current conversation between normal and anonymous (opens the twin
  // thread — never converts the existing one, so the two stay unmixed).
  const toggleAnonymousMode = useCallback(() => {
    if (!selectedPh || !selectedParsed) return;
    openThread(selectedPh, !selectedParsed.anon);
  }, [openThread, selectedPh, selectedParsed]);

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!selectedConsult || !selectedPh || sending) return;
    if (!content && !pendingAttachment) return;
    if (selectedConsult.status !== "open") {
      toast.error("This consultation is closed.");
      return;
    }
    const tmpId = `tmp-${Date.now()}`;
    const tmp: ChatMessage = {
      id: tmpId,
      senderId: myId ?? "patient",
      content,
      timestamp: new Date(),
      isMe: true,
      attachmentUrl: pendingAttachment?.url,
      attachmentName: pendingAttachment?.name,
      attachmentType: pendingAttachment?.type,
      attachmentSize: pendingAttachment?.size,
    };
    const k = keyOf(selectedConsult.pharmacistId, selectedConsult.isAnonymous);
    const consultId = selectedConsult.id;

    setConsultsByKey((prev) => {
      const next = new Map(prev);
      const cur = next.get(k);
      if (!cur) return prev;
      const newMsgs = [...cur.messages, tmp];
      next.set(k, { ...cur, messages: newMsgs, lastMessage: tmp });
      return next;
    });
    const sentContent = content;
    const sentAttachment = pendingAttachment;
    setInput("");
    setPendingAttachment(null);
    setSending(true);
    try {
      const { data } = await api.post(`/consultations/${consultId}/messages`, {
        content: sentContent,
        attachment_url: sentAttachment?.url,
        attachment_name: sentAttachment?.name,
        attachment_type: sentAttachment?.type,
        attachment_size: sentAttachment?.size,
      });
      const real: ChatMessage = {
        id: data.id,
        senderId: data.sender_id,
        content: data.content ?? "",
        timestamp: new Date(data.sent_at ?? data.created_at ?? Date.now()),
        isMe: true,
        attachmentUrl: data.attachment_type === "product"
          ? (data.attachment_url ?? undefined)
          : mediaUrl(data.attachment_url ?? undefined) || undefined,
        attachmentName: data.attachment_name ?? undefined,
        attachmentType: (data.attachment_type ?? undefined) as
          | "image"
          | "file"
          | "product"
          | undefined,
        attachmentSize: data.attachment_size ?? undefined,
      };
      setConsultsByKey((prev) => {
        const next = new Map(prev);
        const cur = next.get(k);
        if (!cur) return prev;
        const replaced = cur.messages.map((m) => (m.id === tmpId ? real : m));
        next.set(k, { ...cur, messages: replaced, lastMessage: real });
        return next;
      });
    } catch (e) {
      const detail = getErrDetail(e);
      setConsultsByKey((prev) => {
        const next = new Map(prev);
        const cur = next.get(k);
        if (!cur) return prev;
        const rolled = cur.messages.filter((m) => m.id !== tmpId);
        next.set(k, {
          ...cur,
          messages: rolled,
          lastMessage: rolled[rolled.length - 1],
        });
        return next;
      });
      setInput(sentContent);
      setPendingAttachment(sentAttachment);
      toast.error(detail ?? "Could not send message. Please try again.");
    } finally {
      setSending(false);
    }
  }, [input, selectedConsult, selectedPh, sending, myId, pendingAttachment]);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error("Image too large (max 1.5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : null;
      if (!url) return;
      setPatientAvatar(url);
      try {
        localStorage.setItem("farumasi_patient_avatar", url);
      } catch {
        /* quota — keep in-memory */
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Attachment upload ─────────────────────────────────────────────────────
  const uploadAttachment = async (
    file: File,
    kind: "image" | "file",
  ): Promise<void> => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`File too large (max ${humanSize(MAX_ATTACHMENT_BYTES)}).`);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const endpoint = kind === "image" ? "/uploads/image" : "/uploads/document";
      const { data } = await api.post(endpoint, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url: string | undefined = data?.url;
      if (!url) throw new Error("Upload returned no URL");
      setPendingAttachment({
        url: mediaUrl(url),
        name: file.name,
        type: kind,
        size: file.size,
      });
    } catch (e) {
      const detail = getErrDetail(e);
      toast.error(detail ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setAttachMenuOpen(false);
    if (file) void uploadAttachment(file, "image");
  };
  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setAttachMenuOpen(false);
    if (file) void uploadAttachment(file, "file");
  };

  const onPickProduct = (product: Medicine) => {
    setProductPickerOpen(false);
    setAttachMenuOpen(false);
    setPendingAttachment({
      url: `/store/${product.id}`,
      name: product.name,
      type: "product",
      size: 0,
    });
  };

  // ── Visible list (rail) — one row per existing thread + one row per
  // pharmacist with no thread (defaulting to normal mode). ─────────────────
  type RailEntry = { ph: Pharmacist; anon: boolean; summary?: ConsultationSummary };
  const rail = useMemo<RailEntry[]>(() => {
    const q = searchQ.trim().toLowerCase();
    const entries: RailEntry[] = [];
    const phMap = new Map(pharmacists.map((p) => [p.id, p] as const));

    // Emit one entry per existing thread.
    for (const [k, summary] of consultsByKey.entries()) {
      const { phId } = parseKey(k);
      const ph = phMap.get(phId);
      if (!ph) continue;
      entries.push({ ph, anon: summary.isAnonymous, summary });
    }
    // For pharmacists without ANY thread, add a default (normal-mode) entry
    // so the user can start a fresh conversation.
    for (const ph of pharmacists) {
      const hasAny =
        consultsByKey.has(keyOf(ph.id, false)) ||
        consultsByKey.has(keyOf(ph.id, true));
      if (!hasAny) entries.push({ ph, anon: false });
    }

    const filtered = entries.filter(({ ph, summary }) => {
      const matchQ =
        !q ||
        ph.name.toLowerCase().includes(q) ||
        ph.specialty.toLowerCase().includes(q);
      const matchF =
        filter === "all" ||
        (filter === "available" && ph.status === "available") ||
        (filter === "chats" && !!summary);
      return matchQ && matchF;
    });

    return filtered.sort((a, b) => {
      const ta = a.summary?.lastMessage?.timestamp.getTime() ?? 0;
      const tb = b.summary?.lastMessage?.timestamp.getTime() ?? 0;
      if (tb !== ta) return tb - ta;
      if (a.ph.status === "available" && b.ph.status !== "available") return -1;
      if (b.ph.status === "available" && a.ph.status !== "available") return 1;
      return a.ph.name.localeCompare(b.ph.name);
    });
  }, [pharmacists, consultsByKey, filter, searchQ]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDay = (d: Date) => {
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return formatTime(d);
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  const chatsCount = consultsByKey.size;
  const availableCount = pharmacists.filter((p) => p.status === "available").length;

  // Preview text for the rail row
  const previewOf = (s?: ConsultationSummary, fallback?: string): string => {
    const last = s?.lastMessage;
    if (!last) return fallback ?? "";
    if (last.attachmentType === "image" && !last.content) return "📷 Photo";
    if (last.attachmentType === "file" && !last.content)
      return `📎 ${last.attachmentName ?? "Attachment"}`;
    if (last.attachmentType === "product" && !last.content)
      return `🛒 ${last.attachmentName ?? "Product"}`;
    if (last.attachmentType && last.content) {
      const icon =
        last.attachmentType === "image"
          ? "📷"
          : last.attachmentType === "product"
            ? "🛒"
            : "📎";
      return `${icon} ${last.content}`;
    }
    return last.content;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <GuestGate feature="Consult">
      <div
        className="flex h-full bg-white border border-slate-100 rounded-2xl overflow-hidden relative"
        style={{ maxHeight: "calc(100vh - 88px)" }}
      >
        {/* LEFT — list rail */}
        <aside
          className={cn(
            "w-full md:w-[340px] md:border-r border-slate-200 flex flex-col shrink-0 bg-white",
            selectedKey ? "hidden md:flex" : "flex",
          )}
        >
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
              {t.consult_title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {t.consult_subtitle}
            </p>
          </div>

          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex items-center bg-slate-100 rounded-full px-3 h-10 gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={t.consult_search_ph}
                className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
              />
              {searchQ && (
                <button
                  onClick={() => setSearchQ("")}
                  aria-label="Clear search"
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1 mt-2 text-[11px] font-bold">
              <button
                onClick={() => setFilter("all")}
                className={cn(
                  "px-3 py-1 rounded-full transition-all",
                  filter === "all"
                    ? "bg-farumasi-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {t.consult_filter_all} ({pharmacists.length})
              </button>
              <button
                onClick={() => setFilter("available")}
                className={cn(
                  "px-3 py-1 rounded-full transition-all",
                  filter === "available"
                    ? "bg-farumasi-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {t.consult_filter_available} ({availableCount})
              </button>
              <button
                onClick={() => setFilter("chats")}
                className={cn(
                  "px-3 py-1 rounded-full transition-all",
                  filter === "chats"
                    ? "bg-farumasi-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                Chats ({chatsCount})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {rail.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Search className="w-10 h-10 text-slate-200 mb-2" />
                <p className="text-slate-500 text-sm font-semibold">
                  {t.consult_no_results}
                </p>
              </div>
            ) : (
              rail.map(({ ph, anon, summary }) => {
                const last = summary?.lastMessage;
                const k = keyOf(ph.id, anon);
                const isActive = selectedKey === k;
                const preview = previewOf(summary, ph.specialty);
                return (
                  <button
                    key={k}
                    onClick={() => openThread(ph, anon)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 transition-colors",
                      isActive ? "bg-farumasi-50" : "hover:bg-slate-50",
                    )}
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-farumasi-100">
                        {ph.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ph.imageUrl}
                            alt={ph.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-farumasi-700 font-bold text-sm">
                            {getInitials(ph.name)}
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                          STATUS_DOT[ph.status],
                        )}
                      />
                      {anon && (
                        <span
                          className="absolute -top-1 -left-1 bg-slate-900 text-white rounded-full p-1 shadow"
                          title="Anonymous thread"
                        >
                          <EyeOff className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {ph.name}
                          </p>
                          {anon && (
                            <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-wide bg-slate-900 text-white rounded px-1.5 py-0.5">
                              Anon
                            </span>
                          )}
                        </div>
                        {last && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatDay(last.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p
                          className={cn(
                            "text-xs truncate",
                            summary?.unreadCount
                              ? "text-slate-900 font-semibold"
                              : "text-slate-500",
                          )}
                        >
                          {last?.isMe ? `You: ${preview}` : preview}
                        </p>
                        {!!summary?.unreadCount && (
                          <span className="shrink-0 bg-farumasi-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
                            {summary.unreadCount > 9 ? "9+" : summary.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT — chat area */}
        <section
          className={cn(
            "flex-1 flex flex-col min-w-0",
            selectedKey ? "flex" : "hidden md:flex",
          )}
        >
          {!selectedPh ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-[#F8FAFB]">
              <div className="w-20 h-20 rounded-full bg-farumasi-100 flex items-center justify-center mb-4">
                <MessageCircle className="w-9 h-9 text-farumasi-600" />
              </div>
              <p className="text-slate-700 font-bold">
                Pick a pharmacist to start chatting
              </p>
              <p className="text-slate-400 text-sm mt-1 max-w-sm">
                {t.consult_disclaimer}
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div
                className={cn(
                  "flex items-center gap-3 px-3 md:px-4 py-3 shrink-0 shadow-sm",
                  isAnon ? "bg-slate-900" : "bg-farumasi-600",
                )}
              >
                <button
                  onClick={() => setSelectedKey(null)}
                  aria-label="Back to pharmacist list"
                  className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowProfile(true)}
                  className="relative shrink-0 group"
                  aria-label="View pharmacist profile"
                  title="View profile"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-white/40 overflow-hidden bg-white/20">
                    {selectedPh.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedPh.imageUrl}
                        alt={selectedPh.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                        {getInitials(selectedPh.name)}
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2",
                      STATUS_DOT[selectedPh.status],
                      isAnon ? "border-slate-900" : "border-farumasi-600",
                    )}
                  />
                </button>
                <button
                  onClick={() => setShowProfile(true)}
                  className="flex-1 min-w-0 text-left"
                  aria-label="View pharmacist profile"
                >
                  <p className="text-white font-bold text-sm leading-tight truncate">
                    {selectedPh.name}
                  </p>
                  <p className="text-white/70 text-[11px] mt-0.5 truncate">
                    {isAnon ? "Anonymous mode · " : ""}
                    {selectedPh.specialty}
                  </p>
                </button>
                <button
                  onClick={toggleAnonymousMode}
                  title={isAnon ? "Switch to normal chat" : "Switch to anonymous chat"}
                  aria-label="Toggle anonymous mode"
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 rounded-full px-3 h-9 text-[11px] font-bold transition-colors",
                    isAnon
                      ? "bg-white text-slate-900 hover:bg-white/90"
                      : "bg-white/20 text-white hover:bg-white/30",
                  )}
                >
                  {isAnon ? (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Normal
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Anonymous
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowProfile(true)}
                  aria-label="Pharmacist info"
                  className="shrink-0 p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden md:block"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* Anonymous mode banner */}
              {isAnon && (
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-[11px] text-slate-700 flex items-center gap-2 shrink-0">
                  <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Anonymous mode: the pharmacist sees you as “Anonymous
                    Patient”. Messages here are kept separate from your normal chat.
                  </span>
                </div>
              )}

              {/* Messages area */}
              <div
                className="flex-1 overflow-y-auto py-4 px-3 md:px-4 space-y-2"
                style={{ backgroundColor: "#E5DDD5" }}
              >
                {loadingChat && messages.length === 0 && (
                  <div className="text-center text-xs text-slate-600 py-6">
                    Loading conversation…
                  </div>
                )}
                {messages.length > 0 && (
                  <div className="flex justify-center mb-3">
                    <span className="inline-block text-xs text-slate-600 bg-white/80 rounded-full px-4 py-1.5 shadow-sm">
                      {t.consult_disclaimer}
                    </span>
                  </div>
                )}
                {messages.map((msg) => {
                  const isPatient = msg.isMe;
                  const isPending = msg.id.startsWith("tmp-");
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex items-end gap-2",
                        isPatient ? "justify-end" : "justify-start",
                      )}
                    >
                      {!isPatient && (
                        <div className="w-8 h-8 rounded-full border-2 border-white shadow overflow-hidden bg-farumasi-600 shrink-0 mb-0.5">
                          {selectedPh.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedPh.imageUrl}
                              alt={selectedPh.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-[10px]">
                              {getInitials(selectedPh.name)}
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={cn(
                          "max-w-[78%] md:max-w-[60%] px-3 py-2 text-sm leading-relaxed shadow-sm",
                          isPatient
                            ? "bg-farumasi-600 text-white"
                            : "bg-white text-slate-900 border border-slate-100",
                        )}
                        style={{
                          borderRadius: isPatient
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                        }}
                      >
                        {/* Image attachment */}
                        {msg.attachmentType === "image" && msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mb-1 rounded-lg overflow-hidden bg-black/10"
                            style={{ maxWidth: 260 }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.attachmentUrl}
                              alt={msg.attachmentName ?? "attachment"}
                              className="w-full h-auto block max-h-[260px] object-cover"
                            />
                          </a>
                        )}
                        {/* File attachment */}
                        {msg.attachmentType === "file" && msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={msg.attachmentName}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 mb-1 transition-colors",
                              isPatient
                                ? "bg-white/15 hover:bg-white/25"
                                : "bg-slate-100 hover:bg-slate-200",
                            )}
                          >
                            <FileText className="w-5 h-5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">
                                {msg.attachmentName ?? "Document"}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px]",
                                  isPatient ? "text-white/70" : "text-slate-500",
                                )}
                              >
                                {humanSize(msg.attachmentSize)}
                              </p>
                            </div>
                            <Download className="w-4 h-4 shrink-0 opacity-70" />
                          </a>
                        )}
                        {/* Product attachment */}
                        {msg.attachmentType === "product" && msg.attachmentUrl && (
                          <Link
                            href={msg.attachmentUrl}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 mb-1 transition-colors",
                              isPatient
                                ? "bg-white/15 hover:bg-white/25"
                                : "bg-slate-100 hover:bg-slate-200",
                            )}
                          >
                            <div
                              className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                                isPatient
                                  ? "bg-white/20"
                                  : "bg-farumasi-100 text-farumasi-700",
                              )}
                            >
                              <Package className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                                Product
                              </p>
                              <p className="text-xs font-bold truncate">
                                {msg.attachmentName ?? "View product"}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 shrink-0 opacity-70" />
                          </Link>
                        )}

                        {msg.content && (
                          <span className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </span>
                        )}
                        <div
                          className={cn(
                            "flex items-center gap-1 mt-1 justify-end",
                            isPatient ? "text-white/60" : "text-slate-400",
                          )}
                        >
                          <span className="text-[10px]">
                            {formatTime(msg.timestamp)}
                          </span>
                          {isPatient && (
                            <CheckCheck
                              className={cn("w-3 h-3", isPending && "opacity-50")}
                            />
                          )}
                        </div>
                      </div>

                      {isPatient && (
                        <div className="relative group shrink-0 mb-0.5">
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                          />
                          <button
                            onClick={() => avatarInputRef.current?.click()}
                            className="w-8 h-8 rounded-full border-2 border-white shadow overflow-hidden bg-farumasi-100 relative block"
                            title="Change profile photo"
                          >
                            {patientAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={patientAvatar}
                                alt="You"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-farumasi-700 font-bold text-[10px]">
                                {getInitials(authUser?.name ?? "Me")}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                              <Camera className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending attachment preview */}
              {pendingAttachment && (
                <div className="px-3 md:px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-3 shrink-0">
                  {pendingAttachment.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingAttachment.url}
                      alt={pendingAttachment.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                  ) : pendingAttachment.type === "product" ? (
                    <div className="w-12 h-12 rounded-lg bg-farumasi-100 text-farumasi-700 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-farumasi-100 text-farumasi-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {pendingAttachment.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {pendingAttachment.type === "product"
                        ? "Product · ready to send"
                        : `${humanSize(pendingAttachment.size)} · ready to send`}
                    </p>
                  </div>
                  <button
                    onClick={() => setPendingAttachment(null)}
                    aria-label="Remove attachment"
                    className="p-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-200 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Input */}
              {selectedConsult && selectedConsult.status !== "open" ? (
                <div className="px-4 py-3 bg-white shrink-0 border-t border-slate-100">
                  <p className="text-center text-xs text-slate-500 font-semibold">
                    This consultation is closed. Start a new one to keep chatting.
                  </p>
                </div>
              ) : (
                <div className="px-3 md:px-4 py-3 bg-white shrink-0 flex items-center gap-2 border-t border-slate-100 relative">
                  {/* Attachment + menu */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setAttachMenuOpen((v) => !v)}
                      disabled={uploading || !selectedConsult}
                      aria-label="Attach"
                      className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus
                        className={cn(
                          "w-5 h-5 transition-transform",
                          attachMenuOpen && "rotate-45",
                        )}
                      />
                    </button>
                    {attachMenuOpen && (
                      <div className="absolute bottom-12 left-0 bg-white border border-slate-200 rounded-2xl shadow-lg py-1.5 w-44 z-10">
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-slate-800"
                        >
                          <ImageIcon className="w-4 h-4 text-farumasi-600" />
                          <span>Photo</span>
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-slate-800"
                        >
                          <FileText className="w-4 h-4 text-farumasi-600" />
                          <span>Document</span>
                        </button>
                        <button
                          onClick={() => {
                            setAttachMenuOpen(false);
                            setProductPickerOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-slate-800"
                        >
                          <Package className="w-4 h-4 text-farumasi-600" />
                          <span>Product</span>
                        </button>
                      </div>
                    )}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickImage}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                      className="hidden"
                      onChange={onPickFile}
                    />
                  </div>

                  <div className="flex-1 bg-[#F0F2F5] rounded-[24px] px-4 py-2.5">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={
                        uploading
                          ? "Uploading attachment…"
                          : pendingAttachment
                            ? "Add a caption…"
                            : t.consult_placeholder
                      }
                      disabled={sending || uploading || !selectedConsult}
                      className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-60"
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={
                      (!input.trim() && !pendingAttachment) ||
                      sending ||
                      uploading ||
                      !selectedConsult
                    }
                    aria-label="Send message"
                    className="w-10 h-10 rounded-full bg-farumasi-600 text-white flex items-center justify-center hover:bg-farumasi-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Profile sheet */}
        {showProfile && selectedPh && (
          <ProfileSheet
            ph={selectedPh}
            onClose={() => setShowProfile(false)}
          />
        )}

        {/* Product picker */}
        {productPickerOpen && (
          <ProductPicker
            onClose={() => setProductPickerOpen(false)}
            onPick={onPickProduct}
          />
        )}
      </div>
    </GuestGate>
  );
}

// ── Pharmacist profile slide-over ────────────────────────────────────────────
function ProfileSheet({
  ph,
  onClose,
}: {
  ph: Pharmacist;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex">
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
        aria-label="Close profile"
      />
      <aside
        className="w-full sm:w-[380px] bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Pharmacist profile"
      >
        <div className="relative h-32 bg-gradient-to-br from-farumasi-600 to-farumasi-700 shrink-0">
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-3 right-3 p-2 rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-farumasi-100">
              {ph.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ph.imageUrl}
                  alt={ph.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-farumasi-700 font-extrabold text-xl">
                  {getInitials(ph.name)}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="pt-14 px-6 pb-6 text-center">
          <h2 className="text-lg font-extrabold text-slate-900">{ph.name}</h2>
          <p className="text-sm text-farumasi-600 font-semibold mt-0.5">
            {ph.specialty}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full",
                ph.status === "available"
                  ? "bg-green-100 text-green-700"
                  : ph.status === "busy"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  STATUS_DOT[ph.status],
                )}
              />
              {ph.status === "available"
                ? "Available now"
                : ph.status === "busy"
                  ? "Busy"
                  : "Offline"}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
          {ph.bio && (
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                About
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{ph.bio}</p>
            </div>
          )}
          <div className="space-y-2">
            {typeof ph.yearsExperience === "number" && ph.yearsExperience > 0 && (
              <InfoRow
                icon={<Clock className="w-4 h-4" />}
                label="Experience"
                value={`${ph.yearsExperience} years`}
              />
            )}
            {typeof ph.rating === "number" && ph.rating > 0 && (
              <InfoRow
                icon={<Star className="w-4 h-4 text-amber-400" />}
                label="Rating"
                value={ph.rating.toFixed(1)}
              />
            )}
            {ph.organization && (
              <InfoRow
                icon={<Briefcase className="w-4 h-4" />}
                label="Organization"
                value={ph.organization}
              />
            )}
            {ph.email && (
              <InfoRow
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={ph.email}
              />
            )}
            {ph.phone && (
              <InfoRow
                icon={<Phone className="w-4 h-4" />}
                label="Phone"
                value={ph.phone}
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-xl">
      <div className="w-9 h-9 rounded-full bg-farumasi-50 text-farumasi-700 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Product picker modal ──────────────────────────────────────────────────────
function ProductPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (p: Medicine) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      productsService
        .searchProducts(query)
        .then((items) => {
          if (!cancelled) setResults(items.slice(0, 30));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-farumasi-600" />
            <h2 className="text-sm font-bold text-slate-900">Attach a product</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center bg-slate-100 rounded-full px-3 h-10 gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No products found.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onPick(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {p.category}
                        {typeof p.price === "number" && p.price > 0
                          ? ` · RWF ${p.price.toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
