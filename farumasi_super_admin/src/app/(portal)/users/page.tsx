"use client";

import { useState } from "react";
import { mockUsers } from "@/data/mock";
import { formatDate, userStatusColor, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs, Button } from "@/components/ui";
import { UserRole, UserStatus } from "@/types";
import { Users, UserPlus } from "lucide-react";

const ALL_ROLES: (UserRole | "All")[] = ["All", "Patient", "Doctor", "Pharmacist", "Supplier", "Rider", "Admin"];
const statusVariant = (s: UserStatus): "success" | "warning" | "error" | "neutral" => {
  if (s === "Active") return "success";
  if (s === "Pending Verification") return "warning";
  if (s === "Suspended") return "error";
  return "neutral";
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "All">("All");

  const filtered = mockUsers.filter((u) => {
    const matchSearch = search === "" || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Users" subtitle={`${mockUsers.length.toLocaleString()} total users across all roles`} breadcrumb="Platform Management">
        <Button variant="primary" size="sm"><UserPlus className="w-4 h-4" /> Invite User</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-farumasi-600" />
            <CardTitle>All Users</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterTabs options={ALL_ROLES} value={roleFilter} onChange={setRoleFilter} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search users..." className="w-48" />
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Phone</Th>
              <Th>Location</Th>
              <Th>Joined</Th>
              <Th>Last Active</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-farumasi-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-farumasi-700">{u.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </Td>
                <Td><Badge variant="default">{u.role}</Badge></Td>
                <Td><Badge variant={statusVariant(u.status)}>{u.status}</Badge></Td>
                <Td className="text-[12px] text-slate-500">{u.phone}</Td>
                <Td className="text-[12px] text-slate-500">{u.district}</Td>
                <Td className="text-[12px] text-slate-400">{formatDate(u.createdAt)}</Td>
                <Td className="text-[12px] text-slate-400">{formatDate(u.lastActive)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">No users match the current filters.</div>
        )}
      </Card>
    </div>
  );
}
