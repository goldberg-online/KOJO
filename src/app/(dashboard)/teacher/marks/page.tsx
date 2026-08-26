import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getTeacherSubjectsAndStudents,
  getRecentMarks,
} from "@/lib/actions/teacher-marks";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarksEntryForm } from "@/components/shared/marks-entry-form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default async function TeacherMarksPage() {
  const session = await auth();
  if (!session?.user || !["TEACHER", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const data = await getTeacherSubjectsAndStudents();
  const recent = await getRecentMarks();

  return (
    <div>
      <PageHeader
        title="Marks entry"
        description="Select a subject, student, and enter scores. Subjects come from the school academic setup."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Enter marks</CardTitle></CardHeader>
          <CardContent>
            <MarksEntryForm
              subjects={data.subjects.map((s) => ({ id: s.id, name: s.name }))}
              students={data.students.map((s) => ({
                id: s.id,
                label: `${s.user.firstName} ${s.user.lastName}${
                  s.section?.class?.name ? ` (${s.section.class.name})` : ""
                }`,
              }))}
              years={data.academicYears.map((y) => ({
                id: y.id,
                name: y.name,
                isCurrent: y.isCurrent,
              }))}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recently entered</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.student.user.firstName} {m.student.user.lastName}
                    </TableCell>
                    <TableCell>{m.exam.subject.name}</TableCell>
                    <TableCell className="text-sm">{m.exam.name}</TableCell>
                    <TableCell>
                      {m.marksObtained}/{m.exam.maxMarks}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{m.grade || "—"}</Badge>
                    </TableCell>
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
