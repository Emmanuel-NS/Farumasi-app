"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Image as ImageIcon,
  Code,
  Heading1,
  Heading2,
  Heading3,
  HighlighterIcon,
  Undo2,
  Redo2,
  Minus,
} from "lucide-react";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TEXT_COLORS = [
  { label: "Default", value: "#000000" },
  { label: "Primary", value: "#1e9e68" },
  { label: "Red",     value: "#ef4444" },
  { label: "Blue",    value: "#3b82f6" },
  { label: "Orange",  value: "#f97316" },
  { label: "Purple",  value: "#8b5cf6" },
  { label: "Gray",    value: "#6b7280" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green",  value: "#bbf7d0" },
  { label: "Blue",   value: "#bfdbfe" },
  { label: "Pink",   value: "#fbcfe8" },
];

export default function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Write your article content here…" }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-1.5 rounded-lg transition-colors ${
      active
        ? "bg-farumasi-600 text-white"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  const addImage = () => {
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = window.prompt("Link URL");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-farumasi-200">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
        {/* Undo / Redo */}
        <button type="button" title="Undo" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="w-4 h-4" />
        </button>
        <button type="button" title="Redo" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Headings */}
        <button type="button" title="Heading 1" className={btn(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="w-4 h-4" />
        </button>
        <button type="button" title="Heading 2" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-4 h-4" />
        </button>
        <button type="button" title="Heading 3" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Inline styles */}
        <button type="button" title="Bold" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" title="Italic" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" title="Underline" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button type="button" title="Inline code" className={btn(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Lists */}
        <button type="button" title="Bullet list" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </button>
        <button type="button" title="Numbered list" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Alignment */}
        <button type="button" title="Align left" className={btn(editor.isActive({ textAlign: "left" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="w-4 h-4" />
        </button>
        <button type="button" title="Align center" className={btn(editor.isActive({ textAlign: "center" }))} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="w-4 h-4" />
        </button>
        <button type="button" title="Align right" className={btn(editor.isActive({ textAlign: "right" }))} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="w-4 h-4" />
        </button>
        <button type="button" title="Justify" className={btn(editor.isActive({ textAlign: "justify" }))} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Text color */}
        <div className="relative group">
          <button type="button" title="Text color" className={btn(false)}>
            <span className="w-4 h-4 font-bold text-[13px] leading-none flex items-center justify-center" style={{ color: editor.getAttributes("textStyle").color || "#000" }}>A</span>
          </button>
          <div className="absolute top-full left-0 mt-1 z-20 hidden group-hover:flex gap-1 p-1.5 bg-white border border-slate-200 rounded-xl shadow-lg">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => editor.chain().focus().setColor(c.value).run()}
                className="w-5 h-5 rounded-full border border-slate-200 hover:scale-110 transition-transform"
                style={{ background: c.value }}
              />
            ))}
          </div>
        </div>

        {/* Highlight */}
        <div className="relative group">
          <button type="button" title="Highlight" className={btn(editor.isActive("highlight"))}>
            <HighlighterIcon className="w-4 h-4" />
          </button>
          <div className="absolute top-full left-0 mt-1 z-20 hidden group-hover:flex gap-1 p-1.5 bg-white border border-slate-200 rounded-xl shadow-lg">
            <button type="button" title="Remove" onClick={() => editor.chain().focus().unsetHighlight().run()} className="w-5 h-5 rounded-full border border-slate-200 bg-white hover:scale-110 transition-transform text-[8px] text-slate-400 flex items-center justify-center">✕</button>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => editor.chain().focus().setHighlight({ color: c.value }).run()}
                className="w-5 h-5 rounded-full border border-slate-200 hover:scale-110 transition-transform"
                style={{ background: c.value }}
              />
            ))}
          </div>
        </div>
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Link / Image / HR */}
        <button type="button" title="Insert link" className={btn(editor.isActive("link"))} onClick={addLink}>
          <Link2 className="w-4 h-4" />
        </button>
        <button type="button" title="Insert image" className={btn(false)} onClick={addImage}>
          <ImageIcon className="w-4 h-4" />
        </button>
        <button type="button" title="Horizontal rule" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="min-h-[280px] max-h-[480px] overflow-y-auto px-4 py-3 text-sm text-slate-800 prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-slate-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}
