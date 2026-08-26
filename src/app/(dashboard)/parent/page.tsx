import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getParentChildrenOverview } from "@/lib/actions/parent-portal";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/currency";
import {
  Users,
  ClipboardList,
  FileText,
  Wallet,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

const feeBadge: Record<string, string> = {
  PAID: "bg-emerald-500/15 text-emerald-700",
  PARTIAL: "bg-amber-500/15 text-amber-800",
  UNPAID: "bg-rose-500/15 text-rose-700",
  NO_INVOICE: "bg-muted text-muted-foreground",
};

export default async function ParentDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") redirect("/login");

  const children = await getParentChildrenOverview();
  const totalBalance = children.reduce((a, c) => a + c.balance, 0);
  const totalPaid = children.reduce((a, c) => a + c.totalPaid, 0);
  const marksCount = children.reduce((a, c) => a + c.marks.length, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hello, ${session.user.name?.split(" ")[0] || "Parent"}`}
        description="You manage school access for your child(ren). Use this portal instead of a student phone login."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Children"
          value={children.length}
          icon={Users}
          tone="green"
          hint="Linked student profiles"
        />
        <StatCard
          title="Outstanding fees"
          value={formatGHS(totalBalance)}
          icon={Wallet}
          tone="rose"
          hint="All children · GH₵"
        />
        <StatCard
          title="Total paid"
          value={formatGHS(totalPaid)}
          icon={ClipboardList}
          tone="blue"
          hint="Recorded payments"
        />
        <StatCard
          title="Recent grades"
          value={marksCount}
          icon={FileText}
          tone="amber"
          hint="Latest mark entries"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/parent/fees"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/30 hover:shadow-soft"
        >
          <div>
            <p className="text-sm font-semibold">Fees & payments</p>
            <p className="text-xs text-muted-foreground">
              Invoices, balances, and history for every child
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          href="/parent/children"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/30 hover:shadow-soft"
        >
          <div>
            <p className="text-sm font-semibold">Children profiles</p>
            <p className="text-xs text-muted-foreground">
              Class, student ID, grades — full student view
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Your children</h2>
        {children.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No students linked to this parent account yet. Ask the school to link your
              child(ren).
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {children.map((c) => (
              <Card key={c.studentId}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {c.firstName} {c.lastName}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {c.admissionNumber} · {c.className}
                        {c.sectionName !== "—" ? ` ${c.sectionName}` : ""}
                        {c.relation ? ` · ${c.relation}` : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        feeBadge[c.feeStatus] || feeBadge.NO_INVOICE
                      }`}
                    >
                      {c.feeStatus.replace("_", " ")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billed</span>
                    <span>{formatGHS(c.totalBilled)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid</span>
                    <span>{formatGHS(c.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Balance</span>
                    <span>{formatGHS(c.balance)}</span>
                  </div>
                  <Link
                    href="/parent/fees"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    Open fee details
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
