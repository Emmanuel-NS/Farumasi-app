import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Customer order history and profiles"
        icon={Users}
      />
      <Card>
        <CardContent>
          <EmptyState
            icon={Users}
            title="Customer Analytics Coming Soon"
            description="View customer order history, repeat-purchase rates, and segment analytics once your order volume grows."
          />
        </CardContent>
      </Card>
    </div>
  );
}
