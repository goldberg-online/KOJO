import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPlatformClasses } from "@/lib/actions/super-admin";
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

export default async function SuperAdminClassesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");

  const classes = await getPlatformClasses();

  const totalSections = classes.reduce((sum, c) => sum + c.sections.length, 0);
  const totalEnrollment = classes.reduce(
    (sum, c) =>
      sum + c.sections.reduce((s, sec) => s + (sec._count.students || 0), 0),
    0
  );

  return (
    <div>
      <PageHeader
        title="Class management"
        description="Classes, sections, and enrollment by school"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-medium text-muted-foreground">Classes</p>
          <p className="text-2xl font-semibold tracking-tight">{classes.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-medium text-muted-foreground">Sections</p>
          <p className="text-2xl font-semibold tracking-tight">{totalSections}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-medium text-muted-foreground">Enrollment in sections</p>
          <p className="text-2xl font-semibold tracking-tight">{totalEnrollment}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">All classes</CardTitle>
          <Badge variant="secondary">{classes.length} total</Badge>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No classes created yet. School admins can add classes under Academic.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Academic year</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead>Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c) => {
                  const studentCount = c.sections.reduce(
                    (s, sec) => s + (sec._count.students || 0),
                    0
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {c.school.name}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({c.school.code})
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{c.academicYear.name}</span>
                        {c.academicYear.isCurrent ? (
                          <Badge variant="success" className="ml-2">
                            Current
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.sections.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            c.sections.map((sec) => (
                              <Badge key={sec.id} variant="secondary">
                                {sec.name} ({sec._count.students})
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{studentCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
