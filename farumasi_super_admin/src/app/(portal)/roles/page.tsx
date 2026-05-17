"use client";

import { mockAdminUsers } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard, Button } from "@/components/ui";
import { KeyRound, Users, Plus, ShieldCheck } from "lucide-react";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "Super Admin": ["All Permissions"],
  "Operations Admin": ["View Dashboard", "Manage Orders", "Manage Fulfillments", "Manage Deliveries", "View Reports"],
  "Finance Admin": ["View Dashboard", "Manage Revenue", "Manage Payouts", "Manage Withdrawals", "Financial Reports"],
  "Compliance Admin": ["View Dashboard", "Manage Verifications", "Compliance Monitoring", "Audit Logs", "Security Events"],
  "Pharmacy Admin": ["View Dashboard", "Manage Pharmacies", "Manage Products", "Inventory Management"],
  "Support Admin": ["View Dashboard", "View Users", "Manage Notifications", "View Reports"],
};

export default function RolesPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Roles & Permissions" subtitle="Admin user management and RBAC configuration" breadcrumb="System">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Admin</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Admin Users" value={mockAdminUsers.length} icon={Users} color="text-farumasi-700" />
        <StatCard label="Active Admins" value={mockAdminUsers.filter(a => a.status === "Active").length} icon={ShieldCheck} color="text-emerald-700" />
        <StatCard label="Roles Defined" value={Object.keys(ROLE_PERMISSIONS).length} icon={KeyRound} color="text-blue-700" />
        <StatCard label="Super Admins" value={mockAdminUsers.filter(a => a.role === "Super Admin").length} icon={ShieldCheck} color="text-red-700" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-farumasi-600" /><CardTitle>Admin Users</CardTitle></div>
          </CardHeader>
          <Table>
            <Thead>
              <tr>
                <Th>Admin</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Last Login</Th>
              </tr>
            </Thead>
            <tbody>
              {mockAdminUsers.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-farumasi-100 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-farumasi-700">{a.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-900">{a.name}</p>
                        <p className="text-[10px] text-slate-400">{a.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><Badge variant={a.role === "Super Admin" ? "error" : "default"}>{a.role}</Badge></Td>
                  <Td><Badge variant={a.status === "Active" ? "success" : "neutral"}>{a.status}</Badge></Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(a.lastLogin)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-farumasi-600" /><CardTitle>Role Permissions</CardTitle></div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
                <div key={role} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-semibold text-slate-900">{role}</p>
                    <Badge variant={role === "Super Admin" ? "error" : "default"}>{perms.length} perms</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {perms.map((p) => (
                      <span key={p} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
