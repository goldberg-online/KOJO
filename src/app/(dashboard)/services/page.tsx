import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getServiceCollections,
  getStudentsForServices,
} from "@/lib/actions/accountant-ops";
import {
  getServiceDeskSummary,
  getServiceExpenses,
} from "@/lib/actions/service-desk";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/currency";
import { ServiceCollectionForm } from "@/components/shared/service-collection-form";
import { ServiceExpenseForm } from "@/components/shared/service-expense-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export default async function ServiceOfficerPage() {
  const session = await auth();
  if (
    !session?.user ||
    !["SERVICE_OFFICER", "ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)
  ) {
    redirect("/login");
  }

  const [rows, studentRows, summary, expenses] = await Promise.all([
    getServiceCollections(),
    getStudentsForServices(),
    getServiceDeskSummary(),
    getServiceExpenses(),
  ]);

  const students = studentRows.map((st) => ({
    id: st.id,
    label: `${st.user.firstName} ${st.user.lastName}${
      st.section ? ` — ${st.section.class.name} ${st.section.name}` : ""
    }${st.admissionNumber ? ` (${st.admissionNumber})` : ""}`,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Bus & feeding workpage"
          description="Collect bus and feeding fees, record desk expenses, and track net totals. Net = collected − expenses."
        />
        <Link
          href="/services/fees"
          className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted"
        >
          View school fees
        </Link>
      </div>

      {/* Period totals */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Totals (GH₵)</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-emerald-100">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Collected: <strong>{formatGHS(summary.todayCollected)}</strong>
              </p>
              <p>
                Expenses: <strong className="text-rose-600">{formatGHS(summary.todayExpense)}</strong>
              </p>
              <p className="text-base font-bold">
                Net: {formatGHS(summary.todayNet)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">This week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Collected: <strong>{formatGHS(summary.weekCollected)}</strong>
              </p>
              <p>
                Expenses: <strong className="text-rose-600">{formatGHS(summary.weekExpense)}</strong>
              </p>
              <p className="text-base font-bold">
                Net: {formatGHS(summary.weekNet)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">This month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Collected: <strong>{formatGHS(summary.monthCollected)}</strong>
              </p>
              <p>
                Expenses: <strong className="text-rose-600">{formatGHS(summary.monthExpense)}</strong>
              </p>
              <p className="text-base font-bold">
                Net: {formatGHS(summary.monthNet)}
              </p>
            </CardContent>
          </Card>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          All-time net: {formatGHS(summary.allTimeNet)} (collected{" "}
          {formatGHS(summary.allTimeCollected)} − expenses{" "}
          {formatGHS(summary.allTimeExpense)}). When you record an expense, net totals drop
          automatically.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              New collection · {students.length} students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceCollectionForm students={students} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desk expense</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceExpenseForm />
            <p className="mt-3 text-xs text-muted-foreground">
              Fuel, food supplies, repairs, etc. Deducted from collected totals for the matching
              period.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent collections</CardTitle>
            <Badge variant="secondary">{rows.length}</Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Student</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No collections yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.slice(0, 30).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">
                        {r.collectionDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatGHS(r.amount)}</TableCell>
                      <TableCell className="text-sm">
                        {r.student
                          ? `${r.student.user.firstName} ${r.student.user.lastName}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent expenses</CardTitle>
            <Badge variant="secondary">{expenses.length}</Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No expenses yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">
                        {e.expenseDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {String(e.category || "OTHER").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{e.description}</TableCell>
                      <TableCell className="font-medium text-rose-600">
                        −{formatGHS(e.amount)}
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
