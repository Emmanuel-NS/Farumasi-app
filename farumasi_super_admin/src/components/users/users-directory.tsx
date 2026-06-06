"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { getApiError } from "@/lib/services/auth.service";
import {
  Card,
  CardHeader,
  CardTitle,
  PageHeader,
  Badge,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  SearchInput,
  FilterTabs,
  StatCard,
  EmptyState,
  ErrorBanner,
  Button,
} from "@/components/ui";
import { Users, Loader2, Ban, CheckCircle2, ShieldOff, UserPlus } from "lucide-react";
import { usersService, apiStatusFromLabel } from "@/lib/services/users.service";
import type { User, UserStatus } from "@/types";
import { CreateUserModal } from "@/components/users/create-user-modal";

const STATUS_OPTIONS: (UserStatus | "All")[] = [
  "All",
  "Active",
  "Pending Verification",
  "Suspended",
  "Restricted",
];

const statusVariant = (s: UserStatus): "success" | "warning" | "error" | "neutral" => {
  if (s === "Active") return "success";
  if (s === "Pending Verification") return "warning";
  if (s === "Suspended") return "error";
  return "neutral";
};

function statusParam(filter: UserStatus | "All") {
  if (filter === "All") return undefined;
  return apiStatusFromLabel(filter as UserStatus);
}

interface UsersDirectoryProps {
  title: string;
  subtitle: string;
  apiRole?: string;
  apiRoles?: string[];
  breadcrumb?: string;
  showCreate?: boolean;
  createRoleOptions?: Array<{ value: string; label: string }>;
  createTitle?: string;
}

export function UsersDirectory({
  title,
  subtitle,
  apiRole,
  apiRoles,
  breadcrumb = "Platform",
  showCreate = false,
  createRoleOptions = [{ value: "pharmacist", label: "Pharmacist" }],
  createTitle,
}: UsersDirectoryProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "All">("All");
  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const roles = apiRoles ?? (apiRole ? [apiRole] : []);
  const roleKey = roles.join(",");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const status = statusParam(statusFilter);

    Promise.all(roles.map((role) => usersService.getUsers({ limit: 100, role, status })))
      .then((results) => {
        const merged = new Map<string, User>();
        let count = 0;
        results.forEach(({ items, total: t }) => {
          count += t;
          items.forEach((u) => merged.set(u.id, u));
        });
        setRows(Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name)));
        setTotal(count);
      })
      .catch((err) => setError(getApiError(err, "Failed to load users")))
      .finally(() => setLoading(false));
  }, [roleKey, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(user: User, next: UserStatus) {
    if (user.role === "Super Admin") return;
    setActionId(user.id);
    setError(null);
    try {
      await usersService.updateUserStatus(user.id, apiStatusFromLabel(next));
      load();
    } catch (err) {
      setError(getApiError(err, "Failed to update user status"));
    } finally {
      setActionId(null);
    }
  }

  const filtered = rows.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const activeCount = rows.filter((u) => u.status === "Active").length;
  const isProtected = (u: User) => u.role === "Super Admin";

  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={subtitle} breadcrumb={breadcrumb}>
        {showCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="w-3.5 h-3.5" /> Create account
          </Button>
        )}
      </PageHeader>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total in role" value={total} icon={Users} color="text-slate-700" />
        <StatCard label="Active" value={activeCount} icon={Users} color="text-emerald-700" />
        <StatCard label="Showing" value={filtered.length} icon={Users} color="text-farumasi-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-farumasi-600" />
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterTabs options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search name or email…" className="w-52" />
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Phone</Th>
              <Th>Joined</Th>
              <Th>Last active</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {loading && (
              <Tr>
                <Td colSpan={7} className="text-center py-10 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Loading…
                </Td>
              </Tr>
            )}
            {!loading && filtered.length === 0 && (
              <Tr>
                <Td colSpan={7}>
                  <EmptyState icon={Users} title="No users found" description="Try adjusting filters or search terms." />
                </Td>
              </Tr>
            )}
            {!loading &&
              filtered.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-farumasi-100 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-farumasi-700">
                          {u.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-900">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[12px] text-slate-600">{u.role}</Td>
                  <Td>
                    <Badge variant={statusVariant(u.status)}>{u.status}</Badge>
                  </Td>
                  <Td className="text-[12px] text-slate-500">{u.phone || "—"}</Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(u.createdAt)}</Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(u.lastActive)}</Td>
                  <Td>
                    {isProtected(u) ? (
                      <span className="text-[10px] text-slate-400">Protected</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.status !== "Active" && (
                          <Button
                            variant="success"
                            size="xs"
                            disabled={actionId === u.id}
                            onClick={() => setStatus(u, "Active")}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Activate
                          </Button>
                        )}
                        {u.status === "Active" && (
                          <>
                            <Button
                              variant="destructive"
                              size="xs"
                              disabled={actionId === u.id}
                              onClick={() => setStatus(u, "Suspended")}
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Suspend
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={actionId === u.id}
                              onClick={() => setStatus(u, "Restricted")}
                            >
                              <ShieldOff className="w-3.5 h-3.5" />
                              Restrict
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
          </tbody>
        </Table>
      </Card>

      {showCreate && (
        <CreateUserModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={load}
          roleOptions={createRoleOptions}
          title={createTitle}
        />
      )}
    </div>
  );
}
