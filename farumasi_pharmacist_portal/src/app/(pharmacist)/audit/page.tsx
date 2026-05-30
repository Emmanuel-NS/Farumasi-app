"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Shield, Search, Download, X, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { auditService, type BackendAuditLog } from "@/lib/services/audit.service";

const ACTION_BADGE = (action: string) => {
  if (action.startsWith("order.")) return "bg-blue-100 text-blue-700";
  if (action.startsWith("prescription.")) return "bg-amber-100 text-amber-700";
  if (action.startsWith("listing.") || action.startsWith("product.")) return "bg-purple-100 text-purple-700";
  if (action.startsWith("article.")) return "bg-rose-100 text-rose-700";
  if (action.startsWith("auth.") || action.includes("login")) return "bg-slate-100 text-slate-700";
  return "bg-emerald-100 text-emerald-700";
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AuditPage() {
  const [logs, setLogs]         = useState<BackendAuditLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<string>("all");
  const [detail, setDetail]     = useState<BackendAuditLog | null>(null);

  const load = () => {
    setLoading(true);
    auditService
      .list({ limit: 100 })
      .then((r) => setLogs(r.items))
      .catch(() => toast.error("Failed to load audit logs"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const knownActions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const filtered = logs
    .filter((l) => filter === "all" || l.action === filter)
    .filter((l) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.action.toLowerCase().includes(q) ||
        (l.entity_id ?? "").toLowerCase().includes(q) ||
        (l.entity_type ?? "").toLowerCase().includes(q)
      );
    });

  const handleExport = () => {
    const csv = [
      "ID,Action,Entity Type,Entity ID,Created At,IP",
      ...filtered.map((l) =>
        [l.id, l.action, l.entity_type ?? "", l.entity_id ?? "", l.created_at, l.ip_address ?? ""]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit logs exported");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-farumasi-600" /> Audit Logs
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Your actions on this pharmacy</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-farumasi-200 text-farumasi-700 hover:bg-farumasi-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by action, entity type or id…"
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-200 bg-white"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border",
            filter === "all"
              ? "bg-farumasi-600 text-white border-farumasi-600"
              : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
          )}
        >
          All
        </button>
        {knownActions.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border",
              filter === a
                ? "bg-farumasi-600 text-white border-farumasi-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
            )}
          >
            {a}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No audit entries yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
          {filtered.map((l) => (
            <button
              key={l.id}
              onClick={() => setDetail(l)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
            >
              <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-semibold", ACTION_BADGE(l.action))}>
                {l.action}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">
                  {l.entity_type ?? "—"}{l.entity_id ? ` · ${l.entity_id.slice(0, 8)}` : ""}
                </p>
                <p className="text-[11px] text-slate-400">{formatDateTime(l.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-semibold", ACTION_BADGE(detail.action))}>
                  {detail.action}
                </span>
                <p className="text-xs text-slate-400 mt-1">{formatDateTime(detail.created_at)}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <dl className="text-sm space-y-2">
              <Row k="ID" v={detail.id} />
              <Row k="Entity" v={`${detail.entity_type ?? "—"} ${detail.entity_id ?? ""}`} />
              <Row k="IP" v={detail.ip_address ?? "—"} />
              {detail.old_value && (
                <div><dt className="text-xs text-slate-500">Old value</dt>
                  <pre className="text-[11px] bg-slate-50 p-2 rounded-lg overflow-x-auto">{JSON.stringify(detail.old_value, null, 2)}</pre>
                </div>
              )}
              {detail.new_value && (
                <div><dt className="text-xs text-slate-500">New value</dt>
                  <pre className="text-[11px] bg-slate-50 p-2 rounded-lg overflow-x-auto">{JSON.stringify(detail.new_value, null, 2)}</pre>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-xs text-slate-500 w-16 shrink-0">{k}</dt>
      <dd className="text-sm text-slate-800 font-mono break-all">{v}</dd>
    </div>
  );
}
