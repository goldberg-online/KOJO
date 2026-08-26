import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getServiceCollections,
  getStudentsForServices,
} from "@/lib/actions/accountant-ops";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/currency";
import { ServiceCollectionForm } from "@/components/shared/service-collection-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export default async function AccountantServicesPage() {
  const session = await auth();
  if (
    !session?.user ||
    !["ACCOUNTANT", "SUPER_ADMIN", "SERVICE_OFFICER"].includes(session.user.role)
  ) {
    redirect("/login");
  }

  const [rows, studentRows] = await Promise.all([
    getServiceCollections(),
    getStudentsForServices(),
  ]);

  // Same name list as collection officer — type to filter
  const students = studentRows.map((st) => ({
    id: st.id,
    label: `${st.user.firstName} ${st.user.lastName}${
      st.section ? ` — ${st.section.class.name} ${st.section.name}` : ""
    }${st.admissionNumber ? ` (${st.admissionNumber})` : ""}`,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Bus & feeding fees"
          description="Type a student name to search. Feeding only, Bus only, or Both — amounts in GH₵."
        />
        <Link
          href="/services"
          className="text-sm font-medium text-primary hover:underline"
        >
          Full bus & feeding workpage →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New entry</CardTitle>
            <p className="text-xs text-muted-foreground">
              {students.length} students available — start typing a name
            </p>
          </CardHeader>
          <CardContent>
            <ServiceCollectionForm students={students} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent collections</CardTitle>
            <Badge variant="secondary">{rows.length}</Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No collections yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">
                        {r.collectionDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.type}</Badge>
                      </TableCell>
                      <TableCell>{formatGHS(r.amount)}</TableCell>
                      <TableCell className="text-sm">
                        {r.student
                          ? `${r.student.user.firstName} ${r.student.user.lastName}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.notes || "—"}
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
