"use client";

import { useState, useEffect } from "react";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs } from "@/components/ui";
import { Truck } from "lucide-react";
import { partnersService, type BackendPartner } from "@/lib/services/partners.service";

const STATUS_FILTERS = ["All", "active", "suspended", "inactive"];

function statusVariant(status: string): "success" | "warning" | "error" | "neutral" {
  if (status === "active") return "success";
  if (status === "suspended") return "error";
  return "neutral";
}

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [partners, setPartners] = useState<BackendPartner[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partnersService
      .getPartners({ limit: 100 })
      .then(({ items, total: t }) => {
        setPartners(items);
        setTotal(t);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = partners.filter((p) => {
    const matchSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || p.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Partners & Companies"
        subtitle={`${total} healthcare companies and distributors`}
        breadcrumb="Platform"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Partner management</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterTabs options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search partners..."
              className="w-48"
            />
          </div>
        </CardHeader>
        {loading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Loading partners…</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>District</Th>
                <Th>Verification</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </Thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <Td colSpan={6} className="text-center text-muted-foreground py-8">
                    No partners match your filters.
                  </Td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <p className="font-medium text-foreground">{p.name}</p>
                      {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                    </Td>
                    <Td className="text-muted-foreground">{p.company_type ?? "—"}</Td>
                    <Td>{p.district ?? "—"}</Td>
                    <Td>
                      <Badge variant={p.verification_status === "verified" ? "success" : "warning"}>
                        {p.verification_status}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </Td>
                    <Td className={cn("text-muted-foreground text-sm")}>{formatDate(p.created_at)}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
