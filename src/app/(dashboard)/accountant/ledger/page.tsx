import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFinanceBreakdown } from "@/lib/actions/accountant-ops";
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

export default async function FinanceLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const sp = await searchParams;
  const view = sp.view === "outstanding" ? "outstanding" : "collected";
  const data = await getFinanceBreakdown();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Balance breakdown"
          description="Every payment and invoice line that builds the totals on the finance desk."
        />
        <div className="flex flex-wrap gap-2">
          <Link
            href="/accountant/ledger?view=collected"
            className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
              view === "collected"
                ? "bg-emerald-600 text-white"
                : "border border-border hover:bg-muted"
            }`}
          >
            Collected {formatGHS(data.collected)}
          </Link>
          <Link
            href="/accountant/ledger?view=outstanding"
            className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
              view === "outstanding"
                ? "bg-rose-600 text-white"
                : "border border-border hover:bg-muted"
            }`}
          >
            Outstanding {formatGHS(data.outstanding)}
          </Link>
          <Link
            href="/accountant"
            className="rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            ← Desk
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total collected</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-700">
            {formatGHS(data.collected)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total outstanding</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-rose-700">
            {formatGHS(data.outstanding)}
          </CardContent>
        </Card>
      </div>

      {view === "collected" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Payment transactions ({data.payments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No payments yet. Record one under Payments.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">
                        {new Date(p.paidAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.invoice.student.user.firstName}{" "}
                        {p.invoice.student.user.lastName}
                        <span className="block text-[11px] text-muted-foreground">
                          {p.invoice.student.admissionNumber}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {String(p.method).replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="font-medium text-emerald-700">
                        +{formatGHS(p.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.reference || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Billings & balances ({data.invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No billings yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.invoices.map((inv) => {
                    const bal = inv.totalAmount - inv.paidAmount;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm">
                          {inv.student.user.firstName} {inv.student.user.lastName}
                          <span className="block text-[11px] text-muted-foreground">
                            {inv.student.admissionNumber}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell>{formatGHS(inv.totalAmount)}</TableCell>
                        <TableCell>{formatGHS(inv.paidAmount)}</TableCell>
                        <TableCell className="font-medium">
                          {formatGHS(bal)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{inv.status}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
