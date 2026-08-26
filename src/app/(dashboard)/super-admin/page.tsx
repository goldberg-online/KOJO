import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getPlatformOverview,
  getPlatformFinance,
  getSchoolsForSelect,
  getSetupChecklist,
  getHealthAlerts,
  getRecentActivity,
} from "@/lib/actions/super-admin";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SchoolSwitcher } from "@/components/shared/school-switcher";
import { formatGHS } from "@/lib/currency";
import {
  UserCheck,
  BookOpen,
  ClipboardList,
  GraduationCap,
  School,
  Users,
  Wallet,
  TrendingUp,
  Shield,
  Calculator,
  FileText,
  UserPlus,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Activity,
  KeyRound,
} from "lucide-react";

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const sp = await searchParams;
  const schoolId = sp.schoolId || null;

  const [overview, finance, schools, checklist, alerts, activity] =
    await Promise.all([
      getPlatformOverview(),
      getPlatformFinance(schoolId),
      getSchoolsForSelect(),
      getSetupChecklist(schoolId),
      getHealthAlerts(schoolId),
      getRecentActivity(schoolId),
    ]);

  const selectedSchool = schoolId
    ? schools.find((s) => s.id === schoolId)
    : null;

  const operate = [
    {
      href: "/super-admin/users",
      title: "Allocate logins",
      desc: "Create teacher, accountant, student, parent, school admin accounts",
      icon: UserPlus,
      tone: "bg-violet-500/10 text-violet-700",
    },
    {
      href: "/super-admin/access",
      title: "Authorize access",
      desc: "See what each role can do before assigning logins",
      icon: KeyRound,
      tone: "bg-slate-500/10 text-slate-700",
    },
    {
      href: "/accountant",
      title: "Finance desk",
      desc: "Fees, invoices, payments, expenses & salaries",
      icon: Calculator,
      tone: "bg-emerald-500/10 text-emerald-700",
    },
  ];

  const inspect = [
    {
      href: "/school-admin",
      title: "School Admin workspace",
      desc: "Users, academics, tasks, announcements",
      icon: Shield,
      tone: "bg-blue-500/10 text-blue-700",
    },
    {
      href: "/teacher",
      title: "Teacher workspace",
      desc: "Marks and class tools (preview)",
      icon: FileText,
      tone: "bg-amber-500/10 text-amber-700",
    },
    {
      href: "/super-admin/teachers",
      title: "Teachers list",
      desc: "All teaching staff across schools",
      icon: BookOpen,
      tone: "bg-indigo-500/10 text-indigo-700",
    },
    {
      href: "/super-admin/students",
      title: "Students list",
      desc: "Enrollment and student records",
      icon: GraduationCap,
      tone: "bg-rose-500/10 text-rose-700",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="DIS ONLINE control centre"
          description={
            selectedSchool
              ? `Viewing ${selectedSchool.name}. Full access across roles, finance, and user allocation.`
              : `Welcome, ${session.user.name}. All schools · allocate logins · finance · authorize access.`
          }
        />
        <Suspense fallback={null}>
          <SchoolSwitcher schools={schools} selectedId={schoolId || undefined} />
        </Suspense>
      </div>

      {/* Setup checklist */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Setup checklist</h2>
          <span className="text-xs font-medium text-muted-foreground">
            {checklist.completed}/{checklist.total} complete · {checklist.percent}%
          </span>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${checklist.percent}%` }}
          />
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {checklist.steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition hover:bg-muted/60"
              >
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className={step.done ? "text-muted-foreground line-through" : "font-medium"}>
                  {step.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Health alerts */}
      {alerts.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Health alerts
          </h2>
          <div className="space-y-2">
            {alerts.map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition hover:shadow-sm ${
                  a.severity === "high"
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : a.severity === "medium"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-border bg-muted/40 text-foreground"
                }`}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{a.message}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Finance */}
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          Finance {selectedSchool ? `· ${selectedSchool.name}` : "· all schools"} (GH₵)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total collected"
            value={formatGHS(finance.collected)}
            icon={Wallet}
            tone="green"
            hint="Tap for payment breakdown"
            href="/accountant/ledger?view=collected"
          />
          <StatCard
            title="Outstanding balance"
            value={formatGHS(finance.outstanding)}
            icon={TrendingUp}
            tone="rose"
            hint="Tap for invoice balances"
            href="/accountant/ledger?view=outstanding"
          />
          <StatCard
            title="Billings"
            value={finance.invoiceCount}
            icon={FileText}
            tone="blue" href="/accountant/invoices"
          />
          <StatCard
            title="Payment records"
            value={finance.paymentCount}
            icon={ClipboardList}
            tone="amber" href="/accountant/payments"
          />
        </div>
        {finance.collected === 0 && finance.invoiceCount === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            No fees yet. Allocate an accountant login, create a fee structure, then record the first payment.
          </p>
        )}
        <div className="mt-3">
          <Link
            href="/accountant"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Calculator className="h-4 w-4" />
            Open Accountant workspace
          </Link>
        </div>
      </section>

      {/* Operate vs Inspect */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-1 text-sm font-semibold tracking-tight">Operate</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Day-to-day platform actions you own as Super Admin.
          </p>
          <div className="grid gap-3">
            {operate.map(({ href, title, desc, icon: Icon, tone }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40 hover:shadow-soft"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold tracking-tight group-hover:text-primary">{title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-sm font-semibold tracking-tight">Inspect</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Preview role workspaces and records. Daily teaching still belongs to teachers.
          </p>
          <div className="grid gap-3">
            {inspect.map(({ href, title, desc, icon: Icon, tone }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-start gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4 transition hover:border-primary/40 hover:bg-card"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold tracking-tight group-hover:text-primary">{title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Activity */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Activity className="h-4 w-4" />
          Recent activity
        </h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No logins or payments yet. Activity will appear here as you allocate accounts and record fees.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <ul className="divide-y divide-border">
              {activity.map((item) => (
                <li key={item.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm">{item.summary}</p>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(item.at).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Platform stats */}
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">DIS overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard title="Total enrollment" value={overview.enrollment} icon={UserCheck} tone="green" href="/super-admin/students" />
          <StatCard title="Teachers" value={overview.teachers} icon={BookOpen} tone="blue" href="/super-admin/teachers" />
          <StatCard title="Classes" value={overview.classes} icon={ClipboardList} tone="amber" href="/super-admin/classes" />
          <StatCard title="Students" value={overview.students} icon={GraduationCap} tone="rose" href="/super-admin/students" />
          <StatCard title="Schools" value={overview.schools} icon={School} tone="green" href="/super-admin/users" />
          <StatCard
            title="Total accounts"
            value={overview.totalUsers}
            icon={Users}
            tone="blue"
            hint={`${overview.activeUsers} active · ${overview.accountants} accountants`}
            href="/super-admin/users"
          />
        </div>
      </section>

      {/* Schools table */}
      {overview.schoolsList.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Schools</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Users</th>
                  <th className="px-4 py-3 font-medium">Classes</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.schoolsList.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/super-admin?schoolId=${s.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.code}</td>
                    <td className="px-4 py-3">{s._count.users}</td>
                    <td className="px-4 py-3">{s._count.classes}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.isActive
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "bg-rose-500/15 text-rose-700"
                        }`}
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
