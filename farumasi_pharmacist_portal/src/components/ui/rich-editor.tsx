"use client";

import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Strikethrough, UnderlineIcon,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Link2, ImageIcon, Highlighter, ChevronDown, X,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────
const FONTS = [
  { label: "Default",         value: "" },
  { label: "Inter",           value: "Inter, sans-serif" },
  { label: "Arial",           value: "Arial, sans-serif" },
  { label: "Georgia",         value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New",     value: "'Courier New', monospace" },
];

const SIZES = ["10", "11", "12", "14", "16", "18", "20", "24", "28", "36", "48"];

const TEXT_COLORS = [
  "#000000", "#374151", "#6B7280", "#FFFFFF",
  "#DC2626", "#EA580C", "#D97706", "#16A34A",
  "#1E9E68", "#0284C7", "#7C3AED", "#DB2777",
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow",  value: "#FEF08A" },
  { label: "Green",   value: "#BBF7D0" },
  { label: "Blue",    value: "#BFDBFE" },
  { label: "Pink",    value: "#FBCFE8" },
  { label: "Purple",  value: "#DDD6FE" },
  { label: "Orange",  value: "#FED7AA" },
];

// ── Props ────────────────────────────────────────────────────────────
interface RichEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  showCount?: boolean;
}

// ── Toolbar button ───────────────────────────────────────────────────
function Btn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button" title={title} disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded transition-all select-none shrink-0",
        active  ? "bg-farumasi-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        disabled && "opacity-30 cursor-not-allowed pointer-events-none",
      )}
    >{children}</button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5 self-center shrink-0" />;
}

// ── Dropdown selector ────────────────────────────────────────────────
function DropSelect({
  value, options, onChange, width = "w-28",
}: {
  value: string; options: { label: string; value: string }[];
  onChange: (v: string) => void; width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className={cn("relative select-none shrink-0", width)}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="flex items-center w-full gap-1 px-2 h-7 rounded text-[12px] text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200"
      >
        <span className="flex-1 text-left truncate">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 min-w-full max-h-52 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[12px] hover:bg-slate-50 transition-colors",
                value === opt.value ? "text-farumasi-600 font-semibold" : "text-slate-700",
              )}
              style={opt.value ? { fontFamily: opt.value } : {}}
            >{opt.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Color palette ────────────────────────────────────────────────────
function ColorPicker({
  colors, onSelect, trigger,
}: {
  colors: string[]; onSelect: (c: string) => void; trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        title="Text color"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-slate-100 transition-colors"
      >{trigger}</button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2.5">
          <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Text color</p>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => { e.preventDefault(); onSelect(c); setOpen(false); }}
                className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                style={{ background: c }}
              />
            ))}
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="color"
              className="w-6 h-6 rounded cursor-pointer border-0"
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => { onSelect(e.target.value); setOpen(false); }}
            />
            <span className="text-[11px] text-slate-500">Custom</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ── Highlight picker ──────────────────────────────────────────────────
function HighlightPicker({ onSelect }: { onSelect: (c: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button" title="Highlight"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-slate-100 transition-colors"
      >
        <Highlighter className="w-3.5 h-3.5 text-slate-600" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2">
          <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Highlight</p>
          <div className="grid grid-cols-2 gap-1">
            {HIGHLIGHT_COLORS.map((h) => (
              <button
                key={h.value}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(h.value); setOpen(false); }}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 text-[12px] text-slate-700"
              >
                <span className="w-4 h-4 rounded border border-slate-200 shrink-0" style={{ background: h.value }} />
                {h.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(null); setOpen(false); }}
            className="mt-1 w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-50 text-[11px] text-slate-400"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ── Link dialog ───────────────────────────────────────────────────────
function LinkDialog({ onConfirm, onCancel, initial }: {
  onConfirm: (url: string, newTab: boolean) => void;
  onCancel: () => void; initial: string;
}) {
  const [url, setUrl] = useState(initial);
  const [newTab, setNewTab] = useState(true);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <p className="font-bold text-slate-900 text-base">Insert Link</p>
        <input
          autoFocus type="url" value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onConfirm(url, newTab); if (e.key === "Escape") onCancel(); }}
          placeholder="https://example.com"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} className="rounded" />
          Open in new tab
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="button" onClick={() => onConfirm(url, newTab)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-farumasi-600 text-white hover:bg-farumasi-700">Insert</button>
        </div>
      </div>
    </div>
  );
}

