"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  PageHeader,
  Badge,
  Button,
  ErrorBanner,
  Modal,
  Input,
} from "@/components/ui";
import { FileText, Loader2, Mail, Save, Send, Eye } from "lucide-react";
import { getApiError } from "@/lib/services/auth.service";
import {
  contentPagesService,
  type ContentPageAdmin,
  type ContentNotifyResult,
} from "@/lib/services/content-pages.service";
import { usersService } from "@/lib/services/users.service";
import { formatDate } from "@/lib/utils";

const NOTIFY_ROLES = [
  { id: "", label: "All roles" },
  { id: "patient", label: "Patients only" },
  { id: "pharmacist", label: "Pharmacists" },
  { id: "rider", label: "Riders" },
  { id: "partner_company_admin", label: "Partners" },
];

export default function ContentPagesAdmin() {
  const [pages, setPages] = useState<ContentPageAdmin[]>([]);
  const [selected, setSelected] = useState<ContentPageAdmin | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    summary: "",
    body: "",
    contactEmail: "",
    contactPhone: "",
    contactWhatsapp: "",
    faqJson: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyAll, setNotifyAll] = useState(true);
  const [notifyRole, setNotifyRole] = useState("");
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifySending, setNotifySending] = useState(false);
  const [notifyResult, setNotifyResult] = useState<ContentNotifyResult | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const load = useCallback(() => {
    setError(null);
    contentPagesService
      .list()
      .then((list) => {
        setPages(list);
        if (!selected && list.length) selectPage(list[0]!);
      })
      .catch((err) => setError(getApiError(err, "Failed to load content pages")));
  }, [selected]);

  useEffect(() => {
    load();
  }, [load]);

  function selectPage(page: ContentPageAdmin) {
    setSelected(page);
    const meta = (page.contact_meta ?? {}) as Record<string, unknown>;
    const faq = meta.faq as Array<{ q: string; a: string }> | undefined;
    setDraft({
      title: page.title,
      summary: page.summary ?? "",
      body: page.body ?? "",
      contactEmail: String(meta.email ?? ""),
      contactPhone: String(meta.phone ?? ""),
      contactWhatsapp: String(meta.whatsapp ?? ""),
      faqJson: faq?.length ? JSON.stringify(faq, null, 2) : "",
    });
    setNotifySubject(`FARUMASI — updated ${page.title}`);
    setNotifyMessage("");
    setSelectedUserIds([]);
    setNotifyResult(null);
  }

  async function handleSave(publish = false) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      let contact_meta: Record<string, unknown> | undefined;
      if (selected.page_type === "support" || selected.slug === "support") {
        let faq: Array<{ q: string; a: string }> = [];
        if (draft.faqJson.trim()) {
          faq = JSON.parse(draft.faqJson) as Array<{ q: string; a: string }>;
        }
        contact_meta = {
          email: draft.contactEmail.trim() || undefined,
          phone: draft.contactPhone.trim() || undefined,
          whatsapp: draft.contactWhatsapp.trim() || undefined,
          faq,
        };
      }
      const updated = await contentPagesService.update(selected.id, {
        title: draft.title.trim(),
        summary: draft.summary.trim() || undefined,
        body: draft.body,
        contact_meta,
      });
      let result = updated;
      if (publish) {
        result = await contentPagesService.publish(selected.id);
      }
      setPages((prev) => prev.map((p) => (p.id === result.id ? result : p)));
      setSelected(result);
    } catch (err) {
      setError(getApiError(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function searchUsers() {
    const q = userSearch.trim();
    if (!q) return;
    try {
      const res = await usersService.getUsers({
        limit: 100,
        status: "active",
        role: notifyRole || undefined,
      });
      const filtered = res.items.filter(
        (u) =>
          u.email.toLowerCase().includes(q.toLowerCase())
          || u.name.toLowerCase().includes(q.toLowerCase()),
      );
      setUserResults(
        filtered.slice(0, 30).map((u) => ({
          id: u.id,
          label: `${u.name} · ${u.email}`,
        })),
      );
    } catch {
      setUserResults([]);
    }
  }

  async function handleNotify() {
    if (!selected) return;
    setNotifySending(true);
    setError(null);
    try {
      const result = await contentPagesService.notify(selected.id, {
        user_ids: notifyAll ? undefined : selectedUserIds,
        roles: notifyAll && notifyRole ? [notifyRole] : undefined,
        subject: notifySubject.trim() || undefined,
        message: notifyMessage.trim() || undefined,
        send_email: true,
        send_in_app: true,
      });
      setNotifyResult(result);
      setNotifyOpen(false);
    } catch (err) {
      setError(getApiError(err, "Notification failed"));
    } finally {
      setNotifySending(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Content & Legal Pages"
        subtitle="Manage terms, privacy, support contacts, and notify users when policies change"
        breadcrumb="Compliance"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {notifyResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Notified <strong>{notifyResult.recipient_count}</strong> users —{" "}
          {notifyResult.email_sent_count} emails, {notifyResult.in_app_sent_count} in-app alerts.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Pages</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-slate-100 px-2 pb-2">
            {pages.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => selectPage(p)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-colors ${
                    selected?.id === p.id ? "bg-farumasi-50" : "hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{p.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {p.audience} · {p.slug} · v{p.version}
                  </p>
                  <Badge variant={p.status === "published" ? "success" : "warning"} className="mt-1">
                    {p.status}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {selected && (
          <Card className="lg:col-span-8">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-farumasi-600" />
                  <CardTitle>{selected.title}</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => void handleSave(false)} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save draft
                  </Button>
                  <Button size="sm" onClick={() => void handleSave(true)} disabled={saving}>
                    <Eye className="w-4 h-4" /> Save &amp; publish
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setNotifyOpen(true)}
                    disabled={selected.status !== "published"}
                  >
                    <Mail className="w-4 h-4" /> Notify users
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Last updated {selected.updated_at ? formatDate(selected.updated_at) : "—"}
                {selected.updated_by_name ? ` by ${selected.updated_by_name}` : ""}
              </p>
            </CardHeader>

            <div className="px-5 pb-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Title</label>
                <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Summary</label>
                <Input value={draft.summary} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Body (HTML supported)</label>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  rows={14}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-farumasi-500"
                />
              </div>

              {selected.page_type === "support" && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Support contacts</p>
                  <Input
                    placeholder="Email"
                    value={draft.contactEmail}
                    onChange={(e) => setDraft((d) => ({ ...d, contactEmail: e.target.value }))}
                  />
                  <Input
                    placeholder="Phone"
                    value={draft.contactPhone}
                    onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))}
                  />
                  <Input
                    placeholder="WhatsApp URL"
                    value={draft.contactWhatsapp}
                    onChange={(e) => setDraft((d) => ({ ...d, contactWhatsapp: e.target.value }))}
                  />
                  <div>
                    <label className="text-xs text-slate-500">FAQ (JSON array of q/a)</label>
                    <textarea
                      value={draft.faqJson}
                      onChange={(e) => setDraft((d) => ({ ...d, faqJson: e.target.value }))}
                      rows={6}
                      className="w-full border rounded-lg px-3 py-2 text-xs font-mono mt-1"
                      placeholder='[{"q":"Question?","a":"Answer."}]'
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <Modal open={notifyOpen} onClose={() => setNotifyOpen(false)} title="Notify users about this update" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Send email and in-app notifications about <strong>{selected?.title}</strong>.
            By default, all <strong>active</strong> users receive the update.
          </p>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={notifyAll}
              onChange={() => setNotifyAll(true)}
            />
            All active users
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={!notifyAll}
              onChange={() => setNotifyAll(false)}
            />
            Selected users only
          </label>

          {notifyAll && (
            <div>
              <label className="text-xs font-semibold text-slate-500">Limit to role (optional)</label>
              <select
                value={notifyRole}
                onChange={(e) => setNotifyRole(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              >
                {NOTIFY_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {!notifyAll && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name or email"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={() => void searchUsers()}>
                  Search
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                {userResults.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.id)}
                      onChange={(e) => {
                        setSelectedUserIds((prev) =>
                          e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id),
                        );
                      }}
                    />
                    {u.label}
                  </label>
                ))}
                {userResults.length === 0 && (
                  <p className="text-xs text-slate-400 p-3">Search for users to add recipients.</p>
                )}
              </div>
              {selectedUserIds.length > 0 && (
                <p className="text-xs text-slate-500">{selectedUserIds.length} user(s) selected</p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500">Email subject</label>
            <Input value={notifySubject} onChange={(e) => setNotifySubject(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Custom note (optional)</label>
            <textarea
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Brief explanation of what changed…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNotifyOpen(false)}>Cancel</Button>
            <Button
              onClick={() => void handleNotify()}
              disabled={notifySending || (!notifyAll && selectedUserIds.length === 0)}
            >
              {notifySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send notifications
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
