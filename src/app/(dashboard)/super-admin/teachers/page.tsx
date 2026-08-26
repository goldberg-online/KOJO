import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPlatformTeachers } from "@/lib/actions/super-admin";
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

export default async function SuperAdminTeachersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");

  const teachers = await getPlatformTeachers();

  return (
    <div>
      <PageHeader
        title="Teachers management"
        description="All teaching staff across every school on the platform"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Teachers</CardTitle>
          <Badge variant="secondary">{teachers.length} total</Badge>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No teachers found. Create teacher users from a school admin account.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.user.firstName} {t.user.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.user.email}</TableCell>
                    <TableCell className="text-xs">{t.employeeId || "—"}</TableCell>
                    <TableCell>
                      {t.user.school ? (
                        <span className="text-sm">
                          {t.user.school.name}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({t.user.school.code})
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {t.user.phone || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.user.isActive ? "success" : "destructive"}>
                        {t.user.isActive ? "Active" : "Inactive"}
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