// ── Image dialog ──────────────────────────────────────────────────────
function ImageDialog({ onConfirm, onCancel }: {
  onConfirm: (url: string, alt: string) => void; onCancel: () => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <p className="font-bold text-slate-900 text-base">Insert Image</p>
        <input
          autoFocus type="url" value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Image URL (https://...)"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400"
        />
        <input
          type="text" value={alt} onChange={(e) => setAlt(e.target.value)}
          placeholder="Alt text (optional)"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="button" onClick={() => url && onConfirm(url, alt)} disabled={!url}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-farumasi-600 text-white hover:bg-farumasi-700 disabled:opacity-40">
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────
export function RichEditor({
  value, onChange, placeholder = "Start writing...",
  minHeight = 220, className, showCount = false,
}: RichEditorProps) {
  const [linkDialog, setLinkDialog] = useState(false);
  const [imageDialog, setImageDialog] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Disable built-ins we configure separately to avoid duplicate extension warnings
        link: false,
        underline: false,
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder, emptyEditorClass: "is-editor-empty" }),
      CharacterCount,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Underline,
      Highlight.configure({ multicolor: true }),
      TiptapLink.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      TiptapImage.configure({ inline: false, HTMLAttributes: { class: "max-w-full rounded-lg my-2" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value || "",
    onUpdate({ editor }) { onChange?.(editor.getHTML()); },
    immediatelyRender: true,
    editorProps: { attributes: { class: "outline-none" } },
  });

  if (!editor) return null;

  const words = editor.storage.characterCount?.words?.() ?? 0;
  const currentFont = editor.getAttributes("textStyle").fontFamily ?? "";
  const currentSize = editor.getAttributes("textStyle").fontSize?.replace("px", "") ?? "";

  const handleLink = (url: string, newTab: boolean) => {
    if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: newTab ? "_blank" : undefined }).run();
    setLinkDialog(false);
  };

  const handleImage = (url: string, alt: string) => {
    editor.chain().focus().setImage({ src: url, alt }).run();
    setImageDialog(false);
  };

  return (
    <>
      {linkDialog && (
        <LinkDialog
          initial={editor.getAttributes("link").href ?? ""}
          onConfirm={handleLink}
          onCancel={() => setLinkDialog(false)}
        />
      )}
      {imageDialog && (
        <ImageDialog onConfirm={handleImage} onCancel={() => setImageDialog(false)} />
      )}

      <div className={cn(
        "flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white",
        "focus-within:border-farumasi-400 focus-within:ring-4 focus-within:ring-farumasi-100 transition-all",
        className,
      )}>
        {/* ── Row 1: History + Font + Inline ── */}
        <div className="flex flex-wrap items-center gap-1 px-2.5 py-1.5 bg-white border-b border-slate-100">
          <Btn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <Undo className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <Redo className="w-3.5 h-3.5" />
          </Btn>
          <Sep />

          <DropSelect
            value={currentFont}
            options={FONTS}
            width="w-32"
            onChange={(v) => {
              if (!v) editor.chain().focus().unsetFontFamily().run();
              else editor.chain().focus().setFontFamily(v).run();
            }}
          />

          <DropSelect
            value={currentSize}
            options={[{ label: "Size", value: "" }, ...SIZES.map((s) => ({ label: `${s}px`, value: s }))]}
            width="w-20"
            onChange={(v) => {
              if (!v) editor.chain().focus().unsetFontSize().run();
              else editor.chain().focus().setFontSize(`${v}px`).run();
            }}
          />
          <Sep />

          <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="w-3.5 h-3.5" />
          </Btn>
          <Sep />

          <ColorPicker
            colors={TEXT_COLORS}
            onSelect={(c) => editor.chain().focus().setColor(c).run()}
            trigger={
              <span className="flex flex-col items-center justify-center w-full h-full gap-0.5">
                <span className="font-bold text-[12px] text-slate-700 leading-none">A</span>
                <span
                  className="w-3.5 h-1 rounded-sm"
                  style={{ background: editor.getAttributes("textStyle").color ?? "#000" }}
                />
              </span>
            }
          />
          <HighlightPicker
            onSelect={(c) => {
              if (!c) editor.chain().focus().unsetHighlight().run();
              else editor.chain().focus().setHighlight({ color: c }).run();
            }}
          />
          <Sep />

          <Btn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="w-3.5 h-3.5" />
          </Btn>
        </div>

        {/* ── Row 2: Alignment + Lists + Blocks + Insert ── */}
        <div className="flex flex-wrap items-center gap-1 px-2.5 py-1.5 bg-slate-50/60 border-b border-slate-100">
          <Btn title="Align Left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignLeft className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Align Center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignCenter className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Align Right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignRight className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
            <AlignJustify className="w-3.5 h-3.5" />
          </Btn>
          <Sep />

          <Btn title="Bullet List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Numbered List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Task List" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
            <ListChecks className="w-3.5 h-3.5" />
          </Btn>
          <Sep />

          <Btn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="w-3.5 h-3.5" />
          </Btn>
          <Sep />

          <Btn title={editor.isActive("link") ? "Edit Link" : "Insert Link"} active={editor.isActive("link")} onClick={() => setLinkDialog(true)}>
            <Link2 className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Insert Image" onClick={() => setImageDialog(true)}>
            <ImageIcon className="w-3.5 h-3.5" />
          </Btn>

          {showCount && (
            <>
              <div className="flex-1" />
              <span className="text-[11px] text-slate-400 pr-1">{words} word{words !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>

        {/* ── Editor area ── */}
        <EditorContent
          editor={editor}
          style={{ minHeight }}
          className={cn(
            "flex-1 px-5 py-4 text-[14px] text-slate-800 leading-[1.75] cursor-text",
            "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
            "[&_.is-editor-empty:first-child::before]:text-slate-300",
            "[&_.is-editor-empty:first-child::before]:float-left",
            "[&_.is-editor-empty:first-child::before]:h-0",
            "[&_.is-editor-empty:first-child::before]:pointer-events-none",
            "[&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:text-slate-900 [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:tracking-tight",
            "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-4 [&_h2]:mb-1.5",
            "[&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-3 [&_h3]:mb-1",
            "[&_p]:mb-2.5 [&_p]:leading-[1.75]",
            "[&_a]:text-farumasi-600 [&_a]:underline [&_a]:cursor-pointer",
            "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ul]:space-y-1",
            "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_ol]:space-y-1",
            "[&_li]:leading-[1.7]",
            "[&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:pl-1",
            "[&_li[data-type='taskItem']]:flex [&_li[data-type='taskItem']]:items-start [&_li[data-type='taskItem']]:gap-2 [&_li[data-type='taskItem']]:mb-1",
            "[&_li[data-type='taskItem']>label]:mt-0.5 [&_li[data-type='taskItem']>label>input]:cursor-pointer",
            "[&_blockquote]:border-l-[3px] [&_blockquote]:border-farumasi-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_blockquote]:my-3 [&_blockquote]:bg-farumasi-50/40 [&_blockquote]:py-2 [&_blockquote]:rounded-r-lg",
            "[&_hr]:border-slate-200 [&_hr]:my-4",
            "[&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through",
            "[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2",
            "[&_mark]:rounded-sm [&_mark]:px-0.5",
            "[&_.ProseMirror]:outline-none",
          )}
        />
      </div>
    </>
  );
}
