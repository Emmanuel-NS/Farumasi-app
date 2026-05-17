"use client";

import { useState } from "react";
import { mockRiders } from "@/data/mock";
import { formatDate, formatRWF, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs, Button, ProgressBar } from "@/components/ui";
import { Navigation, Plus } from "lucide-react";

const STATUS_FILTERS = ["All", "Active", "Pending Verification", "Suspended"];

export default function RidersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const filtered = mockRiders.filter((r) => {
    const matchSearch = search === "" || r.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || r.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Riders" subtitle={`${mockRiders.length} registered riders`} breadcrumb="Platform Management">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Rider</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Total Riders</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{mockRiders.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Monthly Salary</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{mockRiders.filter(r => r.paymentModel === "Monthly").length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Fixed monthly pay</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Per-Order</p>
          <p className="text-2xl font-bold text-farumasi-700 mt-1">{mockRiders.filter(r => r.paymentModel === "Per Order").length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Paid per delivery</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Active Now</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{mockRiders.filter(r => r.status === "Active").length}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Rider Management</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterTabs options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search riders..." className="w-48" />
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Rider</Th>
              <Th>Status</Th>
              <Th>District</Th>
              <Th>Payment Model</Th>
              <Th>Earnings / Salary</Th>
              <Th>Deliveries</Th>
              <Th>Success Rate</Th>
              <Th>Joined</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-teal-700">{r.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{r.name}</p>
                      <p className="text-[10px] text-slate-400">{r.phone}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <Badge variant={r.status === "Active" ? "success" : r.status === "Suspended" ? "error" : "neutral"}>{r.status}</Badge>
                </Td>
                <Td className="text-[12px] text-slate-500">{r.district}</Td>
                <Td>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    r.paymentModel === "Monthly"
                      ? "bg-blue-50 text-blue-700 border border-blue-100"
                      : "bg-farumasi-50 text-farumasi-700 border border-farumasi-100"
                  )}>
                    {r.paymentModel === "Monthly" ? "📅 Monthly" : "📦 Per Order"}
                  </span>
                </Td>
                <Td className="text-[12px] font-semibold text-slate-700">
                  {r.paymentModel === "Monthly" && r.monthlySalary
                    ? formatRWF(r.monthlySalary) + "/mo"
                    : formatRWF(r.balance)}
                </Td>
                <Td className="text-[12px] font-semibold text-slate-700">{r.totalDeliveries}</Td>
                <Td>
                  <div className="flex items-center gap-2 w-24">
                    <ProgressBar value={r.successRate} color={r.successRate >= 80 ? "bg-emerald-500" : "bg-amber-500"} />
                    <span className="text-[10px] font-semibold">{r.successRate}%</span>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-400">{formatDate(r.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
