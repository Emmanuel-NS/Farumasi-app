"use client";

import Link from "next/link";
import { Building2, Users, ClipboardList, TrendingUp, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Badge } from "@/components/ui";
import { mockDepartments, mockDoctors } from "@/data/mock";
import { getRateColor } from "@/lib/utils";

export default function DepartmentsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Department Management" subtitle={`${mockDepartments.length} departments at KUTH`} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockDepartments.map((dept) => {
          const headDoctor = mockDoctors.find((d) => d.id === dept.headId);
          return (
            <Link key={dept.id} href={`/departments/${dept.id}`}>
              <Card className="p-5 hover:border-farumasi-200 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-farumasi-50 flex items-center justify-center text-farumasi-700 text-xs font-bold">
                      {dept.code}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-farumasi-700 transition-colors">{dept.name}</h3>
                      <p className="text-xs text-slate-500">{dept.floor} · Ext. {dept.extension}</p>
                    </div>
                  </div>
                  <Badge variant={dept.status === "Active" ? "success" : "default"}>{dept.status}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 mb-1"><Users className="w-3.5 h-3.5" /></div>
                    <p className="text-lg font-bold text-slate-900">{dept.totalDoctors}</p>
                    <p className="text-[10px] text-slate-500">Doctors</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 mb-1"><ClipboardList className="w-3.5 h-3.5" /></div>
                    <p className="text-lg font-bold text-slate-900">{dept.activePrescriptions}</p>
                    <p className="text-[10px] text-slate-500">Active Rx</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 mb-1"><TrendingUp className="w-3.5 h-3.5" /></div>
                    <p className={`text-lg font-bold ${getRateColor(dept.fulfillmentRate)}`}>{dept.fulfillmentRate}%</p>
                    <p className="text-[10px] text-slate-500">Fulfillment</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${dept.fulfillmentRate >= 95 ? "bg-emerald-500" : dept.fulfillmentRate >= 85 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${dept.fulfillmentRate}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Head: <span className="font-medium text-slate-700">{dept.headName}</span></span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-farumasi-600 transition-colors" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
