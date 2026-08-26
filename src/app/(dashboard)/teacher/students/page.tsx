import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyAssignedClasses, getMyClassStudents } from "@/lib/actions/teacher-classes";
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

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["TEACHER", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const sp = await searchParams;
  const classes = await getMyAssignedClasses();
  const classId = sp.classId || classes[0]?.classId || "";
  const result = classId
    ? await getMyClassStudents(classId)
    : { students: [], error: null };
  const selected = classes.find((c) => c.classId === classId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My class students"
        description="Students in classes assigned to you (subject teacher or class teacher)."
      />

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No class assigned yet. Ask School Admin to assign you to a subject + class under
            Academic.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <Link
                key={c.classId}
                href={`/teacher/students?classId=${c.classId}`}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                  c.classId === classId
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {c.className}
                {c.isClassTeacher ? " · CT" : ""}
              </Link>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selected?.className || "Class"} · {selected?.yearName}
                {selected?.isClassTeacher && (
                  <Badge variant="secondary" className="ml-2">
                    Class teacher
                  </Badge>
                )}
              </CardTitle>
              {selected && selected.subjects.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Subjects: {selected.subjects.map((s) => s.name).join(", ")}
                </p>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {result.error && (
                <p className="mb-3 text-sm text-red-600">{result.error}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No students in this class yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.students.map((st) => (
                      <TableRow key={st.id}>
                        <TableCell>
                          {st.user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={st.user.avatarUrl}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs">
                              {(st.user.firstName?.[0] || "") + (st.user.lastName?.[0] || "")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {st.admissionNumber}
                        </TableCell>
                        <TableCell className="font-medium">
                          {st.user.firstName} {st.user.lastName}
                        </TableCell>
                        <TableCell>{st.section?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {st.user.phone || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {st.user.email}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {classId && (
                <Link
                  href={`/teacher/attendance?classId=${classId}`}
                  className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
                >
                  Mark attendance for this class →
                </Link>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
