"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp, DollarSign, CreditCard, Clock, ArrowDownToLine,
  Download, X, Loader2, RefreshCw, Wallet, Banknote, Send, ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { orderDisplayCode, formatDateTime, cn, formatRWF, timeAgo, mediaUrl } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangeFilter, type DateRangeValue, RANGE_LABELS } from "@/components/shared/date-range-filter";
import { RevenueChart } from "@/components/charts/revenue-chart";
import {
  revenueService,
  type BackendRevenueRecord,
  type BackendRevenueSummary,
  type BackendWithdrawal,
} from "@/lib/services/revenue.service";
import {
  buildRevenueChartData,
  filterByDateRange,
  MIN_WITHDRAWAL_AMOUNT,
  syncWalletToLayout,
  validateWithdrawAmount,
} from "@/lib/revenue-utils";
import { downloadCsv } from "@/lib/export-csv";
import { payoutMethodLabel } from "@/lib/payout-methods";
import {
  payoutCredentialsService,
  type PayoutCredentials,
} from "@/lib/services/payout-credentials.service";

const MIN_WITHDRAWAL = MIN_WITHDRAWAL_AMOUNT;

const WITHDRAWAL_WORKFLOW = [
  { step: 1, title: "You request", desc: "Amount locked in your wallet" },
  { step: 2, title: "Admin reviews", desc: "FARUMASI checks payout details" },
  { step: 3, title: "Manual payout", desc: "Bank / MoMo / MoMo code" },
  { step: 4, title: "Marked paid", desc: "Balance updates with reference" },
];

