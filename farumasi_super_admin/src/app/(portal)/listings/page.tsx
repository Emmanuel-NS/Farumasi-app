"use client";

import { useEffect, useState } from "react";
import { formatDate, formatRWF } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput } from "@/components/ui";
import { Store, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface BackendListing {
  id: string;
  product?: { name?: string } | null;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  pharmacy?: { id: string; name: string } | null;
  partner_company?: { id: string; name: string } | null;
  price: number;
  stock_quantity: number;
  availability_status: string;
  status: string;
  created_at: string;
}

export default function ListingsPage() {
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: BackendListing[]; total: number }>("/listings/", { params: { limit: 100, offset: 0 } })
      .then((r) => { setListings(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = listings.filter(
    (l) =>
      search === "" ||
      (l.product?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const statusVariant = (s: string) =>
    s === "available" ? "success" : s === "out_of_stock" ? "error" : "warning";

  return (
    <div className="space-y-5">
      <PageHeader title="Marketplace Listings" subtitle={`${total} total listings`} breadcrumb="Marketplace" />

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
              <Th>Owner</Th>
              <Th>Price</Th>
              <Th>Stock</Th>
              <Th>Availability</Th>
              <Th>Status</Th>
              <Th>Listed</Th>
            </tr>
          </Thead>
          <tbody>
            {loading && (
              <Tr>
                <Td colSpan={7} className="text-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-slate-400" />
                  <span className="text-sm text-slate-400">Loading listings…</span>
                </Td>
              </Tr>
            )}
            {!loading && filtered.length === 0 && (
              <Tr><Td colSpan={7} className="text-center py-8 text-sm text-slate-400">No listings found.</Td></Tr>
            )}
            {!loading && filtered.map((l) => (
              <Tr key={l.id}>
                <Td>
                  <p className="text-[12px] font-semibold text-slate-900">{l.product?.name ?? "—"}</p>
                </Td>
                <Td className="text-[12px] text-slate-700 max-w-36 truncate">
                  {l.pharmacy?.name ?? l.partner_company?.name ?? "—"}
                </Td>
                <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(l.price)}</Td>
                <Td className="text-[12px] font-semibold text-slate-700">{l.stock_quantity}</Td>
                <Td><Badge variant={statusVariant(l.availability_status) as "success" | "error" | "warning"}>{l.availability_status}</Badge></Td>
                <Td><Badge variant={l.status === "active" ? "success" : "neutral"}>{l.status}</Badge></Td>
                <Td className="text-[12px] text-slate-400">{formatDate(l.created_at)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
