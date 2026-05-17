import { Activity } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { mockActivityLogs } from "@/data/mock";
import { formatDateTime } from "@/lib/utils";

const roleColors: Record<string, string> = {
  owner: "bg-farumasi-100 text-farumasi-700",
  manager: "bg-blue-100 text-blue-700",
  pharmacist_staff: "bg-purple-100 text-purple-700",
  inventory_staff: "bg-amber-100 text-amber-700",
  finance_staff: "bg-teal-100 text-teal-700",
};

export default function ActivityPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Activity Logs"
        description="Full audit trail of all actions performed in your portal"
        icon={Activity}
      />

      <Card>
        <CardContent className="p-0 divide-y">
          {mockActivityLogs.map((log, i) => (
            <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                  {log.performedBy.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                {i < mockActivityLogs.length - 1 && (
                  <span className="absolute left-[17px] top-9 bottom-0 w-px bg-border -mb-4" />
                )}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{log.action}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleColors[log.performedByRole] ?? "bg-slate-100 text-slate-600"}`}>
                    {log.performedBy}
                  </span>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{log.entity}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{formatDateTime(log.timestamp)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
