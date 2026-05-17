"use client";

import { useState } from "react";
import { Search, AlertTriangle, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardContent, Input, Badge, Table, Thead, Th, Td, Tr, EmptyState } from "@/components/ui";
import { mockShortages } from "@/data/mock";
import { severityColor } from "@/lib/utils";
import type { ShortageLevel } from "@/types";

const LEVEL_OPTS: (ShortageLevel | "All")[] = ["All", "Critical", "High", "Medium", "Low"];

export default function MedicinesPage() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<ShortageLevel | "All">("All");

  const filtered = mockShortages.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.medicineName.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.genericName.toLowerCase().includes(q);
    const matchLevel = level === "All" || m.severity === level;
    return matchSearch && matchLevel;
  });

  const levelCounts = LEVEL_OPTS.reduce((acc, l) => {
    acc[l] = l === "All" ? mockShortages.length : mockShortages.filter((m) => m.severity === l).length;
    return acc;
  }, {} as Record<string, number>);

  const critical = mockShortages.filter((m) => m.severity === "Critical").length;
  const low = mockShortages.filter((m) => m.severity === "Low").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Medicine Intelligence" subtitle="Real-time stock levels and shortage alerts across KUTH" />

      {/* Alert banner */}
      {critical > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">{critical} Critical Shortage{critical !== 1 ? "s" : ""} Detected</p>
            <p className="text-sm text-red-600">Immediate procurement action required. {low} additional medicines at low stock.</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Critical", value: critical, color: "text-red-600", bg: "bg-red-50" },
          { label: "High", value: mockShortages.filter((m) => m.severity === "High").length, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Medium", value: mockShortages.filter((m) => m.severity === "Medium").length, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Low", value: low, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 border border-slate-100`}>
            <p className="text-xs text-slate-600 font-medium">{label}</p>
            <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input icon={Search} placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <div className="flex flex-wrap gap-1.5">
          {LEVEL_OPTS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${level === l ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              {l} ({levelCounts[l]})
            </button>
          ))}
        </div>
      </div>

      <Card>
        <Table>
          <Thead>
            <tr><Th>Medicine</Th><Th>Category</Th><Th>Severity</Th><Th>Pharmacies Affected</Th><Th>Impacted Rx</Th><Th>Alternative</Th><Th>Est. Restock</Th></tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={CheckCircle} title="No medicines match your filter" /></td></tr>
            ) : (
              filtered.map((m) => (
                <Tr key={m.id}>
                  <Td>
                    <p className="font-medium text-slate-900">{m.medicineName}</p>
                    <p className="text-xs text-slate-400">{m.genericName}</p>
                  </Td>
                  <Td className="text-slate-500 text-xs">{m.category}</Td>
                  <Td>
                    <Badge variant={m.severity === "Critical" ? "error" : m.severity === "High" ? "warning" : m.severity === "Medium" ? "info" : "success"}>
                      {m.severity}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.severity === "Critical" ? "bg-red-500" : m.severity === "High" ? "bg-orange-500" : m.severity === "Medium" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.round((m.affectedPharmacies / m.totalPharmacies) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-semibold">{m.affectedPharmacies}/{m.totalPharmacies}</span>
                    </div>
                  </Td>
                  <Td className="text-slate-600">{m.impactedPrescriptions} Rx</Td>
                  <Td>
                    {m.alternativeAvailable ? (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">{m.alternativeName}</span>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-500">{m.estimatedRestock ? new Date(m.estimatedRestock).toLocaleDateString("en-RW", { month: "short", day: "numeric" }) : "—"}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
