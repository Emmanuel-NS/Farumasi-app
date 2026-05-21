"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { mockPharmacists, mockUser } from "@/data/mock";
import { cn, getInitials } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { GuestGate } from "@/components/shared/guest-gate";
import type { Pharmacist, ChatMessage } from "@/types";
import {
  Send, Paperclip, ChevronLeft, Star, Building2,
  CheckCheck, Camera, Search, X, Clock,
} from "lucide-react";

// ── Per-pharmacist opening message ───────────────────────────────────────────
function buildOpeningMessage(ph: Pharmacist): ChatMessage {
  return {
    id: "init-1",
    senderId: ph.id,
    content: `Hello! I'm ${ph.name} from ${ph.organization}. I specialise in ${ph.specialty}. How can I help you today?`,
    timestamp: new Date(Date.now() - 60_000),
    isMe: false,
  };
}

const REPLIES = [
  "Hello! I'm here to help. Could you describe your symptoms in more detail?",
  "That's a common concern. Please consult a doctor if symptoms persist beyond 48 hours.",
  "For that medicine, the typical adult dose is twice daily after meals.",
  "Make sure to stay hydrated and complete the full course of any antibiotics prescribed.",
  "I understand — feel free to share your prescription and I'll review it.",
  "Great question! Let me look that up for you right away.",
  "That medicine should be taken with food to avoid stomach discomfort.",
  "Yes, those two medications can interact. I'd recommend spacing them at least 2 hours apart.",
];

const STATUS_META: Record<string, { dot: string; badge: string }> = {
  available: { dot: "bg-green-400",  badge: "bg-green-100 text-green-700"  },
  busy:      { dot: "bg-amber-400",  badge: "bg-amber-100 text-amber-700"  },
  offline:   { dot: "bg-slate-300",  badge: "bg-slate-100 text-slate-500"  },
};

