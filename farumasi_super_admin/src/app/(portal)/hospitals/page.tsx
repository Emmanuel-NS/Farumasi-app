"use client";

import { useState } from "react";
import { mockHospitals } from "@/data/mock";
import { formatDate, verificationStatusColor, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs, Button, ProgressBar } from "@/components/ui";
import { VerificationStatus } from "@/types";
import { Building2, Plus } from "lucide-react";

const STATUS_FILTERS: (VerificationStatus | "All")[] = ["All", "Approved", "Pending", "In Review", "Rejected"];

export default function HospitalsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "All">("All");

  const filtered = mockHospitals.filter((h) => {
    const matchSearch = search === "" || h.name.toLowerCase().includes(search.toLowerCase()) || h.district.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Hospitals" subtitle={`${mockHospitals.length} registered hospitals`} breadcrumb="Platform Management">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Hospital</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Hospital Management</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterTabs options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search hospitals..." className="w-48" />
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Hospital</Th>
              <Th>District</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Doctors</Th>
              <Th>Beds</Th>
              <Th>Fulfillment</Th>
              <Th>Joined</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((h) => (
              <Tr key={h.id}>
                <Td>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{h.name}</p>
                    <p className="text-[10px] text-slate-400">{h.adminEmail}</p>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-500">{h.district}</Td>
                <Td><Badge variant="default">{h.type}</Badge></Td>
                <Td>
                  <Badge variant={h.status === "Approved" ? "success" : h.status === "Pending" ? "warning" : h.status === "In Review" ? "info" : "error"}>
                    {h.status}
                  </Badge>
                </Td>
                <Td className="text-[12px] text-slate-700 font-semibold">{h.totalDoctors}</Td>
                <Td className="text-[12px] text-slate-700">{h.totalBeds}</Td>
                <Td>
                  <div className="flex items-center gap-2 w-24">
                    <ProgressBar value={h.fulfillmentRate} color={h.fulfillmentRate >= 80 ? "bg-emerald-500" : "bg-amber-500"} />
                    <span className="text-[10px] font-semibold text-slate-600">{h.fulfillmentRate}%</span>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-400">{formatDate(h.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
