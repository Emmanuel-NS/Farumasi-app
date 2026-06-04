"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Loader2, Plus, Eye, Edit2, Trash2, Search, BookOpen, X, Save, Archive, Send,
  Heart, MessageCircle, Share2, Upload, Link as LinkIcon, Youtube, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import api, { mediaUrl } from "@/lib/api";
import {
  articlesService,
  type BackendArticle,
  type ArticleStatus,
  type ArticleType,
  type CreateArticleInput,
} from "@/lib/services/articles.service";

const RichEditor = dynamic(() => import("@/components/RichEditor"), { ssr: false });

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
          <p className="text-slate-500 text-sm mt-0.5">
            Author and publish articles. Use <strong className="text-amber-700">Sponsored</strong> on a published post to pin it on the patient Health home carousel.
          </p>
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
                <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                  <div className="flex items-center gap-1.5">
                    <StatusChip s={a.status} />
                    {a.is_sponsored && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Sparkles className="w-3 h-3" /> Sponsored
                      </span>
                    )}
                  </div>
                  {a.category && <span className="text-[11px] text-slate-400">{a.category}</span>}
                </div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{a.title}</h3>
                {a.summary && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.summary}</p>}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-farumasi-50 text-farumasi-700">
                    {ARTICLE_TYPE_LABELS[a.article_type] ?? a.article_type ?? "article"}
                  </span>
                  {(a.categories ?? []).slice(0, 3).map((c) => (
                    <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{c}</span>
                  ))}
                  {(a.categories ?? []).length > 3 && (
                    <span className="text-[10px] text-slate-400">+{(a.categories?.length ?? 0) - 3}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{a.view_count ?? 0}</span>
                  <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" />{a.like_count ?? 0}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" />{a.comment_count ?? 0}</span>
                  <span className="inline-flex items-center gap-1"><Share2 className="w-3 h-3" />{a.share_count ?? 0}</span>
                </div>
                <label className="flex items-center gap-2 mt-3 p-2.5 rounded-xl border border-amber-100 bg-amber-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!a.is_sponsored}
                    onChange={async (e) => {
                      const next = e.target.checked;
                      try {
                        const updated = await articlesService.setSponsored(a.id, next);
                        const saved = updated.is_sponsored ?? next;
                        setItems((prev) =>
                          prev.map((row) =>
                            row.id === a.id ? { ...row, is_sponsored: saved } : row,
                          ),
                        );
                        toast.success(
                          saved
                            ? a.status === "published"
                              ? "Sponsored — visible on patient Store & Health home"
                              : "Sponsored saved — publish the article for patients to see it"
                            : "Removed from sponsored carousel",
                        );
                      } catch {
                        toast.error("Could not save sponsored status. Restart the API if this keeps failing.");
                      }
                    }}
                    className="rounded border-amber-300 text-farumasi-600 focus:ring-farumasi-500"
                  />
                  <span className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Sponsored (Store &amp; Health home)
                  </span>
                  {a.status !== "published" && (
                    <span className="text-[10px] text-amber-700 block mt-0.5">
                      Publish this article for patients to see it in the carousel.
                    </span>
                  )}
                </label>

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
  const [form, setForm] = useState<CreateArticleInput & { video_url?: string }>({
    title:        initial?.title ?? "",
    summary:      initial?.summary ?? "",
    content:      initial?.content ?? "",
    category:     initial?.category ?? "",
    categories:   initial?.categories ?? (initial?.category ? [initial.category] : []),
    article_type: (initial?.article_type as ArticleType) ?? "article",
    image_url:    initial?.image_url ?? "",
    video_url:    initial?.video_url ?? "",
    is_sponsored: initial?.is_sponsored ?? false,
  });
  const [saving, setSaving]             = useState(false);
  const [coverMode, setCoverMode]       = useState<"upload" | "url">("url");
  const [uploading, setUploading]       = useState(false);
  const fileRef                         = useRef<HTMLInputElement>(null);

  const toggleCategory = (c: string) => {
    setForm((f) => {
      const cur = new Set(f.categories ?? []);
      if (cur.has(c)) cur.delete(c);
      else cur.add(c);
      const next = Array.from(cur);
      return { ...f, categories: next, category: next[0] ?? "" };
    });
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{ url: string }>("/uploads/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, image_url: mediaUrl(data.url) }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.content?.trim()) { toast.error("Content is required"); return; }
    if (!form.categories || form.categories.length === 0) {
      toast.error("Pick at least one category");
      return;
    }
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{initial ? "Edit Article" : "New Article"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title */}
          <Field label="Title">
            <input className={INP} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 5 ways to stay hydrated" />
          </Field>

          <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.is_sponsored}
              onChange={(e) => setForm({ ...form, is_sponsored: e.target.checked })}
              className="mt-1 rounded border-amber-300 text-farumasi-600 focus:ring-farumasi-500"
            />
            <span>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-600" /> Sponsored content
              </span>
              <span className="text-xs text-slate-600 block mt-0.5">
                When published, appears in the rotating banner at the top of the patient Health page.
              </span>
            </span>
          </label>

          {/* Post type */}
          <Field label="Post type">
            <select
              className={INP}
              value={form.article_type ?? "article"}
              onChange={(e) => setForm({ ...form, article_type: e.target.value as ArticleType })}
            >
              {ARTICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          {/* Categories */}
          <Field label={`Categories${(form.categories?.length ?? 0) > 0 ? ` · ${form.categories!.length} selected` : ""}`}>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 border border-slate-200 rounded-xl">
              {HEALTH_CATEGORIES.map((c) => {
                const active = (form.categories ?? []).includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleCategory(c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? "bg-farumasi-600 text-white border-farumasi-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Pick one or more. The first is the primary category.</p>
          </Field>

          {/* Cover image */}
          <Field label="Cover image">
            <div className="flex gap-1 mb-2">
              <button
                type="button"
                onClick={() => setCoverMode("url")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${coverMode === "url" ? "bg-farumasi-600 text-white border-farumasi-600" : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"}`}
              >
                <LinkIcon className="w-3.5 h-3.5" /> Paste URL
              </button>
              <button
                type="button"
                onClick={() => setCoverMode("upload")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${coverMode === "upload" ? "bg-farumasi-600 text-white border-farumasi-600" : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"}`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload file
              </button>
            </div>
            {coverMode === "url" ? (
              <input
                className={INP}
                value={form.image_url ?? ""}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-600 hover:border-farumasi-400 hover:bg-farumasi-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Uploading…" : "Choose image"}
                </button>
                {form.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="preview" className="h-10 w-16 object-cover rounded-lg border border-slate-200" />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
              </div>
            )}
          </Field>

          {/* YouTube / video URL */}
          <Field label="Video URL (optional — YouTube or direct link)">
            <div className="relative">
              <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
              <input
                className={`${INP} pl-9`}
                value={form.video_url ?? ""}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=… (shown as hero instead of cover image)"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">If provided, the video will be displayed as the hero on the article page.</p>
          </Field>

          {/* Summary */}
          <Field label="Summary">
            <textarea rows={2} className={INP} value={form.summary ?? ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Short teaser shown in article listings" />
          </Field>

          {/* Rich text content */}
          <Field label="Content">
            <RichEditor
              value={form.content ?? ""}
              onChange={(html) => setForm((f) => ({ ...f, content: html }))}
              placeholder="Write your article content here…"
            />
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

const ARTICLE_TYPES: { value: ArticleType; label: string }[] = [
  { value: "article",      label: "Article" },
  { value: "tip",          label: "Tip" },
  { value: "guide",        label: "Guide" },
  { value: "news",         label: "News" },
  { value: "did_you_know", label: "Did You Know?" },
];

const ARTICLE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ARTICLE_TYPES.map((t) => [t.value, t.label]),
);

const HEALTH_CATEGORIES = [
  "General Health", "Wellness", "First Aid",
  "Chronic Disease", "Infectious Diseases", "Cardiovascular", "Respiratory",
  "Digestive Health", "Skin Health", "Eye Health", "Oral Health",
  "Medication Safety", "Remedies", "Antibiotics", "Elderly Care",
  "Women's Health", "Pediatrics", "Mother & Babies",
  "SRH", "Sexual Health",
  "Mental Health", "Nutrition",
  "Did You Know?",
] as const;

const INP = "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-200";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
