"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { ArrowDownToLine, CheckCircle2, XCircle, Banknote, Send, ClipboardCheck, Upload, Loader2 } from "lucide-react";
import { getApiError } from "@/lib/services/auth.service";
import { WithdrawalStatus, WithdrawalRequest } from "@/types";
import { withdrawalsService } from "@/lib/services/withdrawals.service";
import api from "@/lib/api";

const STATUS_FILTERS: (WithdrawalStatus | "All")[] = [
  "All",
  "Pending",
  "Approved",
  "Paid",
  "Rejected",
];

const WORKFLOW = [
  { step: 1, title: "Partner requests", desc: "Funds locked in wallet" },
  { step: 2, title: "You approve", desc: "Review payout details" },
  { step: 3, title: "Pay offline", desc: "Bank / MoMo / MoMo code" },
  { step: 4, title: "Mark paid", desc: "Record reference + proof" },
];

export default function FinanceWithdrawalsPage() {
  const [status, setStatus] = useState<WithdrawalStatus | "All">("All");
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<WithdrawalRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<WithdrawalRequest | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofMode, setProofMode] = useState<"upload" | "url">("upload");
  const [proofUploading, setProofUploading] = useState(false);
  const [proofFileName, setProofFileName] = useState("");
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [payNotes, setPayNotes] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");

  const load = useCallback(() => {
    setError(null);
    withdrawalsService.getWithdrawals().then(setAllWithdrawals).catch((err) => {
      setError(getApiError(err, "Failed to load withdrawals"));
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = allWithdrawals.filter((w) => w.status === "Pending");
  const approved = allWithdrawals.filter((w) => w.status === "Approved");
  const filtered = status === "All" ? allWithdrawals : allWithdrawals.filter((w) => w.status === status);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await withdrawalsService.approve(id);
      load();
    } catch (err) {
      setError(getApiError(err, "Approve failed"));
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectModal) return;
    setActionId(rejectModal.id);
    try {
      await withdrawalsService.reject(rejectModal.id, rejectNotes.trim() || undefined);
      setRejectModal(null);
      setRejectNotes("");
      load();
    } catch (err) {
      setError(getApiError(err, "Reject failed"));
    } finally {
      setActionId(null);
    }
  }

  async function handleProofUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setError("Proof file must be 10 MB or smaller");
      return;
    }
    setProofUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ url: string }>("/uploads/payment-proof", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProofUrl(data.url);
      setProofFileName(file.name);
    } catch (err) {
      setError(getApiError(err, "Proof upload failed"));
    } finally {
      setProofUploading(false);
    }
  }

  function resetPayModalFields() {
    setPaymentRef("");
    setProofUrl("");
    setProofMode("upload");
    setProofFileName("");
    setPayNotes("");
  }

  async function handleMarkPaid(e: React.FormEvent) {
    e.preventDefault();
    if (!payModal) return;
    setActionId(payModal.id);
    try {
      await withdrawalsService.markPaid(payModal.id, {
        payment_reference: paymentRef.trim() || undefined,
        payment_proof_url: proofUrl.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      setPayModal(null);
      resetPayModalFields();
      load();
    } catch (err) {
      setError(getApiError(err, "Failed to record manual payment"));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Withdrawals"
        subtitle="Semi-digital payouts — no payment gateway; approve, pay manually, then mark paid"
        breadcrumb="Finance"
      >
        <Badge variant="warning">{pending.length} pending review</Badge>
      </PageHeader>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-900">
        <Banknote className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Partners request withdrawals from their wallet. You pay them outside FARUMASI (mobile money or bank),
          then record the transaction reference here. Their balance updates only after you mark the request paid.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {WORKFLOW.map((w) => (
          <div key={w.step} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-farumasi-100 text-farumasi-700 text-xs font-bold flex items-center justify-center">
                {w.step}
              </span>
              <p className="text-xs font-semibold text-slate-900">{w.title}</p>
            </div>
            <p className="text-[11px] text-slate-500 pl-8">{w.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending review" value={pending.length} icon={ArrowDownToLine} color="text-amber-700" />
        <StatCard
          label="Pending amount"
          value={formatRWF(pending.reduce((a, w) => a + w.amount, 0))}
          icon={ArrowDownToLine}
          color="text-amber-700"
        />
        <StatCard label="Awaiting manual pay" value={approved.length} icon={Send} color="text-blue-700" />
        <StatCard
          label="Paid"
          value={allWithdrawals.filter((w) => w.status === "Paid").length}
          icon={CheckCircle2}
          color="text-emerald-700"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Payout queue</CardTitle>
          </div>
          <FilterTabs options={STATUS_FILTERS} value={status} onChange={setStatus} />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Seller</Th>
              <Th>Requester</Th>
              <Th>Payout to</Th>
              <Th>Method</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Submitted</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <Tr>
                <Td colSpan={8}>
                  <EmptyState
                    icon={ArrowDownToLine}
                    title="No withdrawal requests"
                    description="Payout requests from pharmacies and partners appear here."
                  />
                </Td>
              </Tr>
            ) : (
              filtered.map((w) => (
                <Tr key={w.id}>
                  <Td>
                    <p className="text-[12px] font-semibold text-slate-900">{w.entityName}</p>
                    <p className="text-[10px] text-slate-400">{w.entityType}</p>
                  </Td>
                  <Td>
                    <p className="text-[11px] text-slate-700">{w.requesterName ?? "—"}</p>
                    {w.requesterEmail && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{w.requesterEmail}</p>
                    )}
                  </Td>
                  <Td>
                    <p className="text-[12px] font-mono font-medium text-slate-800">
                      {w.payoutAccount ?? "—"}
                    </p>
                    {w.payoutAccountName && (
                      <p className="text-[10px] text-slate-500">{w.payoutAccountName}</p>
                    )}
                  </Td>
                  <Td>
                    <Badge variant="default">{w.method}</Badge>
                  </Td>
                  <Td className="text-[12px] font-semibold text-farumasi-700 tabular-nums">
                    {formatRWF(w.amount)}
                  </Td>
                  <Td>
                    <Badge
                      variant={
                        w.status === "Paid"
                          ? "success"
                          : w.status === "Pending"
                            ? "warning"
                            : w.status === "Rejected"
                              ? "error"
                              : "info"
                      }
                    >
                      {w.status}
                    </Badge>
                    {w.status === "Paid" && w.paymentReference && (
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{w.paymentReference}</p>
                    )}
                    {w.status === "Rejected" && w.notes && (
                      <p className="text-[10px] text-red-600 mt-0.5 line-clamp-2">{w.notes}</p>
                    )}
                  </Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(w.requestedAt)}</Td>
                  <Td>
                    {w.status === "Pending" && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                          variant="success"
                          size="xs"
                          disabled={actionId === w.id}
                          onClick={() => handleApprove(w.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          disabled={actionId === w.id}
                          onClick={() => {
                            setRejectModal(w);
                            setRejectNotes("");
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                    {w.status === "Approved" && (
                      <Button
                        variant="primary"
                        size="xs"
                        disabled={actionId === w.id}
                        onClick={() => {
                          setPayModal(w);
                          resetPayModalFields();
                        }}
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" /> Record payment
                      </Button>
                    )}
                    {w.status === "Paid" && w.paymentProofUrl && (
                      <a
                        href={mediaUrl(w.paymentProofUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-farumasi-600 underline"
                      >
                        View proof
                      </a>
                    )}
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <Modal open={Boolean(rejectModal)} onClose={() => setRejectModal(null)} title="Reject withdrawal" size="md">
        {rejectModal && (
          <form onSubmit={handleReject} className="space-y-4">
            <p className="text-sm text-slate-600">
              Reject <strong>{formatRWF(rejectModal.amount)}</strong> for{" "}
              <strong>{rejectModal.entityName}</strong>? Funds return to their available balance.
            </p>
            <Input
              label="Reason (shown to partner in notes)"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="e.g. Invalid account number"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRejectModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" loading={actionId === rejectModal.id}>
                Reject request
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(payModal)} onClose={() => setPayModal(null)} title="Record manual payment" size="md">
        {payModal && (
          <form onSubmit={handleMarkPaid} className="space-y-4">
            <div className="rounded-lg bg-slate-50 border p-3 text-sm space-y-1">
              <p>
                Pay <strong className="text-farumasi-700">{formatRWF(payModal.amount)}</strong> to{" "}
                <strong>{payModal.entityName}</strong>
              </p>
              <p className="text-slate-600">
                {payModal.method}: <span className="font-mono font-semibold">{payModal.payoutAccount ?? "—"}</span>
              </p>
              {payModal.payoutAccountName && (
                <p className="text-slate-600">
                  Account name: <strong>{payModal.payoutAccountName}</strong>
                </p>
              )}
            </div>
            <Input
              label="Payment reference (txn ID, receipt no.)"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g. MM-20250603-8842"
            />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">Payment proof</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProofMode("upload")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    proofMode === "upload"
                      ? "bg-farumasi-600 text-white border-farumasi-600"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => setProofMode("url")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    proofMode === "url"
                      ? "bg-farumasi-600 text-white border-farumasi-600"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  Paste URL
                </button>
              </div>
              {proofMode === "upload" ? (
                <div className="space-y-2">
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void handleProofUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={proofUploading}
                    onClick={() => proofInputRef.current?.click()}
                  >
                    {proofUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {proofUploading ? "Uploading…" : "Choose image or PDF"}
                  </Button>
                  {proofFileName && (
                    <p className="text-[11px] text-emerald-700">Uploaded: {proofFileName}</p>
                  )}
                </div>
              ) : (
                <Input
                  label="Proof URL"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://..."
                />
              )}
              {proofMode === "upload" && proofUrl && (
                <a
                  href={mediaUrl(proofUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-farumasi-600 underline inline-block"
                >
                  Preview uploaded proof
                </a>
              )}
            </div>
            <Input label="Internal notes (optional)" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPayModal(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={actionId === payModal.id}>
                Mark paid & update balances
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