function payoutAccountFromDetails(details: BackendWithdrawal["payout_details"]): string | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  for (const key of ["account", "momo_code", "phone", "mobile", "account_number", "msisdn"]) {
    const val = d[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

function payoutAccountNameFromDetails(details: BackendWithdrawal["payout_details"]): string | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  for (const key of ["account_name", "account_holder_name", "holder_name", "name"]) {
    const val = d[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

export default function RevenuePage() {
  const [range, setRange] = useState<DateRangeValue>("month");
  const [summary, setSummary] = useState<BackendRevenueSummary | null>(null);
  const [transactions, setTransactions] = useState<BackendRevenueRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<BackendWithdrawal[]>([]);
  const [payoutProfile, setPayoutProfile] = useState<PayoutCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [s, txs, ws, payout] = await Promise.all([
        revenueService.getSummary(),
        revenueService.listTransactions(),
        revenueService.listWithdrawals(),
        payoutCredentialsService.get().catch(() => ({ configured: false } as PayoutCredentials)),
      ]);
      setSummary(s);
      setTransactions(txs);
      setWithdrawals(ws);
      setPayoutProfile(payout);
      syncWalletToLayout(s);
    } catch (err: unknown) {
      const message = getApiError(err, "Failed to load revenue");
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTransactions = useMemo(
    () => filterByDateRange(transactions, range),
    [transactions, range],
  );
  const filteredWithdrawals = useMemo(
    () => filterByDateRange(withdrawals, range),
    [withdrawals, range],
  );

  const chartData = useMemo(
    () => buildRevenueChartData(transactions, range),
    [transactions, range],
  );

  const exportRevenue = () => {
    downloadCsv(
      `revenue-${range}-${new Date().toISOString().slice(0, 10)}`,
      ["Order", "Gross", "Commission", "Net earnings", "Settlement", "Date"],
      filteredTransactions.map(tx => [
        orderDisplayCode(tx.order_id, tx.order_code),
        tx.gross_amount,
        tx.platform_commission,
        tx.net_amount,
        tx.status,
        tx.created_at,
      ]),
    );
    toast.success("Revenue exported");
  };

  const available = summary?.available_balance ?? 0;
  const amountError = useMemo(
    () => (withdrawAmount.trim() ? validateWithdrawAmount(withdrawAmount, available) : null),
    [withdrawAmount, available],
  );
  const showAmountError = amountTouched && !!amountError;

  const handleWithdraw = async () => {
    setAmountTouched(true);
    if (!payoutProfile?.configured) {
      toast.error("Register your payout account in Business Profile first");
      return;
    }
    const validationError = validateWithdrawAmount(withdrawAmount, available);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const amount = Math.floor(Number(withdrawAmount));
    setSubmitting(true);
    try {
      await revenueService.requestWithdrawal({ amount });
      toast.success("Withdrawal requested");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setAmountTouched(false);
      await load();
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to request withdrawal"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading revenue…
      </div>
    );
  }

  if (!summary && loadError) {
    return (
      <EmptyState
        icon={Wallet}
        title="Could not load wallet"
        description={loadError}
        action={
          <Button onClick={() => void load()} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
        }
      />
    );
  }

  const totalRevenue = summary?.total_gross ?? 0;
  const netRevenue = summary?.total_net ?? 0;
  const pending = summary?.pending_balance ?? 0;
  const lockedWithdrawals = summary?.pending_withdrawals ?? 0;
  const totalWithdrawn = summary?.withdrawn_total ?? summary?.withdrawn_amount ?? 0;
  const commissionPaid = summary?.total_commission ?? summary?.platform_commission ?? 0;
  const paidOut = summary?.paid_withdrawals ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Revenue & Wallet</h1>
          <p className="text-xs text-muted-foreground">
            Commission is deducted once from order revenue; net earnings are yours. Withdrawals use that net balance only — no extra fees.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <DateRangeFilter value={range} onChange={setRange} />
        <span className="text-[11px] text-muted-foreground">{RANGE_LABELS[range]}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={formatRWF(totalRevenue)} icon={TrendingUp} />
        <KpiCard title="Net Earnings" value={formatRWF(netRevenue)} icon={DollarSign} />
        <KpiCard
          title="Available Balance"
          value={formatRWF(available)}
          icon={CreditCard}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <KpiCard
          title="Pending Clearance"
          value={formatRWF(pending)}
          icon={Clock}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Summary</CardTitle>
            <CardDescription>Net earnings after commission — your withdrawable balance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-farumasi-600 p-4 text-white">
              <p className="text-xs opacity-80">Available to Withdraw</p>
              <p className="text-3xl font-bold mt-1">{formatRWF(available)}</p>
              {lockedWithdrawals > 0 && (
                <p className="text-[10px] opacity-70 mt-1">
                  {formatRWF(lockedWithdrawals)} locked in pending withdrawals
                </p>
              )}
            </div>
            <div className="space-y-2">
              {[
                { label: "Pending Clearance", value: pending, color: "text-amber-600" },
                { label: "Locked in Withdrawals", value: lockedWithdrawals, color: "text-indigo-600" },
                { label: "Withdrawals requested", value: totalWithdrawn, color: "text-slate-700" },
                { label: "Paid withdrawals", value: paidOut, color: "text-green-700" },
                { label: "Commission Paid", value: commissionPaid, color: "text-slate-500" },
                {
                  label: "Completed Orders",
                  value: summary?.completed_orders ?? 0,
                  color: "text-slate-500",
                  isCount: true,
                },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={cn("text-xs font-semibold", item.color)}>
                    {item.isCount ? item.value : formatRWF(item.value)}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <Button
              className="w-full gap-1.5 text-sm"
              size="sm"
              onClick={() => {
                setShowWithdrawModal(true);
                setAmountTouched(false);
                setWithdrawAmount("");
              }}
              disabled={available < MIN_WITHDRAWAL || !payoutProfile?.configured}
            >
              <ArrowDownToLine className="w-4 h-4" /> Request Withdrawal
            </Button>
            {!payoutProfile?.configured && (
              <p className="text-[10px] text-amber-700 text-center">
                Register payout account in{" "}
                <Link href="/settings" className="font-semibold underline">Business Profile</Link>{" "}
                first.
              </p>
            )}
            {available > 0 && available < MIN_WITHDRAWAL && (
              <p className="text-[10px] text-muted-foreground text-center">
                Minimum withdrawal is {formatRWF(MIN_WITHDRAWAL)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Net earnings vs commission — {RANGE_LABELS[range]}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1 shrink-0"
                onClick={exportRevenue}
                disabled={filteredTransactions.length === 0}
              >
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={chartData} height={240} />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
        <Banknote className="w-4 h-4 shrink-0 mt-0.5 text-farumasi-600" />
        <div className="space-y-1">
          <p className="font-medium text-slate-900">Semi-digital withdrawals</p>
          <p className="text-xs text-muted-foreground">
            Payouts are processed manually by FARUMASI — no payment gateway. The amount you request is paid in full from your net earnings (commission already taken on orders).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {WITHDRAWAL_WORKFLOW.map((w) => (
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Requests</CardTitle>
            <CardDescription>{filteredWithdrawals.length} in {RANGE_LABELS[range].toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payout to</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                      No withdrawals in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWithdrawals.map((w) => {
                    const account = payoutAccountFromDetails(w.payout_details);
                    const accountName = payoutAccountNameFromDetails(w.payout_details);
                    const isPaid = w.status === "paid" || w.status === "completed";
                    const isRejected = w.status === "rejected";
                    const isApproved = w.status === "approved" || w.status === "processing";
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="font-semibold">{formatRWF(w.amount)}</TableCell>
                        <TableCell>
                          <p className="text-xs font-medium capitalize">{w.payout_method.replace(/_/g, " ")}</p>
                          {account && <p className="text-[11px] font-mono text-muted-foreground">{account}</p>}
                          {accountName && (
                            <p className="text-[11px] text-slate-600">{accountName}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <p>{timeAgo(w.created_at)}</p>
                          {w.processed_at && isPaid && (
                            <p className="text-[10px] text-green-600 mt-0.5">Paid {timeAgo(w.processed_at)}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={isPaid ? "paid" : w.status} type="withdrawal" />
                          {isApproved && (
                            <p className="text-[10px] text-indigo-600 mt-1 flex items-center gap-0.5">
                              <Send className="w-3 h-3" /> Awaiting manual payout
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] max-w-[180px]">
                          {isPaid && w.payment_reference && (
                            <p className="font-mono text-green-700">
                              Ref: {w.payment_reference}
                            </p>
                          )}
                          {isPaid && w.payment_proof_url && (
                            <a
                              href={mediaUrl(w.payment_proof_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-farumasi-600 underline inline-flex items-center gap-0.5 mt-0.5"
                            >
                              <ClipboardCheck className="w-3 h-3" /> Payment proof
                            </a>
                          )}
                          {isRejected && w.admin_notes && (
                            <p className="text-red-600 line-clamp-3">{w.admin_notes}</p>
                          )}
                          {w.status === "pending" && (
                            <p className="text-muted-foreground">Under admin review</p>
                          )}
                          {isApproved && !w.admin_notes && (
                            <p className="text-muted-foreground">Approved — payout in progress</p>
                          )}
                          {isApproved && w.admin_notes && (
                            <p className="text-slate-600 line-clamp-2">{w.admin_notes}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>{filteredTransactions.length} settlements in {RANGE_LABELS[range].toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Your earnings</TableHead>
                  <TableHead>Settlement</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                      No completed order earnings in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Link
                          href={`/orders/${tx.order_id}`}
                          className="text-xs font-semibold text-farumasi-700 hover:underline"
                        >
                          {orderDisplayCode(tx.order_id, tx.order_code)}
                        </Link>
                        {tx.order_status && (
                          <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                            {tx.order_status.replace(/_/g, " ")}
                          </p>
                        )}
                        {tx.partner_type === "pharmacy" && (
                          <p className="text-[10px] text-slate-400">Pharmacy</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{formatRWF(tx.gross_amount)}</TableCell>
                      <TableCell className="text-sm text-amber-700">−{formatRWF(tx.platform_commission)}</TableCell>
                      <TableCell className="text-sm font-semibold text-green-600">
                        +{formatRWF(tx.net_amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} type="settlement" />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <p>{formatDateTime(tx.created_at)}</p>
                        <p className="text-[10px]">{timeAgo(tx.created_at)}</p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Request Withdrawal</h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-lg bg-farumasi-50 border border-farumasi-200 p-3">
              <p className="text-xs text-muted-foreground">Available net balance</p>
              <p className="text-xl font-bold text-farumasi-700">{formatRWF(available)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">No commission is deducted again on withdrawal.</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-medium text-slate-700">What happens next</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Your request is sent to FARUMASI for review</li>
                <li>After approval, we pay you via bank or mobile money</li>
                <li>Once paid, your balance updates and a reference appears below</li>
              </ol>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Amount (RWF)</Label>
                <button
                  type="button"
                  className="text-[11px] text-farumasi-600 hover:underline"
                  onClick={() => setWithdrawAmount(String(Math.floor(available)))}
                  disabled={available < MIN_WITHDRAWAL}
                >
                  Withdraw max
                </button>
              </div>
              <Input
                placeholder="e.g. 500000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                onBlur={() => setAmountTouched(true)}
                type="number"
                min={MIN_WITHDRAWAL}
                max={Math.floor(available)}
                step={1}
                aria-invalid={showAmountError}
                className={cn(showAmountError && "border-red-500 focus-visible:ring-red-500")}
              />
              {showAmountError ? (
                <p className="text-[11px] text-red-600 font-medium">{amountError}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Minimum: {formatRWF(MIN_WITHDRAWAL)} · max: {formatRWF(Math.floor(available))} · whole RWF only
                </p>
              )}
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs space-y-1">
              <p className="font-semibold text-emerald-900">Payout to registered account</p>
              {payoutProfile?.configured ? (
                <>
                  <p className="text-emerald-800">{payoutMethodLabel(payoutProfile.payout_method ?? "")}</p>
                  <p className="font-mono text-emerald-900">{payoutProfile.payout_account_masked}</p>
                  <p className="text-emerald-800">{payoutProfile.payout_account_name}</p>
                  <Link href="/settings" className="text-farumasi-700 font-medium hover:underline inline-block mt-1">
                    Change in Business Profile (email verification required)
                  </Link>
                </>
              ) : (
                <p className="text-red-700">
                  No payout account registered.{" "}
                  <Link href="/settings" className="font-semibold underline">Add one in Business Profile</Link>{" "}
                  before withdrawing.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowWithdrawModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-1.5"
                onClick={() => void handleWithdraw()}
                disabled={submitting || !!amountError || !payoutProfile?.configured}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
