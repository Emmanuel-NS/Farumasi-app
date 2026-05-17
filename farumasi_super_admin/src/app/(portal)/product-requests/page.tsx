"use client";

import { useState } from "react";
import { mockProductRequests } from "@/data/mock";
import { formatDate, requestStatusColor } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs, Button } from "@/components/ui";
import { ClipboardList, CheckCircle2, XCircle } from "lucide-react";
import { ProductRequestStatus } from "@/types";

const STATUS_FILTERS: (ProductRequestStatus | "All")[] = ["All", "Submitted", "Approved", "Rejected", "Under Review"];

export default function ProductRequestsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductRequestStatus | "All">("All");

  const filtered = mockProductRequests.filter((r) => {
    const matchSearch = search === "" || r.productName.toLowerCase().includes(search.toLowerCase()) || r.requestedByName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || r.status === status;
    return matchSearch && matchStatus;
  });

  const pending = mockProductRequests.filter(r => r.status === "Submitted").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Product Requests" subtitle={`${pending} pending approval`} breadcrumb="Marketplace">
        <Badge variant="warning">{pending} Pending</Badge>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Product Request Queue</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterTabs options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search requests..." className="w-48" />
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>Requested By</Th>
              <Th>Priority</Th>
              <Th>Quantity</Th>
              <Th>Status</Th>
              <Th>Submitted</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{r.productName}</p>
                    <p className="text-[10px] text-slate-400">{r.category}</p>
                  </div>
                </Td>
                <Td>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-700">{r.requestedByName}</p>
                    <p className="text-[10px] text-slate-400">{r.requestedByType}</p>
                  </div>
                </Td>
                <Td>
                  <Badge variant={r.priority === "Urgent" ? "error" : r.priority === "High" ? "warning" : r.priority === "Normal" ? "info" : "neutral"}>
                    {r.priority}
                  </Badge>
                </Td>
                <Td className="text-[12px] font-semibold text-slate-700">{r.documents.length} docs</Td>
                <Td>
                  <Badge variant={r.status === "Approved" ? "success" : r.status === "Submitted" ? "warning" : r.status === "Under Review" ? "info" : "error"}>
                    {r.status}
                  </Badge>
                </Td>
                <Td className="text-[12px] text-slate-400">{formatDate(r.submittedAt)}</Td>
                <Td>
                  {r.status === "Submitted" && (
                    <div className="flex items-center gap-1">
                      <Button variant="success" size="xs"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>
                      <Button variant="destructive" size="xs"><XCircle className="w-3.5 h-3.5" /> Reject</Button>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
