"use client";

import { useState } from "react";
import { mockDoctors } from "@/data/mock";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs, Button } from "@/components/ui";
import { Stethoscope, Plus } from "lucide-react";

const SPEC_FILTERS = ["All", "General Practice", "Internal Medicine", "Pediatrics", "Surgery", "Obstetrics", "Cardiology", "Orthopedics", "Neurology"];

export default function DoctorsPage() {
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("All");

  const filtered = mockDoctors.filter((d) => {
    const matchSearch = search === "" || d.name.toLowerCase().includes(search.toLowerCase());
    const matchSpec = spec === "All" || d.specialty === spec;
    return matchSearch && matchSpec;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Doctors" subtitle={`${mockDoctors.length} registered doctors`} breadcrumb="Platform Management">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Doctor</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Doctor Management</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterTabs options={SPEC_FILTERS} value={spec} onChange={setSpec} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search doctors..." className="w-48" />
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Doctor</Th>
              <Th>Specialization</Th>
              <Th>Hospital</Th>
              <Th>License No.</Th>
              <Th>Verified</Th>
              <Th>Prescriptions</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-sky-700">{d.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{d.name}</p>
                      <p className="text-[10px] text-slate-400">{d.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-600">{d.specialty}</Td>
                <Td className="text-[12px] text-slate-500">{d.hospitalName}</Td>
                <Td className="text-[11px] text-slate-400 font-mono">{d.licenseNumber}</Td>
                <Td>
                  <Badge variant={d.verifiedAt ? "success" : "warning"}>{d.verifiedAt ? "Verified" : "Pending"}</Badge>
                </Td>
                <Td className="text-[12px] font-semibold text-slate-700">{d.totalPrescriptions}</Td>
                <Td>
                  <Badge variant={d.status === "Active" ? "success" : d.status === "Suspended" ? "error" : "neutral"}>{d.status}</Badge>
                </Td>
                <Td className="text-[12px] text-slate-400">{formatDate(d.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
