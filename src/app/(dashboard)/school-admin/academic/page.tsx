import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAcademicData, getClassSubjectAssignments } from "@/lib/actions/academic";
import { sortClassesByGhanaLevel } from "@/lib/ghana-levels";
import { AcademicForms } from "@/components/shared/academic-forms";
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

export default async function AcademicPage() {
  const session = await auth();
  if (!session?.user || !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const [{ academicYears, classes: rawClasses, subjects, teachers }, assignments] =
    await Promise.all([getAcademicData(), getClassSubjectAssignments()]);
  const classes = sortClassesByGhanaLevel(rawClasses);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Academic Structure</h1>
        <p className="text-sm text-muted-foreground">
          Build classes (Creche → Nursery → KG → Primary → JHS), import GES subjects, assign subjects to each teacher. No enrollment or finance edits.
        </p>
      </div>

      <AcademicForms
        academicYears={academicYears.map((y) => ({
          id: y.id,
          name: y.name,
          isCurrent: y.isCurrent,
        }))}
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        teachers={teachers.map((t) => ({
          id: t.id,
          name: `${t.user.firstName} ${t.user.lastName}`,
        }))}
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
        }))}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academic Years</CardTitle>
          </CardHeader>
          <CardContent>
            {academicYears.length === 0 ? (
              <p className="text-sm text-muted-foreground">No academic years yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {academicYears.map((y) => (
                    <TableRow key={y.id}>
                      <TableCell className="font-medium">{y.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {y.startDate.toLocaleDateString()} – {y.endDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {y.isCurrent ? (
                          <Badge variant="success">Current</Badge>
                        ) : (
                          <Badge variant="secondary">Past</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.code}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classes & Sections</CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes yet.</p>
          ) : (
            <div className="space-y-4">
              {classes.map((klass) => (
                <div key={klass.id} className="rounded-md border border-border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-medium">{klass.name}</h3>
                    <Badge variant="secondary">{klass.academicYear.name}</Badge>
                  </div>
                  {klass.sections.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No sections</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Section</TableHead>
                          <TableHead>Class Teacher</TableHead>
                          <TableHead>Students</TableHead>
                          <TableHead>Room</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {klass.sections.map((sec) => (
                          <TableRow key={sec.id}>
                            <TableCell className="font-medium">{sec.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {sec.classTeacher
                                ? `${sec.classTeacher.user.firstName} ${sec.classTeacher.user.lastName}`
                                : "—"}
                            </TableCell>
                            <TableCell>{sec._count.students}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {sec.roomNumber || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teacher assignments (subject + classroom)</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No assignments yet. Import GES subjects, then assign a teacher to a subject and class.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.class.name}</TableCell>
                    <TableCell>{a.subject.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.subject.code}</TableCell>
                    <TableCell>
                      {a.teacher
                        ? `${a.teacher.user.firstName} ${a.teacher.user.lastName}`
                        : "— Unassigned"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.class.academicYear.name}
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
