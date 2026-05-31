"use client";

import { Flag, Construction } from "lucide-react";
import { PageHeader, Card, CardContent } from "@/components/ui";

export default function Page() {
  return (
    <div className="space-y-5">
      <PageHeader title="Feature Flags" subtitle="Feature rollout and experimentation controls" breadcrumb="Platform" />
      <Card>
        <CardContent className="py-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <Construction className="w-8 h-8 opacity-40" />
          <p className="text-sm font-medium">Coming Soon</p>
          <p className="text-xs max-w-sm">This feature is planned for a future release. Real-time data will be available here once the backend module is complete.</p>
        </CardContent>
      </Card>
    </div>
  );
}
