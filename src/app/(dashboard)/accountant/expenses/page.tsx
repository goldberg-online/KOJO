import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getExpenses } from "@/lib/actions/accountant-ops";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/currency";
import { ExpenseForm } from "@/components/shared/expense-form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user || !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }
  const rows = await getExpenses();

  return (
    <div>
      <PageHeader
        title="School expenses"
        description="Power, GRA tax, SSNIT contributions, and other operating costs"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">New expense</CardTitle></CardHeader>
          <CardContent><ExpenseForm /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent expenses</CardTitle>
            <Badge variant="secondary">{rows.length}</Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.expenseDate.toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="secondary">{r.category.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="font-medium">{formatGHS(r.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.description || "—"}</TableCell>
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
