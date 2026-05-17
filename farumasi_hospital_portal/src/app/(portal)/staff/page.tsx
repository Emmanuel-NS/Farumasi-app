"use client";

import { useState } from "react";
import { Search, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Input, Badge, Table, Thead, Th, Td, Tr, EmptyState } from "@/components/ui";
import { mockStaff } from "@/data/mock";
import { getInitials, timeAgo } from "@/lib/utils";

const ROLE_OPTS = ["All", ...Array.from(new Set(mockStaff.map((s) => s.role)))];

export default function StaffPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All");

  const filtered = mockStaff.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.departmentName ?? "").toLowerCase().includes(q);
    const matchRole = role === "All" || s.role === role;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Staff Management" subtitle={`${mockStaff.length} staff members across all departments`} />

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Input icon={Search} placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-farumasi-600/30"
          >
            {ROLE_OPTS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="text-sm text-slate-500 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </Card>

      <Card>
        <Table>
          <Thead>
            <tr><Th>Staff Member</Th><Th>Role</Th><Th>Department</Th><Th>Email</Th><Th>Phone</Th><Th>Status</Th><Th>Last Login</Th></tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={UserCog} title="No staff found" /></td></tr>
            ) : (
              filtered.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                        {getInitials(s.name)}
                      </div>
                      <span className="font-medium text-slate-900">{s.name}</span>
                    </div>
                  </Td>
                  <Td><Badge>{s.role}</Badge></Td>
                  <Td className="text-slate-500 text-sm">{s.departmentName ?? "—"}</Td>
                  <Td className="text-slate-500 text-sm">{s.email}</Td>
                  <Td className="text-slate-500 text-sm">{s.phone}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.status === "Active" ? "bg-emerald-100 text-emerald-700" : s.status === "Suspended" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{s.status}</span>
                  </Td>
                  <Td className="text-xs text-slate-500">{timeAgo(s.lastLogin)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
