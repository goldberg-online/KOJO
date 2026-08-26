import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAnnouncements } from "@/lib/actions/school-comms";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnnouncementForm } from "@/components/shared/announcement-form";

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user || !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }
  const rows = await getAnnouncements();

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Send general messages to accountant, teachers, students, or everyone"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">New announcement</CardTitle></CardHeader>
          <CardContent><AnnouncementForm /></CardContent>
        </Card>
        <div className="space-y-3 lg:col-span-2">
          {rows.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No announcements yet.
              </CardContent>
            </Card>
          ) : (
            rows.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{a.title}</h3>
                    <Badge variant="secondary">{a.audience}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {a.author.firstName} {a.author.lastName} ·{" "}
                    {a.createdAt.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
