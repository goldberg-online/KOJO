import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { ClipboardList, FileText, BookOpen, Wallet, ArrowRight } from "lucide-react";

export default async function StudentDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  return (
    <div>
      <PageHeader
        title={`Hello, ${session.user.name?.split(" ")[0] || "Student"}`}
        description="Your academic overview and fee status"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Attendance" value="Soon" icon={ClipboardList} tone="green" />
        <StatCard title="Grades" value="Soon" icon={FileText} tone="amber" />
        <StatCard title="Assignments" value="Soon" icon={BookOpen} tone="blue" />
        <StatCard title="Fees" value="Open" icon={Wallet} tone="rose" hint="View invoices" />
      </div>
      <Link
        href="/student/fees"
        className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/30 hover:shadow-soft"
      >
        <div>
          <p className="text-sm font-semibold">View my fees</p>
          <p className="text-xs text-muted-foreground">Invoices, balances, and payment history in GH₵</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
