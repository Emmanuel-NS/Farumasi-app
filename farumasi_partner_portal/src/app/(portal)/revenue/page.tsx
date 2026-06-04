"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, DollarSign, CreditCard, Clock, ArrowDownToLine, Download, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { orderDisplayCode, formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangeFilter, type DateRangeValue, RANGE_LABELS, getDateRangeStart } from "@/components/shared/date-range-filter";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { formatCompactRWF, timeAgo } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import {
  revenueService,
  type BackendRevenueRecord,
  type BackendRevenueSummary,
  type BackendWithdrawal,
} from "@/lib/services/revenue.service";

const PAYOUT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money", label: "MTN Mobile Money" },
  { value: "airtel_money", label: "Airtel Money" },
];

export default function RevenuePage() {
  const [range, setRange] = useState<DateRangeValue>("month");
  const [summary, setSummary] = useState<BackendRevenueSummary | null>(null);
  const [transactions, setTransactions] = useState<BackendRevenueRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<BackendWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState(PAYOUT_METHODS[0].value);
  const [payoutAccount, setPayoutAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, txs, ws] = await Promise.all([
        revenueService.getSummary(),
        revenueService.listTransactions(),
        revenueService.listWithdrawals(),
      ]);
      setSummary(s);
      setTransactions(txs);
      setWithdrawals(ws);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to load revenue"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredTransactions = useMemo(
    () => {
      const start = getDateRangeStart(range).getTime();
      return transactions.filter(t => new Date(t.created_at).getTime() >= start);
    },
    [transactions, range]
  );
  const filteredWithdrawals = useMemo(
    () => {
      const start = getDateRangeStart(range).getTime();
      return withdrawals.filter(w => new Date(w.created_at).getTime() >= start);
    },
    [withdrawals, range]
  );

  const chartData = useMemo(() => {
    const grouped: Record<string, { value: number; commission: number }> = {};
    filteredTransactions.forEach(t => {
      const d = new Date(t.created_at);
      const label = range === "week"
        ? d.toLocaleDateString("en-US", { weekday: "short" })
        : range === "month"
        ? `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`
        : d.toLocaleDateString("en-US", { month: "short" });
      if (!grouped[label]) grouped[label] = { value: 0, commission: 0 };
      grouped[label].value += t.net_amount;
      grouped[label].commission += t.platform_commission;
    });
    return Object.entries(grouped).map(([label, v]) => ({ label, value: v.value, commission: v.commission }));
  }, [filteredTransactions, range]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 1000) {
      toast.error("Minimum withdrawal is RWF 1,000");
      return;
    }
    if (summary && amount > summary.available_balance) {
      toast.error("Amount exceeds available balance");
      return;
    }
    if (!payoutAccount.trim()) {
      toast.error("Enter your payout account");
      return;
    }
    setSubmitting(true);
    try {
      await revenueService.requestWithdrawal({
        amount,
        payout_method: payoutMethod,
        payout_details: { account: payoutAccount.trim() },
      });
      toast.success("Withdrawal requested");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setPayoutAccount("");
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

  const totalRevenue = summary?.total_gross ?? 0;
  const netRevenue = summary?.total_net ?? 0;
  const available = summary?.available_balance ?? 0;
  const pending = summary?.pending_balance ?? 0;
  const totalWithdrawn = summary?.withdrawn_total ?? 0;
  const commissionPaid = summary?.total_commission ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Revenue & Wallet</h1>
          <p className="text-xs text-muted-foreground">Earnings, balances and withdrawals</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={formatCompactRWF(totalRevenue)} icon={TrendingUp} />
        <KpiCard title="Net Earnings" value={formatCompactRWF(netRevenue)} icon={DollarSign} />
        <KpiCard
          title="Available Balance"
          value={formatCompactRWF(available)}
          icon={CreditCard}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <KpiCard
          title="Pending Balance"
          value={formatCompactRWF(pending)}
          icon={Clock}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Summary</CardTitle>
            <CardDescription>Current balances and withdrawal totals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-farumasi-600 p-4 text-white">
              <p className="text-xs opacity-80">Available to Withdraw</p>
              <p className="text-3xl font-bold mt-1">{formatCompactRWF(available)}</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "Pending Clearance", value: pending, color: "text-amber-600" },
                { label: "Total Withdrawn", value: totalWithdrawn, color: "text-slate-700" },
                { label: "Commission Paid", value: commissionPaid, color: "text-slate-500" },
                { label: "Completed Orders", value: summary?.completed_orders ?? 0, color: "text-slate-500", isCount: true },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.color}`}>
                    {item.isCount ? item.value : formatCompactRWF(item.value)}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <Button
              className="w-full gap-1.5 text-sm"
              size="sm"
              onClick={() => setShowWithdrawModal(true)}
              disabled={available <= 0}
            >
              <ArrowDownToLine className="w-4 h-4" /> Request Withdrawal
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Net revenue vs commission — {RANGE_LABELS[range]}</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <DateRangeFilter value={range} onChange={setRange} />
                <Button variant="outline" size="sm" className="text-xs gap-1 shrink-0" onClick={() => toast.info("Export coming soon")}><Download className="w-3.5 h-3.5" /> Export</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={chartData} height={240} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle>Withdrawal Requests</CardTitle>
              <span className="text-[11px] text-muted-foreground">{RANGE_LABELS[range]}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">No withdrawals in this period</TableCell></TableRow>
                ) : filteredWithdrawals.map(w => {
                  const account = (w.payout_details as { account?: string } | null)?.account;
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="font-semibold">{formatCompactRWF(w.amount)}</TableCell>
                      <TableCell>
                        <p className="text-xs font-medium capitalize">{w.payout_method.replace(/_/g, " ")}</p>
                        {account && <p className="text-[11px] text-muted-foreground">{account}</p>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(w.created_at)}</TableCell>
                      <TableCell><StatusBadge status={w.status} type="withdrawal" /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle>Transaction History</CardTitle>
              <span className="text-[11px] text-muted-foreground">{RANGE_LABELS[range]}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Your earnings</TableHead>
                  <TableHead>Date & time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No transactions in this period</TableCell></TableRow>
                ) : filteredTransactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Link href={`/orders/${tx.order_id}`} className="text-xs font-semibold text-farumasi-700 hover:underline">
                        {orderDisplayCode(tx.order_id, tx.order_code)}
                      </Link>
                      {tx.order_status && (
                        <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{tx.order_status.replace(/_/g, " ")}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{formatCompactRWF(tx.gross_amount)}</TableCell>
                    <TableCell className="text-sm text-amber-700">−{formatCompactRWF(tx.platform_commission)}</TableCell>
                    <TableCell className="text-sm font-semibold text-green-600">+{formatCompactRWF(tx.net_amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <p>{formatDateTime(tx.created_at)}</p>
                      <p className="text-[10px]">{timeAgo(tx.created_at)}</p>
                    </TableCell>
                  </TableRow>
                ))}
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
              <button onClick={() => setShowWithdrawModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="rounded-lg bg-farumasi-50 border border-farumasi-200 p-3">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-xl font-bold text-farumasi-700">{formatCompactRWF(available)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (RWF)</Label>
              <Input
                placeholder="e.g. 500000"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                type="number"
                min={1000}
              />
              <p className="text-[11px] text-muted-foreground">Minimum: RWF 1,000</p>
            </div>
            <div className="space-y-1.5">
              <Label>Payout Method</Label>
              <select
                value={payoutMethod}
                onChange={e => setPayoutMethod(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {PAYOUT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Account / Phone Number</Label>
              <Input
                placeholder={payoutMethod === "bank_transfer" ? "Bank account number" : "+250 7XX XXX XXX"}
                value={payoutAccount}
                onChange={e => setPayoutAccount(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowWithdrawModal(false)} disabled={submitting}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={handleWithdraw} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />} Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
