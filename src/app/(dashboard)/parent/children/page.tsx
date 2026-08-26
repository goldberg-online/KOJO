import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getParentChildrenOverview } from "@/lib/actions/parent-portal";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGHS } from "@/lib/currency";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ParentChildrenPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/login");

  const children = await getParentChildrenOverview();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Children (student view)"
          description="Parents use this page on behalf of students who do not have phone access. Same school information the student portal shows."
        />
        <Link
          href="/parent/fees"
          className="text-sm font-medium text-primary hover:underline"
        >
          Open fees →
        </Link>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No students linked. Contact the school office.
          </CardContent>
        </Card>
      ) : (
        children.map((c) => (
          <Card key={c.studentId}>
            <CardHeader>
              <CardTitle className="text-base">
                {c.firstName} {c.lastName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                ID {c.admissionNumber} · {c.className}
                {c.sectionName !== "—" ? ` · Section ${c.sectionName}` : ""} ·{" "}
                {c.relation || "Guardian"}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Email (school record)</p>
                  <p className="font-medium break-all">{c.email}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Phone on file</p>
                  <p className="font-medium">{c.phone || "—"}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Fee balance</p>
                  <p className="font-medium">{formatGHS(c.balance)}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {c.isActive ? "Active" : "Inactive"} ·{" "}
                    {c.feeStatus.replace("_", " ")}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Recent grades</h3>
                {c.marks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No marks entered yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {c.marks.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm">{m.exam.name}</TableCell>
                          <TableCell className="text-sm">
                            {m.exam.subject?.name ?? "—"}
                          </TableCell>
                          <TableCell className="font-medium">{m.marksObtained}</TableCell>
                          <TableCell>{m.grade || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
