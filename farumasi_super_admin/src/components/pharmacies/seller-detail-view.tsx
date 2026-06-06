"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDate, formatRWF, mediaUrl } from "@/lib/utils";
import { getApiError } from "@/lib/services/auth.service";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageHeader,
  Badge,
  StatCard,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  ErrorBanner,
  Button,
  Modal,
  Input,
} from "@/components/ui";
import { ArrowLeft, Building2, DollarSign, Loader2, Pencil, TrendingUp } from "lucide-react";
import {
  adminManagementService,
  type SellerFinanceSummary,
} from "@/lib/services/admin-management.service";

function normalizeRevenue(rev: SellerFinanceSummary["revenue"]) {
  const raw = rev as SellerFinanceSummary["revenue"] & {
    total_gross?: number;
    total_commission?: number;
    total_net?: number;
  };
  return {
    gross_revenue: raw.gross_revenue ?? raw.total_gross ?? 0,
    platform_commission: raw.platform_commission ?? raw.total_commission ?? 0,
    net_revenue: raw.net_revenue ?? raw.total_net ?? 0,
    available_balance: raw.available_balance ?? 0,
    pending_withdrawals: raw.pending_withdrawals ?? 0,
    paid_withdrawals: raw.paid_withdrawals ?? 0,
    completed_orders: raw.completed_orders ?? 0,
    total_orders: raw.total_orders ?? 0,
  };
}

