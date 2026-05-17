"use client";

import { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, Badge } from "@/components/ui";
import { mockRoles, mockPermissions } from "@/data/mock";

export default function RolesPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Permissions & Roles" subtitle={`${mockRoles.length} roles · ${mockPermissions.length} granular permissions`} />

      {/* Permissions overview */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">All Permissions</h3>
          <p className="text-xs text-slate-500 mt-0.5">System-defined permission scopes</p>
        </div>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {mockPermissions.map((p) => (
              <div key={p.id} className="group relative">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-mono rounded cursor-default hover:bg-farumasi-50 hover:text-farumasi-800 transition-colors">
                  <ShieldCheck className="w-3 h-3" />{p.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roles */}
      <div className="space-y-3">
        {mockRoles.map((role) => {
          const isOpen = expanded === role.id;
          return (
            <Card key={role.id} className="overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : role.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-farumasi-50 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-farumasi-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">{role.name}</p>
                    <p className="text-xs text-slate-500">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="info">{role.permissions.length} permissions</Badge>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              {isOpen && (
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Granted Permissions</p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((permId) => {
                      const perm = mockPermissions.find((p) => p.id === permId);
                      return perm ? (
                        <span key={permId} className="text-xs bg-white border border-farumasi-200 text-farumasi-700 font-mono px-2 py-0.5 rounded">
                          {perm.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
