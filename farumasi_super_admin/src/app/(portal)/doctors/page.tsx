"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, Button } from "@/components/ui";
import { Stethoscope, Plus, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface BackendUser {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  status: string;
  created_at: string;
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<BackendUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: BackendUser[]; total: number }>("/users/", { params: { role: "doctor", limit: 100, offset: 0 } })
      .then((r) => { setDoctors(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = doctors.filter(
    (d) =>
      search === "" ||
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Doctors" subtitle={`${total} registered doctors`} breadcrumb="Platform Management">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Doctor</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Doctor Management</CardTitle>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search doctors..." className="w-48" />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Doctor</Th>
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
                  <span className="text-sm text-slate-400">Loading doctors…</span>
                </Td>
              </Tr>
            )}
            {!loading && filtered.length === 0 && (
              <Tr><Td colSpan={4} className="text-center py-8 text-sm text-slate-400">No doctors found.</Td></Tr>
            )}
            {!loading && filtered.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-sky-700">{d.full_name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{d.full_name}</p>
                      <p className="text-[10px] text-slate-400">{d.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-500">{d.phone_number ?? "—"}</Td>
                <Td>
                  <Badge variant={d.status === "active" ? "success" : d.status === "suspended" ? "error" : "neutral"}>{d.status}</Badge>
                </Td>
                <Td className="text-[12px] text-slate-400">{formatDate(d.created_at)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