export default function SellerDetailView({ kind }: { kind: "pharmacy" | "partner" }) {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<SellerFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [proposedRate, setProposedRate] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modifyError, setModifyError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const req =
      kind === "pharmacy"
        ? adminManagementService.getPharmacyFinance(id)
        : adminManagementService.getPartnerFinance(id);
    req
      .then(setData)
      .catch((err) => setError(getApiError(err, "Failed to load partner details")))
      .finally(() => setLoading(false));
  }, [id, kind]);

  useEffect(() => {
    load();
  }, [load]);

  const backHref = "/pharmacies";
  const label = kind === "pharmacy" ? "Pharmacy" : "Healthcare company";

  async function submitChangeRequest(e: React.FormEvent) {
    e.preventDefault();
    const rate = Number(proposedRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setModifyError("Enter a commission rate between 0 and 100");
      return;
    }
    setSubmitting(true);
    setModifyError(null);
    try {
      const payload = {
        field_name: "commission_rate_percent",
        proposed_value: String(rate),
        admin_note: adminNote.trim() || undefined,
      };
      if (kind === "pharmacy") {
        await adminManagementService.proposePharmacyChange(id, payload);
      } else {
        await adminManagementService.proposePartnerChange(id, payload);
      }
      setModifyOpen(false);
      setProposedRate("");
      setAdminNote("");
      load();
    } catch (err) {
      setModifyError(getApiError(err, "Failed to send change request"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={data?.seller_name ?? `${label} profile`}
        subtitle="B2B earnings, commission agreement, and payout history"
        breadcrumb="Platform · Pharmacies & Companies"
      >
        <div className="flex items-center gap-2">
          {data && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setProposedRate(
                  data.commission_rate_percent != null ? String(data.commission_rate_percent) : "",
                );
                setAdminNote("");
                setModifyError(null);
                setModifyOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" /> Modify terms
            </Button>
          )}
          <Link href={backHref}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          </Link>
        </div>
      </PageHeader>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {data?.wallet_scope_note && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {data.wallet_scope_note}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading partner intelligence…
        </div>
      )}

      {!loading && data && (() => {
        const rev = normalizeRevenue(data.revenue);
        const records = data.recent_revenue_records ?? [];
        const pending = data.pending_change_requests ?? [];
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Agreed commission"
                value={data.commission_rate_percent != null ? `${data.commission_rate_percent}%` : "—"}
                icon={TrendingUp}
                color="text-indigo-700"
              />
              <StatCard
                label="Platform commission earned"
                value={formatRWF(rev.platform_commission)}
                icon={DollarSign}
                color="text-farumasi-700"
                sublabel="Our B2B share (owner wallet)"
              />
              <StatCard
                label="Partner net revenue"
                value={formatRWF(rev.net_revenue)}
                icon={Building2}
                color="text-emerald-700"
              />
              <StatCard
                label="Available balance"
                value={formatRWF(rev.available_balance)}
                icon={DollarSign}
                color="text-amber-700"
                sublabel={
                  rev.pending_withdrawals > 0
                    ? `${formatRWF(rev.pending_withdrawals)} locked in payouts`
                    : "Ready to withdraw"
                }
              />
            </div>

            {pending.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending partner confirmation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pending.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-sm"
                    >
                      <p className="font-semibold text-slate-900">{req.field_label}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {req.current_value ?? "—"} → {req.proposed_value}
                        {req.field_name === "commission_rate_percent" ? "%" : ""}
                      </p>
                      {req.admin_note && (
                        <p className="text-[11px] text-slate-500 mt-1">{req.admin_note}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Partner profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Owner</p>
                    <p className="font-semibold text-slate-900">{data.owner?.full_name ?? "—"}</p>
                    <p className="text-slate-500 text-xs">{data.owner?.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Registered</p>
                    <p className="text-slate-700">
                      {data.created_at ? formatDate(data.created_at) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Orders</p>
                    <p className="text-slate-700">
                      {rev.completed_orders} completed / {rev.total_orders} total
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Gross sales</p>
                      <p className="font-semibold">{formatRWF(rev.gross_revenue)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Paid out</p>
                      <p className="font-semibold">{formatRWF(rev.paid_withdrawals)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Earnings settlements</CardTitle>
                </CardHeader>
                <Table>
                  <Thead>
                    <tr>
                      <Th>Order</Th>
                      <Th>Gross</Th>
                      <Th>Commission</Th>
                      <Th>Net</Th>
                      <Th>Status</Th>
                      <Th>Date</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {records.length === 0 ? (
                      <Tr>
                        <Td colSpan={6} className="text-center text-slate-400 py-8">
                          No settled earnings for this {kind === "pharmacy" ? "pharmacy" : "company"} yet
                        </Td>
                      </Tr>
                    ) : (
                      records.map((tx) => (
                        <Tr key={tx.id}>
                          <Td className="text-xs font-mono">
                            {tx.order_code ?? tx.order_id.slice(0, 8)}
                          </Td>
                          <Td>{formatRWF(tx.gross_amount)}</Td>
                          <Td className="text-amber-700">{formatRWF(tx.platform_commission)}</Td>
                          <Td className="text-emerald-700 font-semibold">
                            {formatRWF(tx.net_amount)}
                          </Td>
                          <Td>
                            <Badge
                              variant={
                                tx.status === "available" || tx.status === "settled"
                                  ? "success"
                                  : "neutral"
                              }
                            >
                              {tx.status.replace(/_/g, " ")}
                            </Badge>
                          </Td>
                          <Td className="text-xs text-slate-400">{formatDate(tx.created_at)}</Td>
                        </Tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Withdrawal history</CardTitle>
                <p className="text-[11px] text-slate-500 font-normal mt-1">
                  All payout requests for this owner&apos;s wallet (same as partner portal)
                </p>
              </CardHeader>
              <Table>
                <Thead>
                  <tr>
                    <Th>Amount</Th>
                    <Th>Method</Th>
                    <Th>Status</Th>
                    <Th>Reference</Th>
                    <Th>Requested</Th>
                    <Th>Proof</Th>
                  </tr>
                </Thead>
                <tbody>
                  {data.recent_withdrawals.length === 0 ? (
                    <Tr>
                      <Td colSpan={6} className="text-center text-slate-400 py-8">
                        No withdrawal requests yet
                      </Td>
                    </Tr>
                  ) : (
                    data.recent_withdrawals.map((w) => (
                      <Tr key={w.id}>
                        <Td className="font-semibold text-farumasi-700">{formatRWF(w.amount)}</Td>
                        <Td className="text-xs capitalize">
                          {w.payout_method.replace(/_/g, " ")}
                        </Td>
                        <Td>
                          <Badge
                            variant={
                              w.status === "paid"
                                ? "success"
                                : w.status === "rejected"
                                  ? "error"
                                  : "warning"
                            }
                          >
                            {w.status.replace(/_/g, " ")}
                          </Badge>
                        </Td>
                        <Td className="text-xs font-mono text-slate-500">
                          {w.payment_reference ?? "—"}
                        </Td>
                        <Td className="text-xs text-slate-400">{formatDate(w.created_at)}</Td>
                        <Td className="text-xs">
                          {w.payment_proof_url ? (
                            <a
                              href={mediaUrl(w.payment_proof_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-farumasi-600 underline"
                            >
                              View proof
                            </a>
                          ) : (
                            "—"
                          )}
                        </Td>
                      </Tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card>
          </>
        );
      })()}

      <Modal
        open={modifyOpen}
        onClose={() => setModifyOpen(false)}
        title="Propose commission change"
        size="md"
      >
        <form onSubmit={submitChangeRequest} className="space-y-4">
          <p className="text-sm text-slate-600">
            The partner must confirm this in their portal before the new rate applies. Current rate:{" "}
            <strong>
              {data?.commission_rate_percent != null ? `${data.commission_rate_percent}%` : "not set"}
            </strong>
          </p>
          <Input
            label="Proposed commission rate (%)"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={proposedRate}
            onChange={(e) => setProposedRate(e.target.value)}
            placeholder="e.g. 5"
            required
          />
          <Input
            label="Note to partner (optional)"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Reason for the change"
          />
          {modifyError && <p className="text-sm text-red-600">{modifyError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModifyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Send for partner confirmation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
