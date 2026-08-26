import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUsersForSchool } from "@/lib/actions/users";
import { UsersTable } from "@/components/shared/users-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export default async function SchoolAdminUsersPage() {
  const session = await auth();
  if (!session?.user || !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const users = await getUsersForSchool();
  const isSchoolAdmin = session.user.role === "SCHOOL_ADMIN";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Teachers & staff"
        description={
          isSchoolAdmin
            ? "View staff accounts. You do not enroll users — Super Admin allocates logins. Assign subjects and classes under Academic."
            : "Manage school users and logins."
        }
      />

      {isSchoolAdmin && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">School Admin role</p>
          <ul className="mt-1 list-inside list-disc text-xs text-amber-900">
            <li>Cannot enroll students or create logins</li>
            <li>
              Assign teachers to subjects and classrooms under{" "}
              <Link href="/school-admin/academic" className="font-semibold underline">
                Academic & assign
              </Link>
            </li>
            <li>Logins are created by Super Admin</li>
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff directory ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
