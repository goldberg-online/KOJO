import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MATRIX: {
  capability: string;
  roles: Record<string, boolean | string>;
}[] = [
  {
    capability: "Allocate user logins",
    roles: { SUPER_ADMIN: true, SCHOOL_ADMIN: true, ACCOUNTANT: "Enroll students only", TEACHER: false, STUDENT: false, PARENT: false },
  },
  {
    capability: "View all schools finance",
    roles: { SUPER_ADMIN: true, SCHOOL_ADMIN: false, ACCOUNTANT: "Own school", TEACHER: false, STUDENT: false, PARENT: false },
  },
  {
    capability: "Record fee payments",
    roles: { SUPER_ADMIN: true, SCHOOL_ADMIN: false, ACCOUNTANT: true, TEACHER: false, STUDENT: false, PARENT: false },
  },
  {
    capability: "Manage academics (classes/years)",
    roles: { SUPER_ADMIN: true, SCHOOL_ADMIN: true, ACCOUNTANT: false, TEACHER: false, STUDENT: false, PARENT: false },
  },
  {
    capability: "Enter exam marks",
    roles: { SUPER_ADMIN: true, SCHOOL_ADMIN: false, ACCOUNTANT: false, TEACHER: true, STUDENT: false, PARENT: false },
  },
  {
    capability: "View own / child fees",
    roles: { SUPER_ADMIN: true, SCHOOL_ADMIN: false, ACCOUNTANT: true, TEACHER: false, STUDENT: true, PARENT: true },
  },
  {
    capability: "Expenses & salaries (SSNIT)",
    roles: { SUPER_ADMIN: true, SCHOOL_ADMIN: false, ACCOUNTANT: true, SERVICE_OFFICER: false, TEACHER: false, STUDENT: false, PARENT: false },
  },
  {
    capability: "Bus & feeding fees only",
    roles: { SUPER_ADMIN: true, SCHOOL_ADMIN: false, ACCOUNTANT: true, SERVICE_OFFICER: true, TEACHER: false, STUDENT: false, PARENT: false },
  },
  {
    capability: "Announcements & tasks",
    roles: { SUPER_ADMIN: true, SCHOOL_ADMIN: true, ACCOUNTANT: false, TEACHER: false, STUDENT: false, PARENT: false },
  },
];

const ROLE_COLS = ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT", "SERVICE_OFFICER", "TEACHER", "STUDENT", "PARENT"] as const;

function cell(v: boolean | string) {
  if (v === true) return <span className="text-emerald-600 font-semibold">Yes</span>;
  if (v === false) return <span className="text-muted-foreground">—</span>;
  return <span className="text-xs text-amber-700">{v}</span>;
}

export default async function AccessMatrixPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authorize access"
        description="What each role can do. Allocate logins only for the access each person needs."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role capability matrix</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Capability</th>
                {ROLE_COLS.map((r) => (
                  <th key={r} className="pb-2 pr-2 font-medium text-xs">
                    {r.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.capability} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{row.capability}</td>
                  {ROLE_COLS.map((r) => (
                    <td key={r} className="py-2.5 pr-2">
                      {cell(row.roles[r] ?? false)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/super-admin/users"
          className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Allocate logins
        </Link>
        <Link
          href="/super-admin"
          className="inline-flex rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
