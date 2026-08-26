import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Users, GraduationCap, BookOpen, ClipboardList, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function SchoolAdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  // Super admin may have no schoolId — show platform aggregates
  const schoolId = session.user.schoolId;
  const userWhere = schoolId
    ? { schoolId, deletedAt: null }
    : { deletedAt: null };
  const studentWhere = schoolId
    ? { user: { schoolId, deletedAt: null }, deletedAt: null }
    : { deletedAt: null, user: { deletedAt: null } };
  const teacherWhere = schoolId
    ? { user: { schoolId, deletedAt: null }, deletedAt: null }
    : { deletedAt: null, user: { deletedAt: null } };
  const classWhere = schoolId
    ? { schoolId, deletedAt: null }
    : { deletedAt: null };

  const [users, students, teachers, classes] = await Promise.all([
    prisma.user.count({ where: userWhere }),
    prisma.student.count({ where: studentWhere }),
    prisma.teacher.count({ where: teacherWhere }),
    prisma.class.count({ where: classWhere }),
  ]);

  const school = schoolId
    ? await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true },
      })
    : { name: "All schools (Super Admin view)" };

  const shortcuts = [
    { href: "/school-admin/users", title: "Teachers & students", desc: "Manage staff and learners", icon: Users },
    { href: "/school-admin/academic", title: "Academic structure", desc: "Years, classes Creche–JHS", icon: GraduationCap },
    { href: "/school-admin/tasks", title: "Assign tasks", desc: "Tasks for teachers, students, accountant", icon: ClipboardList },
    { href: "/school-admin/announcements", title: "Announcements", desc: "Message staff and students", icon: BookOpen },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome${session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}`}
        description={
          school?.name
            ? `${school.name} · Focus on teachers, students, tasks & announcements`
            : "School administration"
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Users" value={users} icon={Users} tone="green" />
        <StatCard title="Students" value={students} icon={GraduationCap} tone="blue" />
        <StatCard title="Teachers" value={teachers} icon={BookOpen} tone="amber" />
        <StatCard title="Classes" value={classes} icon={ClipboardList} tone="rose" />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Quick actions</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {shortcuts.map(({ href, title, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/30 hover:shadow-soft"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
