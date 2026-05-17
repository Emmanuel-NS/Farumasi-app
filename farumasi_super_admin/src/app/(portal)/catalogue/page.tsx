"use client";

import { useState } from "react";
import { mockProducts } from "@/data/mock";
import { formatRWF, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs, Button } from "@/components/ui";
import { Package, Plus } from "lucide-react";
import { ProductStatus } from "@/types";

const STATUS_FILTERS: (ProductStatus | "All")[] = ["All", "Active", "Inactive", "Pending Approval", "Rejected", "Suspended"];
const CAT_FILTERS = ["All", "Antimalarial", "Antibiotic", "Analgesic", "Antidiabetic", "Cardiovascular", "Supplement"];

export default function CataloguePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "All">("All");
  const [cat, setCat] = useState("All");

  const filtered = mockProducts.filter((p) => {
    const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || (p.genericName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || p.status === status;
    const matchCat = cat === "All" || p.category === cat;
    return matchSearch && matchStatus && matchCat;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Product Catalogue" subtitle={`${mockProducts.length} products registered`} breadcrumb="Marketplace">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Product</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Medicine Catalogue</CardTitle>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-3 flex-wrap">
              <FilterTabs options={STATUS_FILTERS} value={status} onChange={setStatus} />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <FilterTabs options={CAT_FILTERS} value={cat} onChange={setCat} />
              <SearchInput value={search} onChange={setSearch} placeholder="Search products..." className="w-48" />
            </div>
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>Generic Name</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Unit Price</Th>
              <Th>Stock</Th>
              <Th>Requires Rx</Th>
              <Th>Supplier</Th>
              <Th>Updated</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.unit}</p>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-500">{p.genericName ?? "—"}</Td>
                <Td><Badge variant="default">{p.category}</Badge></Td>
                <Td>
                  <Badge variant={p.status === "Active" ? "success" : p.status === "Pending Approval" ? "warning" : p.status === "Rejected" ? "error" : "neutral"}>
                    {p.status}
                  </Badge>
                </Td>
                <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(p.price)}</Td>
                <Td className="text-[12px] font-semibold text-slate-700">{p.stockCount.toLocaleString()}</Td>
                <Td><Badge variant={p.prescriptionRequired ? "info" : "neutral"}>{p.prescriptionRequired ? "Yes" : "No"}</Badge></Td>
                <Td className="text-[12px] text-slate-500">{p.supplierName}</Td>
                <Td className="text-[12px] text-slate-400">{formatDate(p.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
