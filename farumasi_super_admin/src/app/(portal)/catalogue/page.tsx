"use client";

import { useEffect, useState } from "react";
import { formatRWF, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, Button } from "@/components/ui";
import { Package, Plus, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface BackendProduct {
  id: string;
  name: string;
  generic_name?: string | null;
  category?: string | null;
  manufacturer?: string | null;
  approval_status: string;
  prescription_required: boolean;
  price_from?: number | null;
  price_to?: number | null;
  listing_count?: number | null;
  created_at: string;
}

export default function CataloguePage() {
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: BackendProduct[]; total: number }>("/products/", {
        params: { include_unapproved: true, only_with_listings: false, limit: 100, offset: 0 },
      })
      .then((r) => { setProducts(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(
    (p) =>
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.generic_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const statusVariant = (s: string) => {
    if (s === "approved") return "success";
    if (s === "pending") return "warning";
    if (s === "rejected") return "error";
    return "neutral";
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Product Catalogue" subtitle={`${total} products registered`} breadcrumb="Marketplace">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Product</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Medicine Catalogue</CardTitle>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search products..." className="w-48" />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>Generic Name</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Price Range</Th>
              <Th>Listings</Th>
              <Th>Requires Rx</Th>
              <Th>Manufacturer</Th>
              <Th>Added</Th>
            </tr>
          </Thead>
          <tbody>
            {loading && (
              <Tr>
                <Td colSpan={9} className="text-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-slate-400" />
                  <span className="text-sm text-slate-400">Loading products…</span>
                </Td>
              </Tr>
            )}
            {!loading && filtered.length === 0 && (
              <Tr><Td colSpan={9} className="text-center py-8 text-sm text-slate-400">No products found.</Td></Tr>
            )}
            {!loading && filtered.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <p className="text-[12px] font-semibold text-slate-900">{p.name}</p>
                </Td>
                <Td className="text-[12px] text-slate-500">{p.generic_name ?? "—"}</Td>
                <Td><Badge variant="default">{p.category ?? "—"}</Badge></Td>
                <Td>
                  <Badge variant={statusVariant(p.approval_status) as "success" | "warning" | "error" | "neutral"}>
                    {p.approval_status}
                  </Badge>
                </Td>
                <Td className="text-[12px] font-semibold text-farumasi-700">
                  {p.price_from != null ? formatRWF(p.price_from) : "—"}
                  {p.price_to != null && p.price_to !== p.price_from ? ` â€“ ${formatRWF(p.price_to)}` : ""}
                </Td>
                <Td className="text-[12px] font-semibold text-slate-700">{p.listing_count ?? 0}</Td>
                <Td><Badge variant={p.prescription_required ? "info" : "neutral"}>{p.prescription_required ? "Yes" : "No"}</Badge></Td>
                <Td className="text-[12px] text-slate-500">{p.manufacturer ?? "—"}</Td>
                <Td className="text-[12px] text-slate-400">{formatDate(p.created_at)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
