"use client";

import { UserCog, Plus, Mail, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockTeam } from "@/data/mock";
import { timeAgo, formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  pharmacist_staff: "Pharmacist Staff",
  inventory_staff: "Inventory Staff",
  finance_staff: "Finance Staff",
  viewer: "Viewer",
};

const roleColors: Record<string, string> = {
  owner: "bg-farumasi-100 text-farumasi-700",
  manager: "bg-blue-100 text-blue-700",
  pharmacist_staff: "bg-purple-100 text-purple-700",
  inventory_staff: "bg-amber-100 text-amber-700",
  finance_staff: "bg-teal-100 text-teal-700",
  viewer: "bg-slate-100 text-slate-600",
};

export default function TeamPage() {
  const activeCount = mockTeam.filter(m => m.status === "active").length;
  const invitedCount = mockTeam.filter(m => m.status === "invited").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Management"
        description="Manage staff access and roles for your business"
        icon={UserCog}
        actions={
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => toast.info("Opening invite member form…")}>
            <Plus className="w-4 h-4" /> Invite Member
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Members", value: mockTeam.length },
          { label: "Active", value: activeCount },
          { label: "Pending Invite", value: invitedCount },
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
                <TableHead>Last Active</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTeam.map(member => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                        {member.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${roleColors[member.role]}`}>
                      {roleLabels[member.role]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(member.joinedAt, true)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {member.lastActive ? timeAgo(member.lastActive) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === "active" ? "success" : member.status === "invited" ? "info" : "neutral"} className="capitalize">
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => toast.info(`Manage ${member.name}`)}><MoreHorizontal className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
