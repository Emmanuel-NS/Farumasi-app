"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, Button } from "@/components/ui";
import { Navigation, Plus, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface BackendUser {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  status: string;
  created_at: string;
}

export default function RidersPage() {
  const [riders, setRiders] = useState<BackendUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: BackendUser[]; total: number }>("/users/", { params: { role: "rider", limit: 100, offset: 0 } })
      .then((r) => { setRiders(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = riders.filter(
    (r) =>
      search === "" ||
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Riders" subtitle={`${total} registered riders`} breadcrumb="Platform Management">
        <Link href="/users/riders">
          <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Rider</Button>
        </Link>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Rider Management</CardTitle>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search riders..." className="w-48" />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Rider</Th>
              <Th>Phone</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
            </tr>
          </Thead>
          <tbody>
            {loading && (
              <Tr>
                <Td colSpan={4} className="text-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-slate-400" />
                  <span className="text-sm text-slate-400">Loading riders…</span>
                </Td>
              </Tr>
            )}
            {!loading && filtered.length === 0 && (
              <Tr><Td colSpan={4} className="text-center py-8 text-sm text-slate-400">No riders found.</Td></Tr>
            )}
            {!loading && filtered.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-teal-700">{r.full_name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{r.full_name}</p>
                      <p className="text-[10px] text-slate-400">{r.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-500">{r.phone_number ?? "—"}</Td>
                <Td>
                  <Badge variant={r.status === "active" ? "success" : r.status === "suspended" ? "error" : "neutral"}>{r.status}</Badge>
                </Td>
                <Td className="text-[12px] text-slate-400">{formatDate(r.created_at)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
