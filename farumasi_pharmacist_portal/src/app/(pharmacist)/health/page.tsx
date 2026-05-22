"use client";

import { useState, useMemo } from "react";
import { RichEditor } from "@/components/ui/rich-editor";
import type { HealthPost, HealthPostCategory, HealthPostStatus } from "@/types";
import {
  ArrowLeft, PenLine, Eye, Trash2, Edit2,
  Search, ChevronDown, BookOpen, Heart,
} from "lucide-react";
import { toast } from "sonner";

// ── Constants ────────────────────────────────────────────────────────
const CATEGORIES: HealthPostCategory[] = [
  "General Tips", "Remedies", "SRH", "Mental Health",
  "Nutrition", "Mother & Babies", "Did You Know?",
];

const CATEGORY_COLORS: Record<HealthPostCategory, { bg: string; text: string }> = {
  "General Tips":    { bg: "bg-farumasi-50",  text: "text-farumasi-700" },
  "Remedies":        { bg: "bg-amber-50",      text: "text-amber-700" },
  "SRH":             { bg: "bg-pink-50",       text: "text-pink-700" },
  "Mental Health":   { bg: "bg-violet-50",     text: "text-violet-700" },
  "Nutrition":       { bg: "bg-lime-50",       text: "text-lime-700" },
  "Mother & Babies": { bg: "bg-sky-50",        text: "text-sky-700" },
  "Did You Know?":   { bg: "bg-orange-50",     text: "text-orange-700" },
};

function CategoryBadge({ cat }: { cat: HealthPostCategory }) {
  const { bg, text } = CATEGORY_COLORS[cat];
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${bg} ${text}`}>
      {cat}
    </span>
  );
}

function StatusChip({ status }: { status: HealthPostStatus }) {
  const isPublished = status === "Published";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
      isPublished ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"
    }`}>
      {status}
    </span>
  );
}

