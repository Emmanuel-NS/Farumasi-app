"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { getApiError } from "@/lib/services/auth.service";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageHeader,
  Badge,
  StatCard,
  SearchInput,
  FilterTabs,
  Button,
  ErrorBanner,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  Modal,
} from "@/components/ui";
import {
  FileText,
  Activity,
  Loader2,
  Shield,
  Download,
  RefreshCw,
  User,
  Globe,
  ArrowUpDown,
  Eye,
} from "lucide-react";
import { auditService, type AuditLog } from "@/lib/services/audit.service";

const ACTION_FILTERS = [
  "All",
  "login",
  "register",
  "create",
  "update",
  "approve",
  "reject",
  "withdrawal",
  "suspend",
] as const;

const ACTION_FILTER_LABELS: Record<(typeof ACTION_FILTERS)[number], string> = {
  All: "All",
  login: "Login",
  register: "Register",
  create: "Create",
  update: "Update",
  approve: "Approve",
  reject: "Reject",
  withdrawal: "Withdrawals",
  suspend: "Suspend",
};

const actionVariant = (a: string): "error" | "success" | "info" | "warning" | "neutral" | "default" => {
  const u = a.toUpperCase();
  if (u.includes("DELETE") || u.includes("REJECT") || u.includes("SUSPEND") || u.includes("RESTRICT")) return "error";
  if (u.includes("CREATE") || u.includes("APPROVE") || u.includes("VERIFY")) return "success";
  if (u.includes("UPDATE")) return "info";
  return "neutral";
};

const actionLabel = (a: string) => a.replace(/_/g, " ");

