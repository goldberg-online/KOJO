import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getPaymentReceipt } from "@/lib/actions/fees";
import { formatGHS } from "@/lib/currency";
import { PrintButton } from "@/components/shared/print-button";

export default async function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const { id } = await params;
  const payment = await getPaymentReceipt(id);
  if (!payment) notFound();

  const inv = payment.invoice;
  const student = inv.student;
  const school = student.user.school;
  const balance = inv.totalAmount - inv.paidAmount;

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 print:p-0">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/accountant/payments" className="text-sm text-primary hover:underline">
          ← Payments
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-2xl border border-border bg-white p-6 text-foreground shadow-sm print:border-0 print:shadow-none">
        <header className="border-b border-border pb-4 text-center">
          <p className="text-lg font-bold tracking-tight">
            {school?.name || "Doorbell International School"}
          </p>
          <p className="text-xs text-muted-foreground">DIS ONLINE · Official receipt</p>
          {school?.address && (
            <p className="mt-1 text-xs text-muted-foreground">{school.address}</p>
          )}
          {school?.phone && (
            <p className="text-xs text-muted-foreground">Tel: {school.phone}</p>
          )}
        </header>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Receipt No.</span>
            <span className="font-mono font-semibold">
              {payment.receiptNumber || payment.id.slice(0, 12)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Date</span>
            <span>{new Date(payment.paidAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Billing No.</span>
            <span className="font-mono text-xs">{inv.invoiceNumber}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Academic year</span>
            <span>{inv.academicYear.name}</span>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-muted/40 p-3 text-sm">
          <p className="font-medium">
            {student.user.firstName} {student.user.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            {student.admissionNumber}
            {student.section
              ? ` · ${student.section.class.name} ${student.section.name}`
              : ""}
          </p>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1 font-medium">Description</th>
              <th className="py-1 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{formatGHS(item.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-2 font-medium">Payment received</td>
              <td className="py-2 text-right font-bold text-emerald-700">
                {formatGHS(payment.amount)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Method</span>
            <span>{String(payment.method).replace(/_/g, " ")}</span>
          </div>
          {payment.reference && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">{payment.reference}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Billing total</span>
            <span>{formatGHS(inv.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid to date</span>
            <span>{formatGHS(inv.paidAmount)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Balance</span>
            <span>{formatGHS(balance < 0 ? 0 : balance)}</span>
          </div>
        </div>

        <footer className="mt-6 border-t border-border pt-3 text-xs text-muted-foreground">
          <p>
            Received by: {payment.recordedBy.user.firstName}{" "}
            {payment.recordedBy.user.lastName}
          </p>
          <p className="mt-1">Christ is our light · Thank you</p>
        </footer>
      </article>
    </div>
  );
}
