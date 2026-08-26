import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  enrollStudent,
  getClassesForEnrollment,
  getStudentsByClass,
} from "@/lib/actions/accountant-ops";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnrollStudentForm } from "@/components/shared/enroll-student-form";
import { EditStudentForm } from "@/components/shared/edit-student-form";
import { AccountantSetupClassesButton } from "@/components/shared/accountant-setup-classes-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AccountantStudentsPage() {
  const session = await auth();
  if (!session?.user || !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const [classes, byClass] = await Promise.all([
    getClassesForEnrollment(),
    getStudentsByClass(),
  ]);

  const sectionOptions = classes.flatMap((c) => {
    const yearTag = c.academicYear.isCurrent ? " (current)" : "";
    if (c.sections.length === 0) {
      return [
        {
          id: `class:${c.id}`,
          label: `${c.name} — section A (auto)${yearTag}`,
        },
      ];
    }
    return c.sections.map((s) => ({
      id: s.id,
      label: `${c.name} — ${s.name}${yearTag}`,
    }));
  });

  return (
    <div>
      <PageHeader
        title="Student enrollment"
        description="Accountant full enrollment: photo, DOB, address, notes, parent login, class (Creche–JHS), DISST ID, online access — no Super Admin needed."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Full student enrollment</CardTitle>
            <p className="text-xs text-muted-foreground">
              Accountant controls the whole process — School Admin not required.
            </p>
            <div className="pt-2">
              <AccountantSetupClassesButton />
            </div>
          </CardHeader>
          <CardContent>
            <EnrollStudentForm sections={sectionOptions} />
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {byClass.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No classes yet. Ask school admin to create classes from Creche to JHS under Academic.
              </CardContent>
            </Card>
          ) : (
            byClass.map((cls) => {
              const students = cls.sections.flatMap((s) =>
                s.students.map((st) => ({ ...st, sectionName: s.name }))
              );
              return (
                <Card key={cls.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">{cls.name}</CardTitle>
                    <Badge variant="secondary">{students.length} students</Badge>
                  </CardHeader>
                  <CardContent>
                    {students.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No students in this class.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Photo</TableHead>
                        <TableHead>Name</TableHead>
                            <TableHead>Admission</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Edit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {students.map((st) => (
                            <TableRow key={st.id}>
                              <TableCell>
                                {st.user.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={st.user.avatarUrl}
                                    alt=""
                                    className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                    {(st.user.firstName?.[0] || "?") + (st.user.lastName?.[0] || "")}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {st.user.firstName} {st.user.lastName}
                              </TableCell>
                              <TableCell className="text-xs">{st.admissionNumber}</TableCell>
                              <TableCell>{st.sectionName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {st.user.phone || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {st.user.email}
                              </TableCell>
                              <TableCell className="align-top">
                                <EditStudentForm
                                  student={{
                                    id: st.id,
                                    admissionNumber: st.admissionNumber,
                                    address: st.address ?? null,
                                    notes: st.notes ?? null,
                                    dateOfBirth: st.dateOfBirth,
                                    gender: st.gender,
                                    sectionId: st.sectionId,
                                    user: st.user,
                                  }}
                                  sections={sectionOptions}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