function formatJson(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<(typeof ACTION_FILTERS)[number]>("All");
  const [entityFilter, setEntityFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"created_at" | "action">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const limit = 50;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    auditService.getEntityTypes().then(setEntityTypes).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    auditService
      .list({
        limit,
        offset,
        sort_by: sortBy,
        sort_dir: sortDir,
        action: actionFilter !== "All" ? actionFilter : undefined,
        entity_type: entityFilter !== "All" ? entityFilter : undefined,
        search: debouncedSearch || undefined,
      })
      .then((r) => {
        setLogs(r.items);
        setTotal(r.total);
      })
      .catch((err) => setError(getApiError(err, "Failed to load audit trail")))
      .finally(() => setLoading(false));
  }, [actionFilter, entityFilter, debouncedSearch, offset, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  const todayCount = logs.filter(
    (a) => new Date(a.created_at).toDateString() === new Date().toDateString(),
  ).length;
  const uniqueActors = new Set(logs.map((a) => a.actor_user_id).filter(Boolean)).size;
  const criticalCount = logs.filter((a) => actionVariant(a.action) === "error").length;

  function toggleSort(column: "created_at" | "action") {
    setOffset(0);
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  }

  function exportCsv() {
    const header = "id,action,entity_type,entity_id,actor_user_id,ip_address,created_at\n";
    const rows = logs
      .map(
        (l) =>
          `"${l.id}","${l.action}","${l.entity_type ?? ""}","${l.entity_id ?? ""}","${l.actor_user_id ?? ""}","${l.ip_address ?? ""}","${l.created_at}"`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farumasi-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const entityOptions = ["All", ...entityTypes];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit & Compliance"
        subtitle="Immutable platform activity trail — who did what, when, and from where"
        breadcrumb="Compliance"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={logs.length === 0}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </PageHeader>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total events" value={total.toLocaleString()} icon={FileText} color="text-farumasi-700" />
        <StatCard label="Unique actors (page)" value={uniqueActors} icon={User} color="text-indigo-700" />
        <StatCard label="Today (loaded)" value={todayCount} icon={Activity} color="text-blue-700" />
        <StatCard label="High-risk actions" value={criticalCount} icon={Shield} color="text-red-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-farumasi-600" />
              <CardTitle>Audit registry</CardTitle>
            </div>
            <SearchInput
              value={search}
              onChange={(v) => {
                setOffset(0);
                setSearch(v);
              }}
              placeholder="Search action, entity type, or ID…"
              className="w-full xl:w-72"
            />
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <FilterTabs
              options={ACTION_FILTERS.map((f) => ACTION_FILTER_LABELS[f])}
              value={ACTION_FILTER_LABELS[actionFilter]}
              onChange={(label) => {
                const entry = Object.entries(ACTION_FILTER_LABELS).find(([, v]) => v === label);
                const key = (entry?.[0] ?? "All") as (typeof ACTION_FILTERS)[number];
                setOffset(0);
                setActionFilter(key);
              }}
            />
            {entityOptions.length > 1 && (
              <FilterTabs
                options={entityOptions}
                value={entityFilter}
                onChange={(v) => {
                  setOffset(0);
                  setEntityFilter(v);
                }}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading audit trail…
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No audit events match your filters.</p>
            </div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>
                    <button
                      type="button"
                      onClick={() => toggleSort("created_at")}
                      className="inline-flex items-center gap-1 hover:text-slate-700"
                    >
                      Time <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </Th>
                  <Th>
                    <button
                      type="button"
                      onClick={() => toggleSort("action")}
                      className="inline-flex items-center gap-1 hover:text-slate-700"
                    >
                      Action <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </Th>
                  <Th>Entity</Th>
                  <Th>Actor</Th>
                  <Th>IP</Th>
                  <Th className="text-right">Details</Th>
                </tr>
              </Thead>
              <tbody>
                {logs.map((log) => (
                  <Tr key={log.id} className="hover:bg-slate-50/80">
                    <Td className="text-[11px] text-slate-500 whitespace-nowrap">
                      <p className="font-medium text-slate-700">{timeAgo(log.created_at)}</p>
                      <p className="text-slate-400" title={formatDateTime(log.created_at)}>
                        {formatDateTime(log.created_at)}
                      </p>
                    </Td>
                    <Td>
                      <Badge variant={actionVariant(log.action)}>{actionLabel(log.action)}</Badge>
                    </Td>
                    <Td className="text-[12px]">
                      {log.entity_type ? (
                        <div>
                          <p className="font-semibold text-slate-800">{log.entity_type}</p>
                          {log.entity_id && (
                            <p className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={log.entity_id}>
                              {log.entity_id.slice(0, 12)}…
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="text-[11px] font-mono text-slate-600">
                      {log.actor_user_id ? `${log.actor_user_id.slice(0, 10)}…` : "System"}
                    </Td>
                    <Td className="text-[11px] text-slate-500">
                      {log.ip_address ? (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {log.ip_address}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}

          {!loading && total > limit && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Showing {offset + 1}–{Math.min(offset + limit, total)} of {total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - limit))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset((o) => o + limit)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-slate-400 text-center">
        Sorted by {sortBy === "created_at" ? "time" : "action"} ({sortDir}) · Records are append-only
      </p>

      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? actionLabel(selectedLog.action) : "Audit event"}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Event ID</p>
                <p className="font-mono text-xs text-slate-700 break-all">{selectedLog.id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Timestamp</p>
                <p className="text-slate-700">{formatDateTime(selectedLog.created_at)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Actor</p>
                <p className="font-mono text-xs text-slate-700">{selectedLog.actor_user_id ?? "System"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">IP address</p>
                <p className="text-slate-700">{selectedLog.ip_address ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Entity type</p>
                <p className="text-slate-700">{selectedLog.entity_type ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Entity ID</p>
                <p className="font-mono text-xs text-slate-700 break-all">{selectedLog.entity_id ?? "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Previous state</p>
                <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto max-h-56">
                  {formatJson(selectedLog.old_value)}
                </pre>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">New state</p>
                <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto max-h-56">
                  {formatJson(selectedLog.new_value)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
