"use client";

import { useState } from "react";
import { mockPharmacists } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, Button } from "@/components/ui";
import { UserCheck, Plus } from "lucide-react";

export default function PharmacistsPage() {
  const [search, setSearch] = useState("");

  const filtered = mockPharmacists.filter((p) =>
    search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || (p.pharmacyName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Pharmacists" subtitle={`${mockPharmacists.length} registered pharmacists`} breadcrumb="Platform Management">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Pharmacist</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Pharmacist Management</CardTitle>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search pharmacists..." className="w-56" />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Pharmacist</Th>
              <Th>Pharmacy</Th>
              <Th>License No.</Th>
              <Th>Verified</Th>
              <Th>Status</Th>
              <Th>Orders Filled</Th>
              <Th>Joined</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-purple-700">{p.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-600">{p.pharmacyName ?? "—"}</Td>
                <Td className="text-[11px] text-slate-400 font-mono">{p.licenseNumber}</Td>
                <Td><Badge variant={p.verifiedAt ? "success" : "warning"}>{p.verifiedAt ? "Verified" : "Pending"}</Badge></Td>
                <Td><Badge variant={p.status === "Active" ? "success" : "neutral"}>{p.status}</Badge></Td>
                <Td className="text-[12px] font-semibold text-slate-700">{p.lastActive}</Td>
                <Td className="text-[12px] text-slate-400">{formatDate(p.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
