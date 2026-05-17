"use client";

import { useState } from "react";
import { mockListings } from "@/data/mock";
import { formatDate, formatRWF } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, Button } from "@/components/ui";
import { Store } from "lucide-react";

export default function ListingsPage() {
  const [search, setSearch] = useState("");

  const filtered = mockListings.filter((l) =>
    search === "" || l.productName.toLowerCase().includes(search.toLowerCase()) || l.pharmacyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Marketplace Listings" subtitle={`${mockListings.length} active listings`} breadcrumb="Marketplace" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Active Listings</CardTitle>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search listings..." className="w-56" />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>Pharmacy</Th>
              <Th>Price</Th>
              <Th>Stock</Th>
              <Th>Status</Th>
              <Th>Views</Th>
              <Th>Orders</Th>
              <Th>Listed</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((l) => (
              <Tr key={l.id}>
                <Td>
                  <p className="text-[12px] font-semibold text-slate-900">{l.productName}</p>
                </Td>
                <Td className="text-[12px] text-slate-600">{l.pharmacyName}</Td>
                <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(l.price)}</Td>
                <Td className="text-[12px] font-semibold text-slate-700">{l.stockQuantity}</Td>
                <Td><Badge variant={l.status === "Active" ? "success" : "neutral"}>{l.status}</Badge></Td>
                <Td className="text-[12px] text-slate-500">{l.views30d.toLocaleString()}</Td>
                <Td className="text-[12px] font-semibold text-slate-700">{l.sales30d}</Td>
                <Td className="text-[12px] text-slate-400">{formatDate(l.lastUpdated)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
