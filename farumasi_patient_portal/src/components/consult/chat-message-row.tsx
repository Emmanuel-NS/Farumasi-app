"use client";

import { useRef, useState, type TouchEvent } from "react";
import {
  CheckCheck,
  CornerUpLeft,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import type { ChatMessage, ChatProductRef, Pharmacist } from "@/types";

const SWIPE_REPLY_THRESHOLD = 56;
const PLACEHOLDER_PRODUCT = "/pill-placeholder.svg";

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
      <div className="flex items-center gap-2 rounded-lg px-3 py-4 bg-slate-100 text-slate-500 text-xs">
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

function humanSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ChatMessageRowProps {
  msg: ChatMessage;
  selectedPh: Pharmacist;
  productPreview?: ChatProductRef;
  formatTime: (d: Date) => string;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onDelete: (msg: ChatMessage) => void;
}

export function ChatMessageRow({
  msg,
  selectedPh,
  productPreview,
  formatTime,
  onReply,
  onEdit,
  onDelete,
}: ChatMessageRowProps) {
  const isPatient = msg.isMe;
  const isPending = msg.id.startsWith("tmp-");
  const body = msg.content?.trim() ?? "";
  const hasAttachment = Boolean(msg.attachmentUrl && msg.attachmentType);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swiping = useRef(false);

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swiping.current = false;
  };

  const onTouchMove = (e: TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!swiping.current && Math.abs(dy) > Math.abs(dx)) return;
    swiping.current = true;
    const clamped = Math.max(0, Math.min(dx, 80));
    setDragX(clamped);
  };

  const onTouchEnd = () => {
    if (dragX >= SWIPE_REPLY_THRESHOLD) onReply(msg);
    setDragX(0);
    swiping.current = false;
  };

  const canEdit =
    isPatient && !isPending && !msg.isDeleted && (body.length > 0 || hasAttachment);
  const canDelete = isPatient && !isPending && !msg.isDeleted;

  const replyPreview = msg.replyTo;
  const productImage = productPreview?.imageUrl ?? PLACEHOLDER_PRODUCT;

  return (
    <div
      className={cn(
        "relative w-full mb-3 select-none",
        isPatient ? "pl-8" : "pr-8",
      )}
    >
      {dragX > 8 && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center text-farumasi-600 transition-opacity",
            dragX >= SWIPE_REPLY_THRESHOLD ? "opacity-100" : "opacity-40",
          )}
          style={{ width: dragX }}
        >
          <CornerUpLeft className="w-5 h-5 ml-2" />
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-2",
          isPatient ? "justify-end" : "justify-start",
        )}
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragX ? "none" : "transform 0.2s ease",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {!isPatient && (
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full border-2 border-white overflow-hidden bg-farumasi-600 shrink-0">
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

        <div className="relative group max-w-[min(100%,320px)] sm:max-w-[78%] lg:max-w-[62%]">
          {!isPending && (canEdit || canDelete) && (
            <div className="absolute -top-1 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity right-0">
              <button
                type="button"
                aria-label="Message actions"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-xl border border-slate-200 bg-white shadow-lg py-1 text-sm">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-800"
                      onClick={() => {
                        setMenuOpen(false);
                        onReply(msg);
                      }}
                    >
                      <CornerUpLeft className="w-4 h-4" /> Reply
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-800"
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit(msg);
                        }}
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(msg);
                        }}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div
            className={cn(
              "px-3.5 py-2.5 text-sm leading-relaxed border",
              isPatient
                ? "bg-farumasi-600 text-white border-farumasi-600 rounded-[20px_20px_6px_20px]"
                : "bg-white text-slate-900 border-slate-200 rounded-[20px_20px_20px_6px]",
              msg.isDeleted && "italic opacity-70",
            )}
            onContextMenu={(e) => {
              if (!canEdit && !canDelete) return;
              e.preventDefault();
              setMenuOpen(true);
            }}
          >
            {replyPreview && (
              <div
                className={cn(
                  "mb-2 rounded-lg border-l-4 px-2.5 py-1.5 text-xs",
                  isPatient
                    ? "border-white/70 bg-white/10 text-white/90"
                    : "border-farumasi-500 bg-farumasi-50 text-slate-700",
                )}
              >
                <p className="font-bold truncate">
                  {replyPreview.senderName || (replyPreview.senderId === msg.senderId ? "You" : selectedPh.name)}
                </p>
                <p className="truncate opacity-90">
                  {replyPreview.isDeleted
                    ? "Message deleted"
                    : replyPreview.content ||
                      (replyPreview.attachmentType === "product"
                        ? replyPreview.attachmentName ?? "Product"
                        : replyPreview.attachmentType === "image"
                          ? "Photo"
                          : "Attachment")}
                </p>
              </div>
            )}

            {msg.isDeleted ? (
              <span className="text-xs">This message was deleted</span>
            ) : (
              <>
                {msg.attachmentType === "image" && msg.attachmentUrl && (
                  <a
                    href={msg.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mb-1 rounded-lg overflow-hidden bg-slate-100"
                  >
                    <ChatImage
                      src={msg.attachmentUrl}
                      alt={msg.attachmentName ?? "attachment"}
                      className="w-full max-w-[240px] h-auto max-h-[240px] object-cover block"
                    />
                  </a>
                )}

                {msg.attachmentType === "file" && msg.attachmentUrl && (
                  <a
                    href={msg.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={msg.attachmentName}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 mb-1",
                      isPatient ? "bg-white text-slate-900" : "bg-slate-100 text-slate-900",
                    )}
                  >
                    <FileText className="w-5 h-5 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold truncate">
                        {msg.attachmentName ?? "Document"}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {humanSize(msg.attachmentSize)}
                      </span>
                    </span>
                    <Download className="w-4 h-4 shrink-0 text-slate-400" />
                  </a>
                )}

                {msg.attachmentType === "product" && msg.attachmentUrl && (
                  <a
                    href={msg.attachmentUrl}
                    className={cn(
                      "block mb-1 rounded-lg overflow-hidden border no-underline",
                      isPatient
                        ? "bg-white text-slate-900 border-white"
                        : "bg-white text-slate-900 border-slate-200",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={productImage}
                      alt={msg.attachmentName ?? "Product"}
                      className="w-full h-28 object-cover bg-slate-100"
                      loading="lazy"
                    />
                    <span className="flex items-center gap-2 px-3 py-2">
                      <span className="w-8 h-8 rounded-lg bg-farumasi-100 text-farumasi-700 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Product
                        </span>
                        <span className="block text-xs font-bold truncate">
                          {productPreview?.name ?? msg.attachmentName ?? "View product"}
                        </span>
                        {productPreview?.price != null && productPreview.price > 0 && (
                          <span className="block text-[10px] text-farumasi-700 font-semibold">
                            From {productPreview.price.toLocaleString()} RWF
                          </span>
                        )}
                      </span>
                      <ExternalLink className="w-4 h-4 shrink-0 text-slate-400" />
                    </span>
                  </a>
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

                {!body && hasAttachment && !msg.isDeleted && (
                  <span className="block text-xs text-slate-500 mt-1">
                    {msg.attachmentType === "image"
                      ? "Photo"
                      : msg.attachmentType === "product"
                        ? "Shared product"
                        : "Attachment"}
                  </span>
                )}
              </>
            )}

            <div
              className={cn(
                "flex items-center gap-1 mt-1 justify-end text-[10px]",
                isPatient ? "text-white/70" : "text-slate-400",
              )}
            >
              {msg.editedAt && <span className="mr-1">edited</span>}
              <span>{formatTime(msg.timestamp)}</span>
              {isPatient && (
                <CheckCheck className={cn("w-3 h-3", isPending && "opacity-50")} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
