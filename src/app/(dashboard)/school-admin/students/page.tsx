import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentsWithFees } from "@/lib/actions/academic";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGHS } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusStyle: Record<string, string> = {
  PAID: "bg-emerald-500/15 text-emerald-700",
  PARTIAL: "bg-amber-500/15 text-amber-800",
  UNPAID: "bg-rose-500/15 text-rose-700",
  NO_INVOICE: "bg-muted text-muted-foreground",
};

export default async function SchoolAdminStudentsPage() {
  const session = await auth();
  if (!session?.user || !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const students = await getStudentsWithFees();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students (view only)"
        description="Full student directory for School Admin. You can view data and fee status — not edit or enroll. Enrollment is Accountant only."
      />

      <div className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        View only · Assign teachers under{" "}
        <Link href="/school-admin/academic" className="font-medium text-primary underline">
          Academic
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All students ({students.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Gender / DOB</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Fee status</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    No students yet. Accountant enrolls with auto ID DISST01…
                  </TableCell>
                </TableRow>
              ) : (
                students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.avatarUrl}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs">
                          {(s.firstName?.[0] || "") + (s.lastName?.[0] || "")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">
                      {s.admissionNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {s.firstName} {s.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                      {s.notes && (
                        <div className="text-[11px] text-muted-foreground">Note: {s.notes}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.className}
                      {s.sectionName !== "—" ? ` · ${s.sectionName}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.gender || "—"}
                      <br />
                      {s.dateOfBirth
                        ? new Date(s.dateOfBirth).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{s.phone || "—"}</TableCell>
                    <TableCell className="max-w-[10rem] truncate text-xs text-muted-foreground">
                      {s.address || "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusStyle[s.feeStatus] || statusStyle.NO_INVOICE
                        }`}
                      >
                        {s.feeStatus.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{formatGHS(s.balance)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
