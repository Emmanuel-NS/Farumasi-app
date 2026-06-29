"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatRWF, formatDate, mediaUrl } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  PageHeader,
  Badge,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  FilterTabs,
  StatCard,
  Button,
  ErrorBanner,
  EmptyState,
  Modal,
  Input,
} from "@/components/ui";
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Smartphone,
  Settings2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { getApiError } from "@/lib/services/auth.service";
import {
  manualPaymentsService,
  type ManualPaymentTxn,
  type PaymentPlatformConfig,
} from "@/lib/services/manual-payments.service";
import { useAuthStore } from "@/store/auth-store";

const STATUS_FILTERS = ["All", "awaiting_review", "successful", "rejected"] as const;

export default function ManualPaymentsPage() {
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "super_admin");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("awaiting_review");
  const [items, setItems] = useState<ManualPaymentTxn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<ManualPaymentTxn | null>(null);
  const [rejectModal, setRejectModal] = useState<ManualPaymentTxn | null>(null);
  const [momoTxnId, setMomoTxnId] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [payConfig, setPayConfig] = useState<PaymentPlatformConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [configDraft, setConfigDraft] = useState({
    pay_code: "",
    merchant_name: "",
    instructions: "",
  });

  const load = useCallback(() => {
    setError(null);
    const filter = status === "All" ? undefined : status;
    manualPaymentsService.list(filter).then(setItems).catch((err) => {
      setError(getApiError(err, "Failed to load manual payments"));
    });
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    manualPaymentsService
      .getPaymentConfig()
      .then((cfg) => {
        setPayConfig(cfg);
        setConfigDraft({
          pay_code: cfg.manual_momo_pay_code ?? "",
          merchant_name: cfg.manual_momo_merchant_name ?? "",
          instructions: cfg.manual_momo_instructions ?? "",
        });
      })
      .catch(() => {});
  }, [isSuperAdmin]);

  const pending = items.filter((t) => t.status === "awaiting_review");
  const filtered = status === "All" ? items : items.filter((t) => t.status === status);

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!approveModal || !momoTxnId.trim()) return;
    setActionId(approveModal.id);
    try {
      await manualPaymentsService.approve(
        approveModal.id,
        momoTxnId.trim(),
        approveNote.trim() || undefined,
      );
      setApproveModal(null);
      setMomoTxnId("");
      setApproveNote("");
      load();
    } catch (err) {
      setError(getApiError(err, "Approve failed"));
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectModal || !rejectNote.trim()) return;
    setActionId(rejectModal.id);
    try {
      await manualPaymentsService.reject(rejectModal.id, rejectNote.trim());
      setRejectModal(null);
      setRejectNote("");
      load();
    } catch (err) {
      setError(getApiError(err, "Reject failed"));
    } finally {
      setActionId(null);
    }
  }

  async function saveConfig() {
    setConfigSaving(true);
    setError(null);
    try {
      const updated = await manualPaymentsService.updatePaymentConfig({
        manual_momo_pay_code: configDraft.pay_code.trim(),
        manual_momo_merchant_name: configDraft.merchant_name.trim() || "FARUMASI",
        manual_momo_instructions: configDraft.instructions.trim(),
      });
      setPayConfig(updated);
    } catch (err) {
      setError(getApiError(err, "Could not save MoMo settings"));
    } finally {
      setConfigSaving(false);
    }
  }

  const dialPreview = payConfig?.manual_momo_dial_template?.replace(
    "{code}",
    configDraft.pay_code.trim() || "CODE",
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manual MoMo Payments"
        subtitle="Review patient payment proofs and confirm with MoMo transaction IDs"
        breadcrumb="Finance"
      >
        <Link href="/finance">
          <Button variant="outline" size="sm">← Finance Hub</Button>
        </Link>
      </PageHeader>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-farumasi-600" />
              <CardTitle>MoMo merchant code</CardTitle>
            </div>
          </CardHeader>
          <div className="px-5 pb-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">Merchant name</label>
                <Input
                  value={configDraft.merchant_name}
                  onChange={(e) => setConfigDraft((d) => ({ ...d, merchant_name: e.target.value }))}
                  placeholder="Plessing"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Pay code</label>
                <Input
                  value={configDraft.pay_code}
                  onChange={(e) => setConfigDraft((d) => ({ ...d, pay_code: e.target.value }))}
                  placeholder="e.g. PLESSING"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Patient instructions</label>
              <textarea
                value={configDraft.instructions}
                onChange={(e) => setConfigDraft((d) => ({ ...d, instructions: e.target.value }))}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-farumasi-500"
              />
            </div>
            {dialPreview && (
              <p className="text-xs text-slate-500">
                Dial preview: <code className="font-mono font-bold text-slate-800">{dialPreview}</code>
              </p>
            )}
            <Button onClick={() => void saveConfig()} disabled={configSaving}>
              {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save MoMo settings"}
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="warning">{pending.length} awaiting review</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Awaiting review" value={pending.length} icon={Smartphone} color="text-amber-700" />
        <StatCard
          label="Awaiting amount"
          value={formatRWF(pending.reduce((a, t) => a + t.amount, 0))}
          icon={Banknote}
          color="text-farumasi-700"
        />
        <StatCard
          label="Approved"
          value={items.filter((t) => t.status === "successful").length}
          icon={CheckCircle2}
          color="text-emerald-700"
        />
        <StatCard
          label="Rejected"
          value={items.filter((t) => t.status === "rejected").length}
          icon={XCircle}
          color="text-red-700"
        />
      </div>

      <FilterTabs
        options={[...STATUS_FILTERS]}
        value={status}
        onChange={(v) => setStatus(v as (typeof STATUS_FILTERS)[number])}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="No manual payments"
          description="Patient MoMo proof submissions will appear here."
        />
      ) : (
        <Card>
          <Table>
            <Thead>
              <Tr>
                <Th>Order</Th>
                <Th>Patient</Th>
                <Th>Amount</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th>Proof</Th>
                <Th />
              </Tr>
            </Thead>
            <tbody>
              {filtered.map((txn) => (
                <Tr key={txn.id}>
                  <Td>
                    <p className="font-semibold text-sm">{txn.order_code ?? txn.order_id.slice(0, 8)}</p>
                    <p className="text-[10px] text-slate-400">{txn.method}</p>
                  </Td>
                  <Td>
                    <p className="text-sm">{txn.patient_name ?? "—"}</p>
                    <p className="text-[10px] text-slate-400">{txn.patient_email}</p>
                    {txn.phone && <p className="text-[10px] text-slate-500">{txn.phone}</p>}
                  </Td>
                  <Td className="font-semibold">{formatRWF(txn.amount)}</Td>
                  <Td className="text-xs text-slate-500">
                    {txn.submitted_at ? formatDate(txn.submitted_at) : "—"}
                  </Td>
                  <Td>
                    <Badge
                      variant={
                        txn.status === "successful"
                          ? "success"
                          : txn.status === "awaiting_review"
                            ? "warning"
                            : txn.status === "rejected"
                              ? "neutral"
                              : "neutral"
                      }
                    >
                      {txn.status.replace(/_/g, " ")}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {txn.proof_urls.map((url, i) => (
                        <a
                          key={url}
                          href={mediaUrl(url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-farumasi-600 hover:underline flex items-center gap-0.5"
                        >
                          #{i + 1} <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                    {txn.patient_note && (
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{txn.patient_note}</p>
                    )}
                  </Td>
                  <Td>
                    {txn.status === "awaiting_review" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            setApproveModal(txn);
                            setMomoTxnId("");
                            setApproveNote("");
                          }}
                          disabled={actionId === txn.id}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectModal(txn);
                            setRejectNote("");
                          }}
                          disabled={actionId === txn.id}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {txn.confirmed_momo_transaction_id && (
                      <p className="text-[10px] font-mono text-slate-500 mt-1">
                        Txn: {txn.confirmed_momo_transaction_id}
                      </p>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal
        open={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Approve manual payment"
      >
        {approveModal && (
          <form onSubmit={handleApprove} className="space-y-4">
            <p className="text-sm text-slate-600">
              Order <strong>{approveModal.order_code}</strong> · {formatRWF(approveModal.amount)}
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-500">
                MoMo transaction ID <span className="text-red-500">*</span>
              </label>
              <Input
                value={momoTxnId}
                onChange={(e) => setMomoTxnId(e.target.value)}
                placeholder="From MTN statement"
                required
                minLength={4}
              />
              <p className="text-[10px] text-slate-400 mt-1">Must be unique — cannot be reused.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Note (optional)</label>
              <Input value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setApproveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!momoTxnId.trim() || actionId === approveModal.id}>
                Confirm payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject payment proof">
        {rejectModal && (
          <form onSubmit={handleReject} className="space-y-4">
            <p className="text-sm text-slate-600">
              Patient will be notified and can submit again.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-500">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Amount mismatch, unclear screenshot…"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setRejectModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={!rejectNote.trim() || actionId === rejectModal.id}>
                Reject
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
