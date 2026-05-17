"use client";

import { useState } from "react";
import { mockDepartments } from "@/data/mock";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, Button } from "@/components/ui";
import { Boxes, Plus } from "lucide-react";

export default function DepartmentsPage() {
  const [search, setSearch] = useState("");

  const filtered = mockDepartments.filter((d) =>
    search === "" || d.name.toLowerCase().includes(search.toLowerCase()) || d.hospitalName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Departments" subtitle={`${mockDepartments.length} departments across all hospitals`} breadcrumb="Platform Management">
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Add Department</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Department Management</CardTitle>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search departments..." className="w-56" />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Department</Th>
              <Th>Hospital</Th>
              <Th>Specialization</Th>
              <Th>Status</Th>
              <Th>Doctors</Th>
              <Th>Beds</Th>
              <Th>Head of Dept</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <p className="text-[12px] font-semibold text-slate-900">{d.name}</p>
                </Td>
                <Td className="text-[12px] text-slate-600">{d.hospitalName}</Td>
                <Td className="text-[12px] text-slate-500">{d.code}</Td>
                <Td><Badge variant="success">Active</Badge></Td>
                <Td className="text-[12px] font-semibold text-slate-700">{d.activeDoctors}</Td>
                <Td className="text-[12px] text-slate-600">{d.activePrescriptions}</Td>
                <Td className="text-[12px] text-slate-500">{d.headDoctor}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
