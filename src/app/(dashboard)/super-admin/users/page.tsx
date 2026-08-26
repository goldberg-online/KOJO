import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUsersForSchool } from "@/lib/actions/users";
import { getParentsAndStudentsForLinking } from "@/lib/actions/users";
import { CreateUserForm } from "@/components/shared/create-user-form";
import { LinkParentForm } from "@/components/shared/link-parent-form";
import { UsersTable } from "@/components/shared/users-table";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SuperAdminUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const [users, schools, linkData] = await Promise.all([
    getUsersForSchool(),
    prisma.school.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    getParentsAndStudentsForLinking(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Allocate logins"
        description="Create role logins for Doorbell International School. Each button below opens tools in this page — fill the form and submit."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-primary/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Create login</CardTitle>
            <p className="text-xs text-muted-foreground">
              Choose school → role (Service Officer, Accountant, School Admin, Teacher, Parent)
              → name, email, password.
            </p>
          </CardHeader>
          <CardContent>
            <CreateUserForm schools={schools} isSuperAdmin />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Link parent → student</CardTitle>
            <p className="text-xs text-muted-foreground">
              Required so parents see children fees/grades without a student phone.
            </p>
          </CardHeader>
          <CardContent>
            <LinkParentForm parents={linkData.parents} students={linkData.students} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All accounts ({users.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Use <strong>Manage</strong> on each row: Activate / Deactivate, or open{" "}
            <strong>Reset password</strong> inside the same row.
          </p>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
