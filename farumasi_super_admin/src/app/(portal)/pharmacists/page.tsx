"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, Button } from "@/components/ui";
import { UserCheck, Plus, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface BackendPharmacist {
  id: string;
  user_id: string;
  pharmacy_id?: string | null;
  license_number?: string | null;
  specialization?: string | null;
  verification_status: string;
  status: string;
  availability_status: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function PharmacistsPage() {
  const [pharmacists, setPharmacists] = useState<BackendPharmacist[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: BackendPharmacist[]; total: number }>("/pharmacists/", { params: { limit: 100, offset: 0 } })
      .then((r) => { setPharmacists(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = pharmacists.filter(
    (p) =>
      search === "" ||
      p.user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Pharmacists" subtitle={`${total} registered pharmacists`} breadcrumb="Platform Management">
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
              <Th>License No.</Th>
              <Th>Specialization</Th>
              <Th>Verified</Th>
              <Th>Status</Th>
              <Th>Availability</Th>
            </tr>
          </Thead>
          <tbody>
            {loading && (
              <Tr>
                <Td colSpan={6} className="text-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-slate-400" />
                  <span className="text-sm text-slate-400">Loading pharmacists…</span>
                </Td>
              </Tr>
            )}
            {!loading && filtered.length === 0 && (
              <Tr><Td colSpan={6} className="text-center py-8 text-sm text-slate-400">No pharmacists found.</Td></Tr>
            )}
            {!loading && filtered.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-purple-700">{p.user.full_name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{p.user.full_name}</p>
                      <p className="text-[10px] text-slate-400">{p.user.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-[11px] text-slate-400 font-mono">{p.license_number ?? "—"}</Td>
                <Td className="text-[12px] text-slate-500">{p.specialization ?? "—"}</Td>
                <Td><Badge variant={p.verification_status === "verified" ? "success" : "warning"}>{p.verification_status}</Badge></Td>
                <Td><Badge variant={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge></Td>
                <Td><Badge variant={p.availability_status === "available" ? "success" : "neutral"}>{p.availability_status}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
