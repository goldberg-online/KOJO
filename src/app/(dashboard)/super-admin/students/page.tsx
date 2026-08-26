import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPlatformStudents } from "@/lib/actions/super-admin";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SuperAdminStudentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");

  const students = await getPlatformStudents();

  return (
    <div>
      <PageHeader
        title="Student management"
        description="Total enrollment and student records across all schools"
      />

      <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
        <p className="text-xs font-medium text-muted-foreground">Total enrollment</p>
        <p className="text-2xl font-semibold tracking-tight">{students.length}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Students</CardTitle>
          <Badge variant="secondary">{students.length} enrolled</Badge>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No students enrolled yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Class / Section</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.user.firstName} {s.user.lastName}
                    </TableCell>
                    <TableCell className="text-xs">{s.admissionNumber || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {s.section
                        ? `${s.section.class.name} — ${s.section.name}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {s.user.school ? (
                        <span className="text-sm">
                          {s.user.school.name}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({s.user.school.code})
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.user.isActive ? "success" : "destructive"}>
                        {s.user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
