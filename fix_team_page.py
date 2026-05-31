path = r'C:/Users/PC/Farumasi-app/farumasi_partner_portal/src/app/(portal)/team/page.tsx'

content = '''\
"use client";

import { UserCog, Mail } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthStore } from "@/lib/store/auth";
import { formatDate } from "@/lib/utils";

export default function TeamPage() {
  const user = useAuthStore(s => s.user);

  const members = user
    ? [{ id: user.id, name: user.full_name, email: user.email, role: "partner_company_admin", status: "active", joinedAt: null as null | string }]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Management"
        description="Manage staff access and roles for your business"
        icon={UserCog}
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Members", value: members.length },
          { label: "Active", value: members.filter(m => m.status === "active").length },
          { label: "Pending Invite", value: 0 },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-4 px-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(member => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                        {member.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />{member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-farumasi-100 text-farumasi-700">
                      Admin
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {member.joinedAt ? formatDate(member.joinedAt, true) : "\u2014"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" className="capitalize">{member.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pb-2">
        Multi-member team management is coming in a future release.
      </p>
    </div>
  );
}
'''

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
