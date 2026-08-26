import { getFeeStats } from "@/lib/actions/fees";
import { getAccountantDashboardExtras } from "@/lib/actions/accountant-ops";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Wallet, TrendingUp, Bus, Receipt, Banknote, GraduationCap } from "lucide-react";
import { formatGHS } from "@/lib/currency";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function AccountantDashboard() {
  const [stats, extras] = await Promise.all([
    getFeeStats(),
    getAccountantDashboardExtras(),
  ]);

  return (
    <div>
      <PageHeader
        title="Finance desk"
        description="Tap any total for a full breakdown. Enroll students yourself — no Super Admin needed."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total fees collected"
          value={formatGHS(stats.collected)}
          icon={TrendingUp}
          tone="green"
          hint="All invoice payments"
          href="/accountant/ledger?view=collected"
        />
        <StatCard
          title="Total outstanding"
          value={formatGHS(stats.pending)}
          icon={Wallet}
          tone="rose"
          hint="Unpaid and partial balances"
          href="/accountant/ledger?view=outstanding"
        />
        <StatCard
          title="Bus fees collected"
          value={formatGHS(extras.busTotal)}
          icon={Bus}
          tone="blue"
          href="/accountant/services"
        />
        <StatCard
          title="Feeding fees collected"
          value={formatGHS(extras.feedingTotal)}
          icon={TrendingUp}
          tone="amber"
          href="/accountant/services"
        />
        <StatCard
          title="Expenses recorded"
          value={formatGHS(extras.expenseTotal)}
          icon={Receipt}
          tone="rose"
          href="/accountant/expenses"
        />
        <StatCard
          title="Salaries paid (net)"
          value={formatGHS(extras.salaryNetTotal)}
          icon={Banknote}
          tone="green"
          href="/accountant/salaries"
        />
        <StatCard
          title="Other income"
          value={formatGHS(extras.otherIncomeTotal ?? 0)}
          icon={Banknote}
          tone="blue"
          href="/accountant/other-income"
        />
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: "/accountant/students",
            title: "Enroll student + online access",
            desc: "Create student profile, DISST ID, class, email & password login — full signup",
          },
          {
            href: "/accountant/ledger?view=collected",
            title: "Balance breakdown",
            desc: "Every payment and invoice behind the totals",
          },
          {
            href: "/accountant/structures",
            title: "Fee structures",
            desc: "Tuition and fee templates in GH₵",
          },
          {
            href: "/accountant/invoices",
            title: "Billing",
            desc: "Create billings and track balances",
          },
          {
            href: "/accountant/payments",
            title: "Record payments",
            desc: "Cash, MoMo, bank — SMS + printable receipt",
          },
          {
            href: "/accountant/services",
            title: "Bus & feeding",
            desc: "Collections with date and student search",
          },
          {
            href: "/accountant/other-income",
            title: "Other income",
            desc: "Donations, grants, rentals — description + amount",
          },
          {
            href: "/accountant/expenses",
            title: "School expenses",
            desc: "Maintenance, utilities, GRA, SSNIT…",
          },
          {
            href: "/accountant/salaries",
            title: "Salaries",
            desc: "Net pay with SSNIT deduction",
          },
        ].map((item) => (
          <Link
            key={item.href + item.title}
            href={item.href}
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40 hover:shadow-soft"
          >
            <div>
              <p className="text-sm font-semibold group-hover:text-primary">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}
