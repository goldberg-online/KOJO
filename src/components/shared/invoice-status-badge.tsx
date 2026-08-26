import { Badge } from "@/components/ui/badge";

const VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
  PENDING: "warning",
  PARTIALLY_PAID: "secondary",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT[status] ?? "secondary"}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
