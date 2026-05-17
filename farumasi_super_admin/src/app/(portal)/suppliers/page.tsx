"use client";

import { useState } from "react";
import { mockSuppliers } from "@/data/mock";
import { formatDate, formatRWF } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, Button } from "@/components/ui";
import { Truck, Plus } from "lucide-react";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");

  const filtered = mockSuppliers.filter((s) =>
    search === "" || s.name.toLowerCase().includes(search.toLowerCase()) || s.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Suppliers & Companies" subtitle={`${mockSuppliers.length} registered suppliers`} breadcrumb="Platform Management">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Supplier</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Supplier Management</CardTitle>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers..." className="w-56" />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Company</Th>
              <Th>Contact</Th>
              <Th>District</Th>
              <Th>Registration No.</Th>
              <Th>Verified</Th>
              <Th>Status</Th>
              <Th>Products</Th>
              <Th>Total Revenue</Th>
              <Th>Joined</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.adminEmail}</p>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-600">{s.type}</Td>
                <Td className="text-[12px] text-slate-500">{s.district}</Td>
                <Td className="text-[11px] text-slate-400 font-mono">{s.adminName}</Td>
                <Td><Badge variant={s.verifiedAt ? "success" : "warning"}>{s.verifiedAt ? "Verified" : "Pending"}</Badge></Td>
                <Td><Badge variant={s.status === "Approved" ? "success" : s.status === "Rejected" ? "error" : "warning"}>{s.status}</Badge></Td>
                <Td className="text-[12px] font-semibold text-slate-700">{s.totalProducts}</Td>
                <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(s.totalRevenue)}</Td>
                <Td className="text-[12px] text-slate-400">{formatDate(s.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
