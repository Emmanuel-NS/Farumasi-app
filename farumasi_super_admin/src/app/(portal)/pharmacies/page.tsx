"use client";

import { useState, useEffect } from "react";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs, Button } from "@/components/ui";
import { ShoppingBag, Plus } from "lucide-react";
import { pharmaciesService } from "@/lib/services/pharmacies.service";
import type { Pharmacy } from "@/types";

const STATUS_FILTERS = ["All", "Approved", "Pending", "Suspended"];

export default function PharmaciesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [allPharmacies, setAllPharmacies] = useState<Pharmacy[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    pharmaciesService.getPharmacies({ limit: 100 }).then(({ items, total }) => {
      setAllPharmacies(items);
      setTotal(total);
    }).catch(() => {});
  }, []);

  const filtered = allPharmacies.filter((p) => {
    const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.district.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || p.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Pharmacies" subtitle={`${total} registered pharmacies`} breadcrumb="Platform Management">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Pharmacy</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Pharmacy Management</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterTabs options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search pharmacies..." className="w-48" />
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Pharmacy</Th>
              <Th>District</Th>
              <Th>License</Th>
              <Th>Status</Th>
              <Th>Stock Level</Th>
              <Th>Active Products</Th>
              <Th>Rating</Th>
              <Th>Joined</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.adminEmail}</p>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-500">{p.district}</Td>
                <Td>
                  <Badge variant={p.verifiedAt ? "success" : "warning"}>{p.verifiedAt ? "Verified" : "Pending"}</Badge>
                </Td>
                <Td>
                  <Badge variant={p.status === "Approved" ? "success" : p.status === "Rejected" ? "error" : "warning"}>{p.status}</Badge>
                </Td>
                <Td>
                  <Badge variant={p.stockLevel === "Good" ? "success" : p.stockLevel === "Low" ? "warning" : "error"}>{p.stockLevel}</Badge>
                </Td>
                <Td className="text-[12px] font-semibold text-slate-700">{p.totalFulfillments}</Td>
                <Td className="text-[12px] text-slate-400">{p.fulfillmentRate}%</Td>
                <Td className="text-[12px] text-slate-400">{formatDate(p.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
