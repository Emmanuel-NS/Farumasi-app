"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Eye, Edit2, Trash2, Search, BookOpen, X, Save, Archive, Send } from "lucide-react";
import { toast } from "sonner";
import {
  articlesService,
  type BackendArticle,
  type ArticleStatus,
  type CreateArticleInput,
} from "@/lib/services/articles.service";

type Tab = "all" | ArticleStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: "all",       label: "All" },
  { id: "draft",     label: "Drafts" },
  { id: "published", label: "Published" },
  { id: "archived",  label: "Archived" },
];

function StatusChip({ s }: { s: ArticleStatus }) {
  const map: Record<ArticleStatus, string> = {
    draft:     "bg-amber-50 text-amber-700",
    published: "bg-green-50 text-green-700",
    archived:  "bg-slate-100 text-slate-500",
  };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${map[s]}`}>{s}</span>;
}

export default function HealthPage() {
  const [items, setItems]     = useState<BackendArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>("all");
  const [search, setSearch]   = useState("");
  const [preview, setPreview] = useState<BackendArticle | null>(null);
  const [editor, setEditor]   = useState<BackendArticle | "new" | null>(null);
  const [confirmDel, setConfirmDel] = useState<BackendArticle | null>(null);

  const load = () => {
    setLoading(true);
    articlesService
      .listAdmin({ limit: 100 })
      .then((r) => setItems(r.items))
      .catch(() => toast.error("Failed to load articles"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = items
    .filter((a) => tab === "all" || a.status === tab)
    .filter((a) => !search.trim() || a.title.toLowerCase().includes(search.toLowerCase()));

  const handleSaved = () => {
    setEditor(null);
    load();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-farumasi-600" /> Health Content
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Author and publish articles for patients</p>
        </div>
        <button
          onClick={() => setEditor("new")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-farumasi-600 text-white text-sm font-semibold hover:bg-farumasi-700"
        >
          <Plus className="w-4 h-4" /> New Article
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-5 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles…"
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-200 bg-white"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No articles yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {a.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image_url} alt={a.title} className="w-full h-32 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <StatusChip s={a.status} />
                  {a.category && <span className="text-[11px] text-slate-400">{a.category}</span>}
                </div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{a.title}</h3>
                {a.summary && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.summary}</p>}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => setPreview(a)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button onClick={() => setEditor(a)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-farumasi-600 hover:bg-farumasi-50">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  {a.status !== "published" && (
                    <button
                      onClick={async () => {
                        try { await articlesService.publish(a.id); toast.success("Published"); load(); }
                        catch { toast.error("Failed to publish"); }
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50"
                    >
                      <Send className="w-3.5 h-3.5" /> Publish
                    </button>
                  )}
                  {a.status === "published" && (
                    <button
                      onClick={async () => {
                        try { await articlesService.archive(a.id); toast.success("Archived"); load(); }
                        catch { toast.error("Failed to archive"); }
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-50"
                    >
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </button>
                  )}
                  <button onClick={() => setConfirmDel(a)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && <PreviewDialog post={preview} onClose={() => setPreview(null)} />}
      {editor && <EditorDialog initial={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSaved={handleSaved} />}
      {confirmDel && (
        <ConfirmDialog
          title={confirmDel.title}
          onCancel={() => setConfirmDel(null)}
          onConfirm={async () => {
            try { await articlesService.remove(confirmDel.id); toast.success("Article deleted"); load(); }
            catch { toast.error("Failed to delete"); }
            setConfirmDel(null);
          }}
        />
      )}
    </div>
  );
}

function PreviewDialog({ post, onClose }: { post: BackendArticle; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt={post.title} className="w-full h-48 object-cover" />
        )}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{post.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusChip s={post.status} />
              {post.category && <span className="text-xs text-slate-400">{post.category}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div
          className="flex-1 overflow-y-auto px-6 py-5 prose prose-sm max-w-none text-slate-700"
          dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
        />
      </div>
    </div>
  );
}

function EditorDialog({
  initial, onClose, onSaved,
}: { initial: BackendArticle | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateArticleInput>({
    title:     initial?.title ?? "",
    summary:   initial?.summary ?? "",
    content:   initial?.content ?? "",
    category:  initial?.category ?? "",
    image_url: initial?.image_url ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.content?.trim()) { toast.error("Content is required"); return; }
    setSaving(true);
    try {
      if (initial) await articlesService.update(initial.id, form);
      else         await articlesService.create(form);
      toast.success(initial ? "Article updated" : "Article created");
      onSaved();
    } catch {
      toast.error("Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{initial ? "Edit Article" : "New Article"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Title">
            <input className={INP} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 5 ways to stay hydrated" />
          </Field>
          <Field label="Category">
            <input className={INP} value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Nutrition" />
          </Field>
          <Field label="Cover image URL">
            <input className={INP} value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Summary">
            <textarea rows={2} className={INP} value={form.summary ?? ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Short teaser shown in listings" />
          </Field>
          <Field label="Content (HTML supported)">
            <textarea rows={10} className={INP + " font-mono text-xs"} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="<p>Write your article here…</p>" />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-farumasi-600 text-white text-sm font-semibold hover:bg-farumasi-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 flex flex-col gap-5">
        <div>
          <p className="text-lg font-bold text-slate-900">Delete article?</p>
          <p className="mt-1 text-sm text-slate-500"><span className="font-medium text-slate-700">&ldquo;{title}&rdquo;</span> will be permanently removed.</p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

const INP = "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-200";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
