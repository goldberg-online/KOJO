import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFeesOverviewForService } from "@/lib/actions/service-desk";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/currency";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ServiceFeesViewPage() {
  const session = await auth();
  if (
    !session?.user ||
    !["SERVICE_OFFICER", "ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)
  ) {
    redirect("/login");
  }

  const invoices = await getFeesOverviewForService();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="School fees (view only)"
          description="Tuition and other invoices. You cannot edit these — bus & feeding is on your workpage."
        />
        <Link
          href="/services"
          className="inline-flex h-9 items-center rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          Back to bus & feeding
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billings ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No fee invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      {inv.student.user.firstName} {inv.student.user.lastName}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>{formatGHS(inv.totalAmount)}</TableCell>
                    <TableCell>{formatGHS(inv.paidAmount)}</TableCell>
                    <TableCell>
                      {formatGHS(inv.totalAmount - inv.paidAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{inv.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