// ── Pharmacist picker card ────────────────────────────────────────────────────
function PharmacistCard({ ph, onSelect }: { ph: Pharmacist; onSelect: (ph: Pharmacist) => void }) {
  const t     = useTranslation();
  const meta  = STATUS_META[ph.status];
  const statusLabels: Record<string, string> = {
    available: t.consult_status_available,
    busy:      t.consult_status_busy,
    offline:   t.consult_status_offline,
  };
  const statusLabel = statusLabels[ph.status] ?? ph.status;
  const canChat = ph.status === "available";

  return (
    <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Top banner */}
      <div className="relative h-[72px] bg-gradient-to-br from-farumasi-600 to-farumasi-700 shrink-0">
        {/* Avatar overlapping banner */}
        <div className="absolute -bottom-8 left-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl border-[3px] border-white shadow overflow-hidden bg-slate-100">
              {ph.imageUrl ? (
                <img src={ph.imageUrl} alt={ph.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-farumasi-100 text-farumasi-700 font-bold text-lg">
                  {getInitials(ph.name)}
                </div>
              )}
            </div>
            <span className={cn("absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white", meta.dot)} />
          </div>
        </div>
        {/* Status badge */}
        <span className={cn("absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full", meta.badge)}>
          {statusLabel}
        </span>
      </div>

      {/* Body */}
      <div className="pt-10 px-5 pb-4 flex flex-col flex-1">
        <p className="text-[15px] font-extrabold text-slate-900 leading-tight">{ph.name}</p>
        <p className="text-[12px] text-farumasi-600 font-semibold mt-0.5">{ph.specialty}</p>

        <div className="flex items-center gap-1.5 mt-2 text-slate-500">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] truncate">{ph.organization}</span>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-[12px] font-bold text-slate-700">{ph.rating.toFixed(1)}</span>
          </div>
          <span className="text-slate-200">·</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-500">{ph.yearsExperience} {t.consult_yrs_exp}</span>
          </div>
        </div>

        <button
          disabled={!canChat}
          onClick={() => onSelect(ph)}
          className={cn(
            "mt-4 w-full h-10 rounded-[14px] text-sm font-bold transition-all",
            canChat
              ? "bg-farumasi-600 text-white hover:bg-farumasi-700 shadow-sm hover:shadow-md"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {canChat ? t.consult_start : ph.status === "busy" ? t.consult_btn_busy : t.consult_btn_offline}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ConsultPage() {
  const t = useTranslation();
  const [selected, setSelected] = useState<Pharmacist | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [searchQ, setSearchQ]   = useState("");
  const [filter, setFilter]     = useState<"all" | "available">("all");

  // Patient avatar — persisted in localStorage
  const [patientAvatar, setPatientAvatar] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("farumasi_patient_avatar");
    return null;
  });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleSelect = (ph: Pharmacist) => {
    setSelected(ph);
    setMessages([buildOpeningMessage(ph)]);
    setInput("");
    setTyping(false);
  };

  const handleBack = () => { setSelected(null); setMessages([]); };

  const sendMessage = useCallback(() => {
    if (!input.trim() || !selected) return;
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      senderId: "patient",
      content: input.trim(),
      timestamp: new Date(),
      isMe: true,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, {
        id: String(Date.now() + 1),
        senderId: selected.id,
        content: REPLIES[Math.floor(Math.random() * REPLIES.length)],
        timestamp: new Date(),
        isMe: false,
      }]);
    }, 1800);
  }, [input, selected]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPatientAvatar(url);
    localStorage.setItem("farumasi_patient_avatar", url);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const visible = mockPharmacists.filter((ph) => {
    const matchQ = !searchQ.trim() ||
      ph.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      ph.specialty.toLowerCase().includes(searchQ.toLowerCase()) ||
      ph.organization.toLowerCase().includes(searchQ.toLowerCase());
    const matchF = filter === "all" || ph.status === "available";
    return matchQ && matchF;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (selected) {
    const meta = STATUS_META[selected.status];
    const statusLabels: Record<string, string> = {
      available: t.consult_status_available,
      busy:      t.consult_status_busy,
      offline:   t.consult_status_offline,
    };
    const selectedStatusLabel = statusLabels[selected.status] ?? selected.status;
    return (
      <div className="flex flex-col h-full" style={{ maxHeight: "calc(100vh - 72px)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-farumasi-600 shrink-0 shadow-sm">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full border-2 border-white/40 overflow-hidden bg-white/20">
              {selected.imageUrl ? (
                <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(selected.name)}
                </div>
              )}
            </div>
            <span className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-farumasi-600", meta.dot)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{selected.name}</p>
            <p className="text-white/70 text-[11px] mt-0.5">{selected.specialty} · {selectedStatusLabel}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span className="text-white/90 text-xs font-bold">{selected.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-2" style={{ backgroundColor: "#E5DDD5" }}>
          <div className="flex justify-center mb-3">
            <span className="inline-block text-xs text-slate-500 bg-white/70 rounded-full px-4 py-1.5 shadow-sm">
              {t.consult_disclaimer}
            </span>
          </div>

          {messages.map((msg) => {
            const isPatient = msg.senderId === "patient";
            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isPatient ? "justify-end" : "justify-start")}>
                {/* Pharmacist avatar */}
                {!isPatient && (
                  <div className="w-8 h-8 rounded-full border-2 border-white shadow overflow-hidden bg-farumasi-600 shrink-0 mb-0.5">
                    {selected.imageUrl ? (
                      <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-[10px]">
                        {getInitials(selected.name)}
                      </div>
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[72%] px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                    isPatient ? "bg-farumasi-600 text-white" : "bg-white text-slate-900 border border-slate-100"
                  )}
                  style={{ borderRadius: isPatient ? "18px 18px 4px 18px" : "18px 18px 18px 4px" }}
                >
                  {msg.content}
                  <div className={cn("flex items-center gap-1 mt-1 justify-end", isPatient ? "text-white/60" : "text-slate-400")}>
                    <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                    {isPatient && <CheckCheck className="w-3 h-3" />}
                  </div>
                </div>

                {/* Patient avatar — clickable to upload */}
                {isPatient && (
                  <div className="relative group shrink-0 mb-0.5">
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="w-8 h-8 rounded-full border-2 border-white shadow overflow-hidden bg-farumasi-100 relative block"
                      title="Change profile photo"
                    >
                      {patientAvatar ? (
                        <img src={patientAvatar} alt="You" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-farumasi-700 font-bold text-[10px]">
                          {getInitials(mockUser.name)}
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

          {/* Typing indicator */}
          {typing && (
            <div className="flex items-end gap-2 justify-start">
              <div className="w-8 h-8 rounded-full border-2 border-white shadow overflow-hidden bg-farumasi-600 shrink-0">
                {selected.imageUrl ? (
                  <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-[10px]">
                    {getInitials(selected.name)}
                  </div>
                )}
              </div>
              <div className="bg-white border border-slate-100 px-4 py-3 shadow-sm" style={{ borderRadius: "18px 18px 18px 4px" }}>
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 bg-white shrink-0 flex items-center gap-2 border-t border-slate-100">
          <button className="text-farumasi-600 hover:text-farumasi-700 shrink-0 transition-colors p-1">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 bg-[#F0F2F5] rounded-[24px] px-4 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={t.consult_placeholder}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-farumasi-600 text-white flex items-center justify-center hover:bg-farumasi-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PICKER VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  const availableCount = mockPharmacists.filter((p) => p.status === "available").length;

  return (
    <GuestGate feature="Consult">
    <div className="p-4 md:p-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
          {t.consult_title}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {t.consult_subtitle}
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-4 h-12 gap-2 flex-1 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
              placeholder={t.consult_search_ph}
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
          />
          {searchQ && (
            <button onClick={() => setSearchQ("")} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 gap-1 shadow-sm shrink-0">
          {(["all", "available"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                filter === f ? "bg-farumasi-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {f === "all" ? `${t.consult_filter_all} (${mockPharmacists.length})` : `${t.consult_filter_available} (${availableCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Search className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-semibold">{t.consult_no_results}</p>
          <button onClick={() => { setSearchQ(""); setFilter("all"); }} className="mt-2 text-farumasi-600 text-sm hover:underline">
            {t.consult_clear_filters}
          </button>
        </div>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {visible.map((ph) => (
            <PharmacistCard key={ph.id} ph={ph} onSelect={handleSelect} />
          ))}
        </div>
      )}
    </div>
    </GuestGate>
  );
}
