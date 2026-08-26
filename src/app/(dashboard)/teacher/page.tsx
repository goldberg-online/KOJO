import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyAssignedClasses } from "@/lib/actions/teacher-classes";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { FileText, ClipboardList, GraduationCap, ArrowRight } from "lucide-react";

export default async function TeacherDashboard() {
  const session = await auth();
  if (!session?.user || !["TEACHER", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const classes = await getMyAssignedClasses();

  return (
    <div>
      <PageHeader
        title={`Hello, ${session.user.name?.split(" ")[0] || "Teacher"}`}
        description="Your assigned classes — students, attendance, and marks"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Assigned classes"
          value={classes.length}
          icon={GraduationCap}
          tone="green"
          href="/teacher/students"
        />
        <StatCard
          title="Attendance"
          value="Open"
          icon={ClipboardList}
          tone="blue"
          href="/teacher/attendance"
        />
        <StatCard
          title="Marks"
          value="Open"
          icon={FileText}
          tone="amber"
          href="/teacher/marks"
        />
      </div>

      <div className="mt-6 space-y-3">
        {[
          {
            href: "/teacher/students",
            title: "Class student list",
            desc: "View students in classes assigned to you",
          },
          {
            href: "/teacher/attendance",
            title: "Mark attendance",
            desc: "Present, absent, late, half day, excused",
          },
          {
            href: "/teacher/marks",
            title: "Enter marks",
            desc: "Record exam and test scores",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/30"
          >
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {classes.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold">Your classes</h2>
          <ul className="space-y-2 text-sm">
            {classes.map((c) => (
              <li key={c.classId} className="rounded-xl border border-border px-3 py-2">
                <span className="font-medium">{c.className}</span>
                <span className="text-muted-foreground"> · {c.yearName}</span>
                {c.subjects.length > 0 && (
                  <span className="block text-xs text-muted-foreground">
                    {c.subjects.map((s) => s.name).join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
