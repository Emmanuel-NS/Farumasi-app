"use client";

import { useState, useRef, useEffect, useCallback, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { cn, timeAgo } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  Send, RefreshCw, Paperclip, ImageIcon, FileText, Package, X, Loader2, Search,
  Download, ExternalLink,
} from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { toast } from "sonner";
import { productsService, type BackendProduct } from "@/lib/services/products.service";

const QUICK_REPLIES = [
  "We have it in stock.",
  "This item requires a prescription.",
  "Your order has been confirmed.",
  "Please visit our pharmacy to pick it up.",
];

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

interface ApiMessage {
  id: string;
  content: string | null;
  sender_id: string;
  sender_name: string;
  sent_at: string;
  is_read: boolean;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: "image" | "file" | "product" | string | null;
  attachment_size?: number | null;
}

interface ApiConsultation {
  id: string;
  patient_id: string;
  patient_name: string;
  pharmacist_id: string;
  pharmacist_name: string;
  status: string;
  created_at: string;
  messages: ApiMessage[];
}

interface PendingAttachment {
  url: string;
  name: string;
  type: "image" | "file" | "product";
  size?: number;
  productId?: string;
}

function humanSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [consultations, setConsultations] = useState<ApiConsultation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedConsultation = consultations.find((c) => c.id === selected) ?? null;
  const messages = selectedConsultation?.messages ?? [];

  const fetchConsultations = useCallback(async () => {
    try {
      const { data } = await api.get("/consultations/");
      setConsultations(data.items ?? data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    try {
      const { data } = await api.get(`/consultations/${id}`);
      setConsultations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, messages: data.messages ?? [] } : c))
      );
      await api.patch(`/consultations/${id}/messages/read`).catch(() => {});
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => { fetchConsultations(); }, [fetchConsultations]);

  useEffect(() => {
    const thread = searchParams.get("thread");
    if (!thread || consultations.length === 0) return;
    if (consultations.some((c) => c.id === thread)) {
      setSelected(thread);
    }
  }, [searchParams, consultations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!selected) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      void fetchMessages(selected);
      id = setInterval(() => void fetchMessages(selected), 10_000);
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
  }, [selected, fetchMessages]);

  const handleSelect = async (id: string) => {
    setSelected(id);
    setPending(null);
    setInput("");
    await fetchMessages(id);
  };

  const upload = async (file: File) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`File too large (max ${humanSize(MAX_ATTACHMENT_BYTES)}).`);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/uploads/chat", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url: string | undefined = data?.url;
      if (!url) throw new Error("Upload returned no URL");
      const attachmentType = (data?.attachment_type as "image" | "file" | undefined) ?? "file";
      setPending({ url, name: file.name, type: attachmentType, size: file.size });
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void upload(f);
  };
  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void upload(f);
  };

  const send = async (text?: string) => {
    const content = text ?? input.trim();
    if ((!content && !pending) || !selected || sending) return;
    setSending(true);
    try {
      const body: Record<string, unknown> = { content };
      if (pending) {
        body.attachment_url = pending.url;
        body.attachment_name = pending.name;
        body.attachment_type = pending.type;
        if (pending.size) body.attachment_size = pending.size;
      }
      const { data } = await api.post(`/consultations/${selected}/messages`, body);
      setConsultations((prev) =>
        prev.map((c) =>
          c.id === selected ? { ...c, messages: [...c.messages, data] } : c
        )
      );
      setInput("");
      setPending(null);
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const selectProduct = (p: BackendProduct) => {
    setPending({
      url: `/store/${p.id}`,
      name: p.name,
      type: "product",
      productId: p.id,
    });
    setPickerOpen(false);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Thread list */}
      <div className={cn("w-full md:w-72 bg-white border-r border-slate-100 flex flex-col shrink-0", selected ? "hidden md:flex" : "flex")}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-base font-bold text-slate-900">Patient Messages</p>
          <button onClick={fetchConsultations} className="p-1.5 rounded-lg text-slate-400 hover:text-farumasi-600 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading && <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>}
          {!loading && consultations.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">No patient conversations yet.</div>
          )}
          {consultations.map((c) => {
            const lastMsg = c.messages[c.messages.length - 1];
            const unread = c.messages.filter((m) => !m.is_read && m.sender_id !== user?.id).length;
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={cn(
                  "w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50",
                  selected === c.id && "bg-farumasi-50/60"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-farumasi-100 flex items-center justify-center font-bold text-farumasi-700 text-sm shrink-0">
                  {c.patient_name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className={cn("text-sm text-slate-900", unread > 0 ? "font-bold" : "font-medium")}>{c.patient_name}</p>
                    {lastMsg && <p className="text-[10px] text-slate-400 shrink-0">{timeAgo(lastMsg.sent_at)}</p>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {lastMsg?.content || (lastMsg?.attachment_type ? `[${lastMsg.attachment_type}]` : "No messages yet")}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-farumasi-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat window */}
      {selected && selectedConsultation ? (
        <div className={cn("flex-1 flex flex-col min-w-0", "flex")}>
          <div className="h-14 bg-white border-b border-slate-100 flex items-center gap-3 px-4 shrink-0">
            <button className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700" onClick={() => setSelected(null)}>←</button>
            <div className="w-8 h-8 rounded-full bg-farumasi-100 flex items-center justify-center font-bold text-farumasi-700 text-xs shrink-0">
              {selectedConsultation.patient_name.split(" ").map((n: string) => n[0]).join("")}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{selectedConsultation.patient_name}</p>
              <p className="text-[10px] text-slate-400">Consultation · {selectedConsultation.status}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3 bg-[#F6F8FB]">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400 text-sm">No messages yet. Start the conversation.</p>
              </div>
            )}
            {messages.map((m) => {
              const isMe = m.sender_id === user?.id;
              return (
                <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm space-y-2",
                    isMe ? "bg-farumasi-600 text-white rounded-br-sm" : "bg-white text-slate-900 rounded-bl-sm",
                  )}>
                    <AttachmentBubble m={m} isMe={isMe} />
                    {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                    <p className={cn("text-[10px]", isMe ? "text-white/60 text-right" : "text-slate-400")}>{timeAgo(m.sent_at)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <div className="px-4 pt-2 pb-1 flex gap-2 overflow-x-auto scrollbar-hide bg-white border-t border-slate-100">
            {QUICK_REPLIES.map((r) => (
              <button key={r} onClick={() => send(r)} className="shrink-0 text-xs font-medium bg-farumasi-50 text-farumasi-700 border border-farumasi-100 px-3 py-1.5 rounded-xl hover:bg-farumasi-100 transition-colors">
                {r}
              </button>
            ))}
          </div>

          {pending && (
            <div className="px-3 pt-2 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                {pending.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(pending.url)} alt={pending.name} className="w-10 h-10 object-cover rounded-lg" />
                ) : pending.type === "product" ? (
                  <Package className="w-5 h-5 text-farumasi-600 shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 text-slate-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{pending.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {pending.type === "product" ? "Product attached" : humanSize(pending.size)}
                  </p>
                </div>
                <button onClick={() => setPending(null)} className="p-1 rounded text-slate-400 hover:bg-slate-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx" className="hidden" onChange={onPickFile} />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading || sending}
              title="Attach image"
              className="w-10 h-10 rounded-xl text-slate-500 hover:text-farumasi-600 hover:bg-farumasi-50 flex items-center justify-center disabled:opacity-40"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
              title="Attach file"
              className="w-10 h-10 rounded-xl text-slate-500 hover:text-farumasi-600 hover:bg-farumasi-50 flex items-center justify-center disabled:opacity-40"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={uploading || sending}
              title="Share a product"
              className="w-10 h-10 rounded-xl text-slate-500 hover:text-farumasi-600 hover:bg-farumasi-50 flex items-center justify-center disabled:opacity-40"
            >
              <Package className="w-4 h-4" />
            </button>
            {uploading && <Loader2 className="w-4 h-4 animate-spin text-farumasi-600" />}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type a reply…"
              className="flex-1 h-10 px-4 rounded-xl bg-slate-100 border-none text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-farumasi-500/30 transition-all"
            />
            <button
              onClick={() => send()}
              disabled={(!input.trim() && !pending) || sending}
              className="w-10 h-10 rounded-xl bg-farumasi-600 text-white flex items-center justify-center hover:bg-farumasi-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-slate-400 text-sm">
          Select a conversation
        </div>
      )}

      {pickerOpen && <ProductPicker onSelect={selectProduct} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

function AttachmentBubble({ m, isMe }: { m: ApiMessage; isMe: boolean }) {
  const type = m.attachment_type;
  if (!type || !m.attachment_url) return null;
  if (type === "image") {
    return (
      <a href={mediaUrl(m.attachment_url)} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl(m.attachment_url)}
          alt={m.attachment_name ?? "attachment"}
          className="max-w-full rounded-xl border border-black/5"
        />
      </a>
    );
  }
  if (type === "product") {
    const productId = m.attachment_url?.match(/\/(?:store|inventory|products)\/([^/?#]+)/i)?.[1]
      ?? m.attachment_url.split("/").pop()
      ?? "";
    const href = `/inventory/${productId}`;
    return (
      <a
        href={href}
        className={cn(
          "flex items-center gap-2 p-2 rounded-xl border",
          isMe ? "border-white/30 bg-white/10 hover:bg-white/20" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
        )}
      >
        <Package className={cn("w-5 h-5 shrink-0", isMe ? "text-white" : "text-farumasi-600")} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-semibold truncate", isMe ? "text-white" : "text-slate-800")}>{m.attachment_name ?? "Product"}</p>
          <p className={cn("text-[10px]", isMe ? "text-white/70" : "text-slate-500")}>Tap to open</p>
        </div>
        <ExternalLink className={cn("w-3.5 h-3.5 shrink-0", isMe ? "text-white/80" : "text-slate-400")} />
      </a>
    );
  }
  // file
  return (
    <a
      href={mediaUrl(m.attachment_url)}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex items-center gap-2 p-2 rounded-xl border",
        isMe ? "border-white/30 bg-white/10 hover:bg-white/20" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
      )}
    >
      <FileText className={cn("w-5 h-5 shrink-0", isMe ? "text-white" : "text-slate-500")} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-semibold truncate", isMe ? "text-white" : "text-slate-800")}>
          {m.attachment_name ?? "Document"}
        </p>
        <p className={cn("text-[10px]", isMe ? "text-white/70" : "text-slate-500")}>{humanSize(m.attachment_size ?? undefined)}</p>
      </div>
      <Download className={cn("w-3.5 h-3.5 shrink-0", isMe ? "text-white/80" : "text-slate-400")} />
    </a>
  );
}

function ProductPicker({
  onSelect,
  onClose,
}: {
  onSelect: (p: BackendProduct) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<BackendProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      productsService
        .searchProducts({ search: query.trim() || undefined, limit: 30 })
        .then((r) => setItems(r.items))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Share a product</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search inventory…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-farumasi-200"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300 mx-auto" /></div>}
          {!loading && items.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">No products found</p>
          )}
          {!loading && items.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors"
            >
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(p.image_url)} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-slate-100" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                {p.generic_name && <p className="text-[11px] text-slate-500 truncate">{p.generic_name}</p>}
                <p className="text-[11px] text-slate-400">{p.category ?? p.product_type}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
