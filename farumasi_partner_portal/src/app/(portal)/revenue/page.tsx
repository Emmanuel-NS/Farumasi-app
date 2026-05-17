"use client";

import { useState } from "react";
import { DollarSign, ArrowDownToLine, Clock, CreditCard, TrendingUp, Download, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DateRangeFilter, type DateRangeValue, RANGE_LABELS, getDateRangeStart } from "@/components/shared/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { mockRevenueStats, mockRevenueChart, mockWithdrawals, mockTransactions } from "@/data/mock";
import { formatRWF, formatCompactRWF, formatDateTime, timeAgo } from "@/lib/utils";
import { toast } from "@/lib/toast";

export default function RevenuePage() {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [range, setRange] = useState<DateRangeValue>("month");

  const rangeStart = getDateRangeStart(range);
  const filteredTransactions = mockTransactions.filter(
    tx => new Date(tx.timestamp) >= rangeStart
  );
  const filteredWithdrawals = mockWithdrawals.filter(
    w => new Date(w.requestedAt) >= rangeStart
  );

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount.replace(/\D/g, ""));
    if (!amount || amount < 1000) {
      toast.error("Minimum withdrawal amount is RWF 1,000");
      return;
    }
    if (amount > mockRevenueStats.availableBalance) {
      toast.error("Amount exceeds available balance");
      return;
    }
    setShowWithdrawModal(false);
    setWithdrawAmount("");
    toast.success(`Withdrawal of ${formatCompactRWF(amount)} submitted — processing in 1–2 business days`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue & Finance"
        description="Track earnings, withdrawals, and transaction history"
        icon={DollarSign}
        actions={
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowWithdrawModal(true)}>
            <ArrowDownToLine className="w-3.5 h-3.5" /> Withdraw Funds
          </Button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={formatCompactRWF(mockRevenueStats.totalRevenue)} icon={TrendingUp} />
        <KpiCard title="This Month" value={formatCompactRWF(mockRevenueStats.monthlyRevenue)} icon={DollarSign} />
        <KpiCard
          title="Available Balance"
          value={formatCompactRWF(mockRevenueStats.availableBalance)}
          icon={CreditCard}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <KpiCard
          title="Pending Balance"
          value={formatCompactRWF(mockRevenueStats.pendingBalance)}
          icon={Clock}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      {/* Balance card + Revenue chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Balance summary */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Summary</CardTitle>
            <CardDescription>Current balances and withdrawal totals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-farumasi-600 p-4 text-white">
              <p className="text-xs opacity-80">Available to Withdraw</p>
              <p className="text-3xl font-bold mt-1">{formatCompactRWF(mockRevenueStats.availableBalance)}</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "Pending Clearance", value: mockRevenueStats.pendingBalance, color: "text-amber-600" },
                { label: "Total Withdrawn", value: mockRevenueStats.totalWithdrawn, color: "text-slate-700" },
                { label: "Commission Paid", value: mockRevenueStats.totalCommissionPaid, color: "text-slate-500" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.color}`}>{formatCompactRWF(item.value)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <Button className="w-full gap-1.5 text-sm" size="sm" onClick={() => setShowWithdrawModal(true)}>
              <ArrowDownToLine className="w-4 h-4" /> Request Withdrawal
            </Button>
          </CardContent>
        </Card>

        {/* Revenue chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Net revenue vs commission — {RANGE_LABELS[range]}</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <DateRangeFilter value={range} onChange={setRange} />
                <Button variant="outline" size="sm" className="text-xs gap-1 shrink-0" onClick={() => toast.info("Revenue report downloaded")}><Download className="w-3.5 h-3.5" /> Export</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={mockRevenueChart} height={240} />
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals + Transactions */}
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
                  <TableHead>Bank</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">No withdrawals in this period</TableCell></TableRow>
                ) : filteredWithdrawals.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-semibold">{formatCompactRWF(w.amount)}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{w.bankName}</p>
                      <p className="text-[11px] text-muted-foreground">{w.accountNumber}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(w.requestedAt)}</TableCell>
                    <TableCell><StatusBadge status={w.status} type="withdrawal" /></TableCell>
                  </TableRow>
                ))}
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
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">No transactions in this period</TableCell></TableRow>
                ) : filteredTransactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs max-w-[180px] truncate">{tx.description}</TableCell>
                    <TableCell>
                      <span className={`text-sm font-semibold ${tx.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                        {tx.amount < 0 ? "−" : "+"}{formatCompactRWF(Math.abs(tx.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] capitalize bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{tx.type}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(tx.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Request Withdrawal</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="rounded-lg bg-farumasi-50 border border-farumasi-200 p-3">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-xl font-bold text-farumasi-700">{formatCompactRWF(mockRevenueStats.availableBalance)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (RWF)</Label>
              <Input
                placeholder="e.g. 500,000"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                type="number"
                min={1000}
              />
              <p className="text-[11px] text-muted-foreground">Minimum: RWF 1,000 · Sent to Bank of Kigali ••0-51</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowWithdrawModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={handleWithdraw}><ArrowDownToLine className="w-4 h-4" /> Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
