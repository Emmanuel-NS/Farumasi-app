"use client";

import { useState, useRef, useEffect } from "react";
import { mockChatThreads, mockPharmacist } from "@/data/mock";
import { cn, getInitials, timeAgo } from "@/lib/utils";
import { Send } from "lucide-react";
import type { ChatThread, ChatMessage } from "@/types";

const QUICK_REPLIES = [
  "We have it in stock.",
  "This item requires a prescription.",
  "Your order has been confirmed.",
  "Please visit our pharmacy to pick it up.",
];

export default function ChatPage() {
  const [threads, setThreads] = useState(mockChatThreads);
  const [selected, setSelected] = useState<string | null>(threads[0]?.id ?? null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const thread = threads.find((t) => t.id === selected) ?? null;
  const threadMessages = selected ? (messages[selected] ?? []) : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  const send = (text?: string) => {
    const content = text ?? input.trim();
    if (!content || !selected) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      threadId: selected,
      senderId: mockPharmacist.id,
      senderName: mockPharmacist.name,
      senderRole: "pharmacist",
      content,
      sentAt: new Date().toISOString(),
    };
    setMessages((p) => ({ ...p, [selected]: [...(p[selected] ?? []), msg] }));
    setThreads((p) => p.map((t) => t.id === selected ? { ...t, lastMessage: content, lastMessageAt: msg.sentAt, unread: 0 } : t));
    setInput("");
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Thread list */}
      <div className={cn("w-full md:w-72 bg-white border-r border-slate-100 flex flex-col shrink-0", selected ? "hidden md:flex" : "flex")}>
        <div className="p-4 border-b border-slate-100">
          <p className="text-base font-bold text-slate-900">Patient Messages</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelected(t.id);
                setThreads((p) => p.map((x) => x.id === t.id ? { ...x, unread: 0 } : x));
              }}
              className={cn("w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50", selected === t.id && "bg-farumasi-50/60")}
            >
              <div className="w-10 h-10 rounded-full bg-farumasi-100 flex items-center justify-center font-bold text-farumasi-700 text-sm shrink-0">
                {t.patientName.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className={cn("text-sm text-slate-900", t.unread > 0 ? "font-bold" : "font-medium")}>{t.patientName}</p>
                  <p className="text-[10px] text-slate-400 shrink-0">{timeAgo(t.lastMessageAt)}</p>
                </div>
                <p className="text-xs text-slate-500 truncate">{t.lastMessage}</p>
              </div>
              {t.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-farumasi-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      {selected && thread ? (
        <div className={cn("flex-1 flex flex-col min-w-0", "flex")}>
          {/* Chat header */}
          <div className="h-14 bg-white border-b border-slate-100 flex items-center gap-3 px-4 shrink-0">
            <button className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700" onClick={() => setSelected(null)}>←</button>
            <div className="w-8 h-8 rounded-full bg-farumasi-100 flex items-center justify-center font-bold text-farumasi-700 text-xs shrink-0">
              {thread.patientName.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{thread.patientName}</p>
              <p className="text-[10px] text-slate-400">{thread.type.replace(/_/g, " ")} · {thread.patientPhone}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3 bg-[#F6F8FB]">
            {threadMessages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400 text-sm">No messages yet. Start the conversation.</p>
              </div>
            )}
            {threadMessages.map((m) => {
              const isMe = m.senderRole === "pharmacist";
              return (
                <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm", isMe ? "bg-farumasi-600 text-white rounded-br-sm" : "bg-white text-slate-900 rounded-bl-sm")}>
                    <p>{m.content}</p>
                    <p className={cn("text-[10px] mt-1", isMe ? "text-white/60 text-right" : "text-slate-400")}>{timeAgo(m.sentAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Quick replies */}
          <div className="px-4 pt-2 pb-1 flex gap-2 overflow-x-auto scrollbar-hide bg-white border-t border-slate-100">
            {QUICK_REPLIES.map((r) => (
              <button key={r} onClick={() => send(r)} className="shrink-0 text-xs font-medium bg-farumasi-50 text-farumasi-700 border border-farumasi-100 px-3 py-1.5 rounded-xl hover:bg-farumasi-100 transition-colors">
                {r}
              </button>
            ))}
          </div>

          {/* Input */}
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
              disabled={!input.trim()}
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
