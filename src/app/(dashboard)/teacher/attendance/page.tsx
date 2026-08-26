import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getMyAssignedClasses,
  getClassAttendance,
} from "@/lib/actions/teacher-classes";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceForm } from "@/components/shared/attendance-form";

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["TEACHER", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const sp = await searchParams;
  const classes = await getMyAssignedClasses();
  const classId = sp.classId || classes[0]?.classId || "";
  const date =
    sp.date || new Date().toISOString().slice(0, 10);

  const data = classId
    ? await getClassAttendance(classId, date)
    : { students: [], records: {}, error: "Select a class" };

  const selected = classes.find((c) => c.classId === classId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Mark present, absent, late, half day, or excused for your assigned classes."
      />

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No assigned classes. School Admin must assign you to a subject and classroom under
            Academic.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <Link
                key={c.classId}
                href={`/teacher/attendance?classId=${c.classId}&date=${date}`}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                  c.classId === classId
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {c.className}
              </Link>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selected?.className || "Class"} · {date}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.error && (
                <p className="mb-3 text-sm text-red-600">{data.error}</p>
              )}
              {classId && (
                <AttendanceForm
                  classId={classId}
                  date={date}
                  students={data.students}
                  records={data.records}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
