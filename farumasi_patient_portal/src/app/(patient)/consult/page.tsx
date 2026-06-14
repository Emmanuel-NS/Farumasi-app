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
  Shield,
  Users,
  Sparkles,
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

function consultProductPath(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const match = url.match(/\/(?:store|inventory|products)\/([^/?#]+)/i);
  if (match) return `/store/${match[1]}`;
  return url.startsWith("/") ? url : undefined;
}

function adaptMessages(raw: ApiMessage[] | undefined, myId: string | undefined): ChatMessage[] {
  return (raw ?? [])
    .map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      content: m.content ?? "",
      timestamp: new Date(m.sent_at ?? m.created_at ?? Date.now()),
      isMe: m.sender_id === myId,
      attachmentUrl: m.attachment_type === "product"
        ? consultProductPath(m.attachment_url)
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

function ChatImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-4 mb-1 bg-slate-100 text-slate-500 text-xs">
        <ImageIcon className="w-5 h-5 shrink-0" />
        <span>Image unavailable</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLElement>(null);
  const stickToBottomRef = useRef(true);
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

  // ── Poll current chat (10s, pauses when tab hidden) ───────────────────────
  useEffect(() => {
    const consultId = selectedConsult?.id;
    if (!consultId) return;

    const poll = async () => {
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
          const serverIds = new Set(fresh.messages.map((m) => m.id));
          const stillPending = pending.filter((p) => {
            if (serverIds.has(p.id)) return false;
            if (
              p.content &&
              fresh.messages.some(
                (s) =>
                  s.isMe &&
                  s.content === p.content &&
                  Math.abs(s.timestamp.getTime() - p.timestamp.getTime()) < 60_000,
              )
            ) {
              return false;
            }
            return true;
          });
          const merged = [...fresh.messages, ...stillPending];
          next.set(k, {
            ...fresh,
            messages: merged,
            lastMessage: merged[merged.length - 1],
          });
          return next;
        });
      } catch {
        // retry on next tick
      }
    };

    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      void poll();
      id = setInterval(() => void poll(), 10_000);
    };
    const stop = () => {
      if (!id) return;
      clearInterval(id);
      id = null;
    };
    const onVis = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
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

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 96;
  }, []);

  // Scroll to bottom when opening a thread
  useEffect(() => {
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollMessagesToBottom("auto"));
  }, [selectedKey, scrollMessagesToBottom]);

  // Follow new messages only when the user is already near the bottom
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    requestAnimationFrame(() => scrollMessagesToBottom("auto"));
  }, [messages, scrollMessagesToBottom]);

  // Pin mobile chat panel to the visible viewport (address bar / keyboard)
  useEffect(() => {
    if (!selectedKey || typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    if (!mq.matches) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = chatPanelRef.current;
    const vv = window.visualViewport;
    if (!panel || !vv) {
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }

    const topbar = 72;
    const sync = () => {
      panel.style.top = `${topbar + vv.offsetTop}px`;
      panel.style.height = `${Math.max(vv.height - topbar, 0)}px`;
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      panel.style.top = "";
      panel.style.height = "";
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedKey]);

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
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollMessagesToBottom("auto"));
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
          ? consultProductPath(data.attachment_url)
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
  }, [input, selectedConsult, selectedPh, sending, myId, pendingAttachment, scrollMessagesToBottom]);

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
      <div className="flex flex-1 min-h-0 h-full bg-[#EEF2F6] overflow-hidden relative">
        {/* LEFT — pharmacist list (hidden on narrow screens when a chat is open) */}
        <aside
          className={cn(
            "w-full lg:w-[360px] xl:w-[380px] flex flex-col shrink-0 border-r border-slate-200/80 bg-white",
            selectedKey
              ? "hidden lg:flex"
              : "fixed inset-x-0 top-[72px] bottom-0 z-10 flex lg:relative lg:inset-auto lg:z-auto lg:bottom-auto",
          )}
        >
          {/* Header */}
          <div className="relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-farumasi-700 via-farumasi-600 to-farumasi-500" />
            <div className="relative px-4 pt-5 pb-4 text-white">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-extrabold leading-tight">{t.consult_title}</h1>
                  <p className="text-[12px] text-white/75 mt-0.5 line-clamp-2">{t.consult_subtitle}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  {pharmacists.length} pharmacists
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-300" />
                  {availableCount} online
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 py-3 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center bg-slate-100/90 rounded-xl px-3 h-10 gap-2 ring-1 ring-slate-200/60 focus-within:ring-farumasi-300 focus-within:bg-white transition-all">
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
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-hide">
              {(
                [
                  { id: "all" as const, label: t.consult_filter_all, count: pharmacists.length },
                  { id: "available" as const, label: t.consult_filter_available, count: availableCount },
                  { id: "chats" as const, label: "Chats", count: chatsCount },
                ] as const
              ).map(({ id, label, count }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all",
                    filter === id
                      ? "bg-farumasi-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 bg-[#F6F8FB]">
            {rail.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-3 shadow-sm">
                  <Search className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-700 text-sm font-semibold">{t.consult_no_results}</p>
                <p className="text-slate-400 text-xs mt-1">Try another filter or search term</p>
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
                      "w-full flex items-center gap-3 p-3 mb-2 text-left rounded-2xl border transition-all",
                      isActive
                        ? "bg-white border-farumasi-200 shadow-[0_4px_16px_rgba(30,158,104,0.12)] ring-1 ring-farumasi-100"
                        : "bg-white border-slate-100 hover:border-farumasi-100 hover:shadow-sm",
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

        {/* RIGHT — chat */}
        <section
          ref={chatPanelRef}
          className={cn(
            "flex flex-col min-w-0 min-h-0 bg-white lg:rounded-l-3xl lg:shadow-[inset_1px_0_0_rgba(15,23,42,0.04)]",
            selectedKey
              ? "fixed inset-x-0 top-[72px] bottom-0 z-20 flex lg:relative lg:inset-auto lg:flex-1 lg:z-auto lg:bottom-auto"
              : "hidden lg:flex lg:flex-1",
          )}
        >
          {!selectedPh ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-[#F8FAFC] via-white to-farumasi-50/40">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-farumasi-600 to-farumasi-400 flex items-center justify-center mb-5 shadow-[0_12px_32px_rgba(30,158,104,0.25)]">
                <MessageCircle className="w-11 h-11 text-white" />
              </div>
              <p className="text-slate-900 font-extrabold text-lg">Choose a pharmacist</p>
              <p className="text-slate-500 text-sm mt-2 max-w-md leading-relaxed">
                {t.consult_disclaimer}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-farumasi-600" />
                  Licensed professionals
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  Anonymous mode available
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
              {/* Chat header */}
              <div
                className={cn(
                  "flex items-center gap-3 px-3 md:px-5 py-3 shrink-0",
                  isAnon
                    ? "bg-gradient-to-r from-slate-800 to-slate-900"
                    : "bg-gradient-to-r from-farumasi-700 to-farumasi-600",
                )}
              >
                <button
                  onClick={() => setSelectedKey(null)}
                  aria-label="Back to pharmacist list"
                  className="lg:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
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
                  className="shrink-0 p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden lg:block"
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

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 px-3 lg:px-5 space-y-3 bg-[#EEF1F5] overscroll-contain"
              >
                {loadingChat && messages.length === 0 && (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-8">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading conversation…
                  </div>
                )}
                {messages.length > 0 && (
                  <div className="flex justify-center mb-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/90 rounded-full px-3 py-1 shadow-sm border border-slate-100">
                      <Shield className="w-3 h-3 text-farumasi-600" />
                      {t.consult_disclaimer}
                    </span>
                  </div>
                )}
                {messages.map((msg) => {
                  const isPatient = msg.isMe;
                  const isPending = msg.id.startsWith("tmp-");
                  const body = msg.content?.trim() ?? "";
                  const hasAttachment = Boolean(
                    msg.attachmentUrl && msg.attachmentType,
                  );
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex items-end gap-2 w-full",
                        isPatient ? "justify-end" : "justify-start",
                        isPending && "opacity-80",
                      )}
                    >
                      {!isPatient && (
                        <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full border-2 border-white shadow overflow-hidden bg-farumasi-600 shrink-0 mb-0.5">
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
                          "min-w-[4.5rem] max-w-[calc(100%-2rem)] sm:max-w-[78%] lg:max-w-[62%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                          isPatient
                            ? "bg-farumasi-600 text-white shadow-[0_2px_8px_rgba(30,158,104,0.2)]"
                            : "bg-white text-slate-900 border border-slate-200/90",
                        )}
                        style={{
                          borderRadius: isPatient
                            ? "20px 20px 6px 20px"
                            : "20px 20px 20px 6px",
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
                            <ChatImage
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

                        {body && (
                          <span
                            className={cn(
                              "whitespace-pre-wrap break-words block",
                              isPatient ? "text-white" : "text-slate-900",
                            )}
                          >
                            {body}
                          </span>
                        )}
                        {!body && hasAttachment && (
                          <span
                            className={cn(
                              "text-xs italic block",
                              isPatient ? "text-white/80" : "text-slate-500",
                            )}
                          >
                            {msg.attachmentType === "image"
                              ? "Photo"
                              : msg.attachmentType === "product"
                                ? "Shared product"
                                : "Attachment"}
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
                        <div className="relative group shrink-0 mb-0.5 hidden sm:block">
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
                <div className="px-3 md:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-white shrink-0 border-t border-slate-100">
                  <div className="flex items-end gap-2 max-w-3xl mx-auto w-full">
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

                  <div className="flex-1 bg-slate-100 rounded-[22px] px-4 py-2.5 ring-1 ring-slate-200/60 focus-within:ring-farumasi-300 focus-within:bg-white transition-all">
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
                    className="w-10 h-10 rounded-full bg-farumasi-600 text-white flex items-center justify-center hover:bg-farumasi-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 shadow-[0_4px_12px_rgba(30,158,104,0.3)]"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  </div>
                </div>
              )}
            </div>
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
