import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/actions/profile";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "@/components/shared/change-password-form";
import { ProfileEditForm } from "@/components/shared/profile-edit-form";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="My profile"
        description="View and edit your DIS ONLINE account. Password changes apply immediately."
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">
              {profile.firstName} {profile.lastName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <Badge variant="secondary">{profile.role.replace(/_/g, " ")}</Badge>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">School</p>
            <p className="font-medium">
              {profile.school
                ? `${profile.school.name} (${profile.school.code})`
                : profile.role === "SUPER_ADMIN"
                  ? "Platform (all schools)"
                  : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium">{profile.isActive ? "Active" : "Inactive"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last login</p>
            <p className="font-medium">
              {profile.lastLoginAt
                ? new Date(profile.lastLoginAt).toLocaleString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="font-medium">{profile.phone || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditForm
            firstName={profile.firstName}
            lastName={profile.lastName}
            phone={profile.phone}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
