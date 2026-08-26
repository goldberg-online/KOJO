import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSalaries } from "@/lib/actions/accountant-ops";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/currency";
import { SalaryForm } from "@/components/shared/salary-form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default async function SalariesPage() {
  const session = await auth();
  if (!session?.user || !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }
  const rows = await getSalaries();

  return (
    <div>
      <PageHeader
        title="Salary payments"
        description="Enter employee name and gross pay. SSNIT 5.5% is deducted automatically; net balance is saved."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Pay salary</CardTitle></CardHeader>
          <CardContent><SalaryForm /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Payment history</CardTitle>
            <Badge variant="secondary">{rows.length}</Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>SSNIT 5.5%</TableHead>
                  <TableHead>Net (balance)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.paymentDate.toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{r.employeeName}</TableCell>
                    <TableCell>{formatGHS(r.grossAmount)}</TableCell>
                    <TableCell className="text-rose-600">{formatGHS(r.ssnitDeduction)}</TableCell>
                    <TableCell className="font-semibold text-emerald-700">{formatGHS(r.netAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