// ── Preview dialog ────────────────────────────────────────────────────
function PreviewDialog({ post, onClose }: { post: HealthPost; onClose: () => void }) {
  const cat = CATEGORY_COLORS[post.category];

  // Determine hero media: YouTube embed > coverImage > posterImage
  const ytEmbed = (() => {
    if (!post.youtubeLink) return null;
    const m = post.youtubeLink.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/
    );
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  })();
  const heroImage = post.coverImage || post.posterImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Hero media */}
        {ytEmbed ? (
          <div className="relative w-full" style={{ paddingTop: "40%" }}>
            <iframe
              src={ytEmbed}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={post.title}
            />
          </div>
        ) : heroImage ? (
          <div className="relative w-full h-48 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt={post.title} className="w-full h-full object-cover" />
          </div>
        ) : null}

        <div className="flex items-start justify-between px-7 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">{post.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cat.bg} ${cat.text}`}>{post.category}</span>
              <span className="text-xs text-slate-400">{post.date}</span>
              <StatusChip status={post.status} />
            </div>
          </div>
          <button onClick={onClose} className="ml-4 p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">✕</button>
        </div>
        <div
          className="flex-1 overflow-y-auto px-7 py-5 prose prose-sm max-w-none text-slate-700"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </div>
  );
}

// ── Delete confirm dialog ─────────────────────────────────────────────
function DeleteDialog({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 flex flex-col gap-5">
        <div>
          <p className="text-lg font-bold text-slate-900">Delete article?</p>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-medium text-slate-700">&ldquo;{title}&rdquo;</span> will be permanently removed.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composer ─────────────────────────────────────────────────────────
interface ComposerProps {
  initial?: HealthPost;
  onSave: (post: Omit<HealthPost, "id" | "views" | "date">, status: HealthPostStatus) => void;
  onBack: () => void;
}

function Composer({ initial, onSave, onBack }: ComposerProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [category, setCategory] = useState<HealthPostCategory>(initial?.category ?? "General Tips");
  const [content, setContent] = useState(initial?.content ?? "");
  const [posterImage, setPosterImage] = useState(initial?.posterImage ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [youtubeLink, setYoutubeLink] = useState(initial?.youtubeLink ?? "");

  const handleSave = (status: HealthPostStatus) => {
    if (!title.trim()) {
      toast.error("Article title is required.");
      return;
    }
    onSave(
      {
        title: title.trim(),
        summary: summary.trim() || "No summary provided.",
        category,
        content,
        status,
        posterImage: posterImage.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        youtubeLink: youtubeLink.trim() || undefined,
      },
      status,
    );
    toast.success(status === "Published" ? "Article published!" : "Draft saved.");
  };

  return (
    <div className="flex flex-col min-h-full bg-[#F6F8FB]">
      {/* Composer header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="flex-1 text-base font-bold text-slate-800">
          {initial ? "Edit Article" : "New Article"}
        </span>
        <button
          onClick={() => handleSave("Draft")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          Save Draft
        </button>
        <button
          onClick={() => handleSave("Published")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-farumasi-600 text-white hover:bg-farumasi-700 transition-colors"
        >
          <PenLine className="w-4 h-4" />
          {initial ? "Update" : "Publish"}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Main editor column */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title…"
              className="w-full text-3xl font-extrabold text-slate-900 placeholder:text-slate-200 bg-transparent outline-none border-none mb-6 leading-tight"
            />
            <RichEditor
              value={content}
              onChange={setContent}
              placeholder="Start writing your article…"
              minHeight={480}
              showCount
            />
          </div>
        </div>

        {/* Meta sidebar */}
        <div className="w-full lg:w-80 shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-100 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            <p className="text-sm font-bold text-slate-800 tracking-wide uppercase">Publishing Settings</p>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as HealthPostCategory)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400 pr-9"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Short Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                placeholder="A brief preview of the article…"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400"
              />
            </div>

            {/* Media */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600">Media</p>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Poster Image URL <span className="text-slate-400">(thumbnail)</span></label>
                <input
                  type="url"
                  value={posterImage}
                  onChange={(e) => setPosterImage(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Cover Image URL <span className="text-slate-400">(hero when reading)</span></label>
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://… (optional — falls back to poster)"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  YouTube Link <span className="text-slate-400">(overrides cover image)</span>
                </label>
                <input
                  type="url"
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400"
                />
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-xl bg-farumasi-50 p-4">
              <p className="text-xs font-semibold text-farumasi-700 mb-1.5">Writing Tips</p>
              <ul className="text-xs text-farumasi-600 space-y-1 list-disc pl-3.5">
                <li>Keep titles clear and action-oriented</li>
                <li>Add a concise summary — shown on card previews</li>
                <li>Use headings to structure long articles</li>
                <li>Cite sources when mentioning clinical guidance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Post card ──────────────────────────────────────────────────────────
function PostCard({
  post, onEdit, onDelete, onView,
}: {
  post: HealthPost;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      {/* Poster image */}
      {post.posterImage && (
        <div className="relative w-full h-36 shrink-0 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.posterImage} alt={post.title} className="w-full h-full object-cover" />
          {post.youtubeLink && (
            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">▶ Video</span>
          )}
        </div>
      )}
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <CategoryBadge cat={post.category} />
          <StatusChip status={post.status} />
        </div>
        <h3
          className="text-[15px] font-extrabold text-slate-900 leading-snug mb-2 line-clamp-2 cursor-pointer hover:text-farumasi-700 transition-colors"
          onClick={onView}
        >
          {post.title}
        </h3>
        <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed">{post.summary}</p>
      </div>
      <div className="flex items-center gap-3 px-5 py-3 bg-slate-50/70 border-t border-slate-100">
        <Eye className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-500 font-medium">{post.views.toLocaleString()}</span>
        <span className="flex-1 text-xs text-slate-400 text-right">{post.date}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onView}
            title="Read"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEdit}
            title="Edit"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
type View = "list" | "composer";

export default function HealthPage() {
  const [posts, setPosts] = useState<HealthPost[]>([]);
  const [view, setView] = useState<View>("list");
  const [editingPost, setEditingPost] = useState<HealthPost | undefined>(undefined);
  const [previewPost, setPreviewPost] = useState<HealthPost | undefined>(undefined);
  const [deletingPost, setDeletingPost] = useState<HealthPost | undefined>(undefined);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<HealthPostCategory | "All">("All");
  const [sortBy, setSortBy] = useState<"Newest" | "Most Viewed">("Newest");

  const filtered = useMemo(() => {
    let result = posts.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q);
      const matchCat = filterCat === "All" || p.category === filterCat;
      return matchSearch && matchCat;
    });
    if (sortBy === "Most Viewed") {
      result = [...result].sort((a, b) => b.views - a.views);
    }
    return result;
  }, [posts, search, filterCat, sortBy]);

  const openComposer = (post?: HealthPost) => {
    setEditingPost(post);
    setView("composer");
  };

  const handleSave = (
    data: Omit<HealthPost, "id" | "views" | "date">,
    status: HealthPostStatus,
  ) => {
    if (editingPost) {
      setPosts((prev) =>
        prev.map((p) => p.id === editingPost.id ? { ...p, ...data, status } : p)
      );
    } else {
      const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const newPost: HealthPost = {
        id: `hp_${Date.now()}`,
        views: 0,
        date: now,
        ...data,
        status,
      };
      setPosts((prev) => [newPost, ...prev]);
    }
    setView("list");
    setEditingPost(undefined);
  };

  const handleDelete = (post: HealthPost) => {
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setDeletingPost(undefined);
    toast.success("Article deleted.");
  };

  if (view === "composer") {
    return (
      <Composer
        initial={editingPost}
        onSave={handleSave}
        onBack={() => { setView("list"); setEditingPost(undefined); }}
      />
    );
  }

  return (
    <>
      {/* Dialogs */}
      {previewPost && (
        <PreviewDialog post={previewPost} onClose={() => setPreviewPost(undefined)} />
      )}
      {deletingPost && (
        <DeleteDialog
          title={deletingPost.title}
          onConfirm={() => handleDelete(deletingPost)}
          onCancel={() => setDeletingPost(undefined)}
        />
      )}

      <div className="min-h-full flex flex-col">
        {/* ── Page header ── */}
        <div className="px-7 pt-7 pb-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-farumasi-100 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-farumasi-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 leading-none">Health Center</h1>
              <p className="text-sm text-slate-400 mt-0.5">Publish medical tips and wellness articles</p>
            </div>
          </div>
          <button
            onClick={() => openComposer()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-farumasi-600 text-white text-sm font-semibold hover:bg-farumasi-700 transition-colors shrink-0"
          >
            <PenLine className="w-4 h-4" />
            Write Article
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div className="px-7 pb-5 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400"
            />
          </div>

          {/* Category filter */}
          <div className="relative">
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value as HealthPostCategory | "All")}
              className="appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-9 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-9 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-farumasi-200 focus:border-farumasi-400"
            >
              <option value="Newest">Newest</option>
              <option value="Most Viewed">Most Viewed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Stats pill */}
          <span className="ml-auto text-xs text-slate-400 font-medium whitespace-nowrap">
            {filtered.length} article{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Grid ── */}
        <div className="flex-1 px-7 pb-10">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">No articles found.</p>
              <p className="text-sm text-slate-300 mt-1">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onEdit={() => openComposer(post)}
                  onDelete={() => setDeletingPost(post)}
                  onView={() => setPreviewPost(post)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
