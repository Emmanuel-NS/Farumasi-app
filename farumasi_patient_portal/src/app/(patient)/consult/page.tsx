"use client";

import { useState, useRef, useEffect } from "react";
import { mockPharmacists } from "@/data/mock";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { Send, Paperclip, ShoppingBag, CheckCheck } from "lucide-react";

/** Flutter ConsultChatScreen — direct chat, no pharmacist picker */

const DEFAULT_PHARMACIST = mockPharmacists[0];

const INITIAL_MESSAGE: ChatMessage = {
  id: "init-1",
  senderId: DEFAULT_PHARMACIST?.id ?? "pharm-1",
  content:
    "Hello! Welcome to Farumasi Consult. I'm your pharmacist and I'm here to help you with any medicine or health-related questions. How can I assist you today?",
  timestamp: new Date(Date.now() - 60_000),
  isMe: false,
};

const REPLIES = [
  "Hello! I'm here to help. Could you describe your symptoms?",
  "That's a common concern. I'd recommend consulting a doctor if symptoms persist.",
  "For that medicine, the usual dosage for adults is twice daily after meals.",
  "Make sure to stay hydrated and complete the full course of antibiotics.",
  "I understand. Feel free to share any prescription and I'll review it.",
  "Great question! Let me look that up for you.",
  "Please ensure you take that medicine with food to avoid stomach discomfort.",
];

export default function ConsultPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = () => {
    if (!input.trim()) return;
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
      const reply: ChatMessage = {
        id: String(Date.now() + 1),
        senderId: DEFAULT_PHARMACIST?.id ?? "pharm-1",
        content: REPLIES[Math.floor(Math.random() * REPLIES.length)],
        timestamp: new Date(),
        isMe: false,
      };
      setMessages((prev) => [...prev, reply]);
    }, 1800);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    /* Flutter Scaffold with green AppBar and #E5DDD5 body */
    <div className="flex flex-col h-full" style={{ maxHeight: "calc(100vh - 72px)" }}>

      {/* ── Flutter AppBar simulation ── green bar with title + pharmacy icon ── */}
      <div className="flex items-center gap-3 px-5 py-4 bg-farumasi-600 shrink-0">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base leading-tight">Consult a Pharmacist</p>
          {DEFAULT_PHARMACIST && (
            <p className="text-white/70 text-xs mt-0.5">{DEFAULT_PHARMACIST.name} · {DEFAULT_PHARMACIST.specialty}</p>
          )}
        </div>
        {/* Online indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-300 animate-pulse" />
          <span className="text-white/80 text-xs">Online</span>
        </div>
      </div>

      {/* ── Messages area — Flutter Color(0xFFE5DDD5) background ── */}
      <div
        className="flex-1 overflow-y-auto py-4 px-4 space-y-2"
        style={{ backgroundColor: "#E5DDD5" }}
      >
        {/* Disclaimer pill — Flutter Center widget at top */}
        <div className="flex justify-center mb-2">
          <span className="inline-block text-xs text-slate-500 bg-white/70 rounded-full px-4 py-1.5 shadow-sm">
            Replies are for general guidance only
          </span>
        </div>

        {messages.map((msg) => {
          const isPatient = msg.senderId === "patient";
          return (
            <div
              key={msg.id}
              className={cn("flex items-end gap-2", isPatient ? "justify-end" : "justify-start")}
            >
              {/* Pharmacist avatar */}
              {!isPatient && (
                <div className="w-7 h-7 rounded-full bg-farumasi-600 flex items-center justify-center font-bold text-white text-[10px] shrink-0 mb-0.5">
                  {(DEFAULT_PHARMACIST?.name ?? "P").split(" ").map((n) => n[0]).join("")}
                </div>
              )}

              {/* Bubble */}
              <div
                className={cn(
                  "max-w-[75%] px-4 py-2 text-sm leading-relaxed shadow-sm",
                  isPatient
                    ? "bg-farumasi-600 text-white"
                    : "bg-white text-slate-900 border border-slate-200"
                )}
                style={{
                  borderRadius: isPatient
                    ? "16px 16px 16px 0px"
                    : "16px 16px 0px 16px",
                }}
              >
                {msg.content}
                <div
                  className={cn(
                    "flex items-center gap-1 mt-1 justify-end",
                    isPatient ? "text-white/60" : "text-slate-400"
                  )}
                >
                  <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                  {isPatient && <CheckCheck className="w-3 h-3" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typing && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-farumasi-600 flex items-center justify-center font-bold text-white text-[10px] shrink-0">
              {(DEFAULT_PHARMACIST?.name ?? "P").split(" ").map((n) => n[0]).join("")}
            </div>
            <div
              className="bg-white border border-slate-200 px-4 py-3 shadow-sm"
              style={{ borderRadius: "16px 16px 0px 16px" }}
            >
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

      {/* ── Input row — Flutter: white bg, attach (green), filled grey field, green circle send ── */}
      <div className="px-4 py-3 bg-white shrink-0 flex items-center gap-2">
        {/* Attach icon — green */}
        <button className="text-farumasi-600 hover:text-farumasi-700 shrink-0 transition-colors">
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text field — filled grey, rounded-24px */}
        <div className="flex-1 bg-[#F0F2F5] rounded-[24px] px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message…"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
          />
        </div>

        {/* Send button — green circle */}
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
