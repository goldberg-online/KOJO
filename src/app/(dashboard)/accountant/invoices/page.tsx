import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getInvoices,
  getStudentsForInvoices,
  getAcademicYearsForSchool,
  getFeeStructures,
} from "@/lib/actions/fees";
import { CreateInvoiceForm } from "@/components/shared/create-invoice-form";
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

export default async function BillingPage() {
  const session = await auth();
  if (
    !session?.user ||
    !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)
  ) {
    redirect("/login");
  }

  const [billings, students, years, structures] = await Promise.all([
    getInvoices(),
    getStudentsForInvoices(),
    getAcademicYearsForSchool(),
    getFeeStructures(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Create billings by student, academic year, and term (1st / 2nd / 3rd Term). Amounts in GH₵.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create billing</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateInvoiceForm
              students={students.map((s) => ({
                id: s.id,
                label: `${s.user.firstName} ${s.user.lastName} (${s.admissionNumber})${
                  s.section ? ` — ${s.section.class.name}` : ""
                }`,
              }))}
              years={years.map((y) => ({ id: y.id, name: y.name }))}
              structures={structures.map((fs) => ({
                id: fs.id,
                name: fs.name,
                amount: fs.amount,
                frequency: fs.frequency,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">All billings ({billings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {billings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No billings yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Billing #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billings.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-xs">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        {inv.student.user.firstName} {inv.student.user.lastName}
                      </TableCell>
                      <TableCell>{formatGHS(inv.totalAmount)}</TableCell>
                      <TableCell>{formatGHS(inv.paidAmount)}</TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.dueDate.toLocaleDateString()}
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
