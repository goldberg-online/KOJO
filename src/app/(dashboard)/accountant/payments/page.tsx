import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPayments, getOpenInvoices } from "@/lib/actions/fees";
import { RecordPaymentForm } from "@/components/shared/record-payment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/currency";

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user || !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const [payments, openInvoices] = await Promise.all([
    getPayments(),
    getOpenInvoices(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Record fee payments against open invoices.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <RecordPaymentForm
              invoices={openInvoices.map((inv) => ({
                id: inv.id,
                label: `${inv.invoiceNumber} – ${inv.student.user.firstName} ${inv.student.user.lastName}`,
                remaining: inv.totalAmount - inv.paidAmount,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Recent Payments ({payments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.paidAt.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {p.invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        {p.invoice.student.user.firstName}{" "}
                        {p.invoice.student.user.lastName}
                      </TableCell>
                      <TableCell>{formatGHS(p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {p.method.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Link
                          href={`/accountant/receipts/${p.id}`}
                          className="font-mono text-primary hover:underline"
                          target="_blank"
                        >
                          {p.receiptNumber || "Print"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.recordedBy.user.firstName} {p.recordedBy.user.lastName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
