import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyInvoices } from "@/lib/actions/fees";
import { InvoiceStatusBadge } from "@/components/shared/invoice-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatGHS } from "@/lib/currency";

export default async function StudentFeesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const invoices = await getMyInvoices();

  const totalDue = invoices.reduce(
    (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
    0
  );
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Fees</h1>
        <p className="text-sm text-muted-foreground">
          View your billings and payment history.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatGHS(totalDue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatGHS(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billings ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No billings found.
            </p>
          ) : (
            <div className="space-y-4">
              {invoices.map((inv) => (
                <div key={inv.id} className="rounded-md border border-border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.academicYear.name} · Due{" "}
                        {inv.dueDate.toLocaleDateString()}
                      </p>
                    </div>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inv.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">
                            {formatGHS(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatGHS(inv.totalAmount)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Paid</TableCell>
                        <TableCell className="text-right">
                          {formatGHS(inv.paidAmount)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Balance</TableCell>
                        <TableCell className="text-right">
                          {formatGHS(inv.totalAmount - inv.paidAmount)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  {inv.payments.length > 0 && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Payments
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {inv.payments.map((p) => (
                          <li key={p.id}>
                            {p.paidAt.toLocaleDateString()} — {formatGHS(p.amount)}{" "}
                            ({p.method.replace(/_/g, " ")})
                            {p.reference ? ` · Ref: ${p.reference}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
