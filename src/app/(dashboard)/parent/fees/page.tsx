import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getParentChildrenOverview } from "@/lib/actions/parent-portal";
import { InvoiceStatusBadge } from "@/components/shared/invoice-status-badge";
import { PageHeader } from "@/components/shared/page-header";
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
import Link from "next/link";

export default async function ParentFeesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/login");

  const children = await getParentChildrenOverview();
  const totalDue = children.reduce((a, c) => a + c.balance, 0);
  const totalPaid = children.reduce((a, c) => a + c.totalPaid, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Children's fees"
          description="Full fee view for your child(ren) — same information a student would see. Pay at the school accounts office."
        />
        <Link
          href="/parent/children"
          className="text-sm font-medium text-primary hover:underline"
        >
          View profiles & grades →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Outstanding (all children)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatGHS(totalDue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatGHS(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No linked children.
          </CardContent>
        </Card>
      ) : (
        children.map((child) => (
          <Card key={child.studentId}>
            <CardHeader>
              <CardTitle className="text-base">
                {child.firstName} {child.lastName}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  · {child.admissionNumber} · {child.className}
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Balance {formatGHS(child.balance)} · Paid {formatGHS(child.totalPaid)} ·
                Billed {formatGHS(child.totalBilled)}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {child.invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                child.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="rounded-xl border border-border p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.academicYear?.name}
                          {inv.dueDate
                            ? ` · Due ${new Date(inv.dueDate).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-medium">{formatGHS(inv.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-medium">{formatGHS(inv.paidAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="font-medium">
                          {formatGHS(inv.totalAmount - inv.paidAmount)}
                        </p>
                      </div>
                    </div>
                    {inv.items?.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inv.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm">{item.description}</TableCell>
                              <TableCell>{formatGHS(item.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    {inv.payments?.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Payments
                        </p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Ref</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inv.payments.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="text-sm">
                                  {new Date(p.paidAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {String(p.method).replace(/_/g, " ")}
                                </TableCell>
                                <TableCell>{formatGHS(p.amount)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {p.reference || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
