import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOtherIncomes } from "@/lib/actions/accountant-ops";
import { PageHeader } from "@/components/shared/page-header";
import { OtherIncomeForm } from "@/components/shared/other-income-form";
import { EditOtherIncomeForm } from "@/components/shared/edit-other-income-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGHS } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function OtherIncomePage() {
  const session = await auth();
  if (!session?.user || !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const rows = await getOtherIncomes();
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Other income"
        description="Record non-fee income — donations, grants, rentals, sales, and any other money in (GH₵)."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New entry</CardTitle>
          </CardHeader>
          <CardContent>
            <OtherIncomeForm />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent other income</CardTitle>
            <p className="text-sm font-semibold text-emerald-700">
              Total listed: {formatGHS(total)}
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No other income recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">
                        {new Date(r.incomeDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{r.description}</TableCell>
                      <TableCell className="text-emerald-700">
                        {formatGHS(r.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.notes || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.recordedBy.user.firstName} {r.recordedBy.user.lastName}
                      </TableCell>
                      <TableCell>
                        <EditOtherIncomeForm
                          id={r.id}
                          description={r.description}
                          amount={r.amount}
                          notes={r.notes}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
