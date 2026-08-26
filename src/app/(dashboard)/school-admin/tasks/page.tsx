import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStaffTasks } from "@/lib/actions/school-comms";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskForm } from "@/components/shared/task-form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user || !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }
  const tasks = await getStaffTasks();

  return (
    <div>
      <PageHeader
        title="Staff tasks"
        description="Assign work to teachers, students, or the accountant"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">New task</CardTitle></CardHeader>
          <CardContent><TaskForm /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Assigned tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>For</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="font-medium">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.assigneeRole.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.dueDate ? t.dueDate.toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.isDone ? "success" : "warning"}>
                        {t.isDone ? "Done" : "Open"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
