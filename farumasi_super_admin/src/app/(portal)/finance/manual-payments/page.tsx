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
  type ManualPaymentOutcome,
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
  const [approveOutcome, setApproveOutcome] = useState<ManualPaymentOutcome>("full");
  const [amountReceived, setAmountReceived] = useState("");
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
    if (approveOutcome === "partial" && !amountReceived.trim()) {
      setError("Enter the amount the patient paid for a partial payment.");
      return;
    }
    setActionId(approveModal.id);
    try {
      await manualPaymentsService.approve(approveModal.id, {
        momo_transaction_id: momoTxnId.trim(),
        review_note: approveNote.trim() || undefined,
        outcome: approveOutcome,
        amount_received:
          approveOutcome === "partial"
            ? Number(amountReceived.replace(/\D/g, "")) || undefined
            : approveOutcome === "delivery_deferred" && amountReceived.trim()
              ? Number(amountReceived.replace(/\D/g, ""))
              : undefined,
      });
      setApproveModal(null);
      setMomoTxnId("");
      setApproveNote("");
      setApproveOutcome("full");
      setAmountReceived("");
      load();
    } catch (err) {
      setError(getApiError(err, "Approve failed"));
    } finally {
      setActionId(null);
    }
  }

  function openApproveModal(txn: ManualPaymentTxn) {
    const ctx = txn.order_context;
    const balance = ctx?.balance_due ?? txn.expected_order_amount ?? txn.amount;
    setApproveModal(txn);
    setMomoTxnId("");
    setApproveNote("");
    setApproveOutcome("full");
    setAmountReceived(String(Math.round(balance)));
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
                  <Td className="font-semibold">
                    {formatRWF(txn.order_context?.balance_due ?? txn.expected_order_amount ?? txn.amount)}
                    {txn.order_context && (
                      <p className="text-[10px] font-normal text-slate-400 mt-0.5">
                        paid {formatRWF(txn.order_context.amount_paid_order)} /{" "}
                        {formatRWF(txn.order_context.total_amount)}
                      </p>
                    )}
                  </Td>
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
                          onClick={() => openApproveModal(txn)}
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
        {approveModal && (() => {
          const ctx = approveModal.order_context;
          const balanceDue = ctx?.balance_due ?? approveModal.expected_order_amount ?? approveModal.amount;
          const procFee = ctx?.processing_fee_on_balance ?? 0;
          return (
          <form onSubmit={handleApprove} className="space-y-4">
            <p className="text-sm text-slate-600">
              Order <strong>{approveModal.order_code}</strong> · Patient claimed{" "}
              {formatRWF(approveModal.amount)} (incl. fee)
            </p>

            {ctx && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Medicines (subtotal)</span>
                  <span className="font-semibold">{formatRWF(ctx.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery fee</span>
                  <span className="font-semibold">
                    {formatRWF(ctx.delivery_fee)}
                    {ctx.defer_delivery_fee && (
                      <span className="text-violet-600 font-normal ml-1">· patient chose pay on arrival</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-600 font-medium">Expected due now</span>
                  <span className="font-bold text-slate-900">{formatRWF(balanceDue)}</span>
                </div>
                {ctx.amount_paid_order > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Already paid on order</span>
                    <span className="font-semibold">{formatRWF(ctx.amount_paid_order)}</span>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 pt-1">
                  Processing fee on balance: ~{formatRWF(procFee)} (not part of order value)
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Payment outcome</p>
              <div className="space-y-2">
                {([
                  ["full", "Full payment", "Patient paid the full amount due now"],
                  ["partial", "Partial payment", "Patient paid less — remaining balance stays on the order"],
                  ["delivery_deferred", "Delivery fee on arrival", "Confirm medicines paid; collect delivery fee at delivery"],
                ] as const).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer ${
                      approveOutcome === value
                        ? "border-farumasi-500 bg-farumasi-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value={value}
                      checked={approveOutcome === value}
                      onChange={() => {
                        setApproveOutcome(value);
                        if (value === "full") setAmountReceived(String(Math.round(balanceDue)));
                        else if (value === "delivery_deferred" && ctx) {
                          const medsDue = Math.max(0, ctx.subtotal - ctx.amount_paid_order);
                          setAmountReceived(String(Math.round(medsDue)));
                        }
                      }}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="text-sm font-semibold text-slate-800">{label}</span>
                      <span className="block text-[11px] text-slate-500">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {(approveOutcome === "partial" || approveOutcome === "delivery_deferred") && (
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Amount received (order value, RWF) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={balanceDue}
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={String(Math.round(balanceDue))}
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Remaining after approval:{" "}
                  {formatRWF(Math.max(0, balanceDue - (Number(amountReceived) || 0)))}
                </p>
              </div>
            )}

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
          );
        })()}
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
