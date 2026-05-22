"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { Send, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

const QUICK_REPLIES = [
  "We have it in stock.",
  "This item requires a prescription.",
  "Your order has been confirmed.",
  "Please visit our pharmacy to pick it up.",
];

interface ApiMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sent_at: string;
  is_read: boolean;
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

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const [consultations, setConsultations] = useState<ApiConsultation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!selected) return;
    const interval = setInterval(() => fetchMessages(selected), 5000);
    return () => clearInterval(interval);
  }, [selected, fetchMessages]);

  const handleSelect = async (id: string) => {
    setSelected(id);
    await fetchMessages(id);
  };

  const send = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || !selected || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/consultations/${selected}/messages`, { content });
      setConsultations((prev) =>
        prev.map((c) =>
          c.id === selected ? { ...c, messages: [...c.messages, data] } : c
        )
      );
      setInput("");
    } catch {
      // silently ignore
    } finally {
      setSending(false);
    }
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
                  <p className="text-xs text-slate-500 truncate">{lastMsg?.content ?? "No messages yet"}</p>
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
                  <div className={cn("max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm", isMe ? "bg-farumasi-600 text-white rounded-br-sm" : "bg-white text-slate-900 rounded-bl-sm")}>
                    <p>{m.content}</p>
                    <p className={cn("text-[10px] mt-1", isMe ? "text-white/60 text-right" : "text-slate-400")}>{timeAgo(m.sent_at)}</p>
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

          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type a reply…"
              className="flex-1 h-10 px-4 rounded-xl bg-slate-100 border-none text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-farumasi-500/30 transition-all"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || sending}
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
    </div>
  );
}
