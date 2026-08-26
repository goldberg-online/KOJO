"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { recordPayment } from "@/lib/actions/fees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS } from "@/lib/currency";

type InvoiceOpt = {
  id: string;
  label: string;
  remaining: number;
};

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
];

export function RecordPaymentForm({ invoices }: { invoices: InvoiceOpt[] }) {
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");

  const inv = invoices.find((i) => i.id === selected);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setReceiptNumber(null);
    setPaymentId(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await recordPayment(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccessMsg(
          res?.sms?.note ||
            "Payment recorded. SMS receipt will be sent if a phone number is on file."
        );
        if (res?.receiptNumber) setReceiptNumber(res.receiptNumber);
        if (res?.paymentId) setPaymentId(res.paymentId);
        (e.target as HTMLFormElement).reset();
        setSelected("");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="invoiceId">Billing</Label>
        <select
          id="invoiceId"
          name="invoiceId"
          required
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Select open billing</option>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label} — bal: {formatGHS(i.remaining)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (GH₵)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={inv?.remaining}
          placeholder={inv ? `Max ${formatGHS(inv.remaining)}` : ""}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="method">Payment method</Label>
        <select
          id="method"
          name="method"
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          defaultValue="CASH"
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reference">Bank / MoMo reference (optional)</Label>
        <Input id="reference" name="reference" placeholder="Txn ID" />
      </div>

      <p className="text-xs text-muted-foreground">
        A receipt number is generated automatically. You can print the receipt after saving.
        SMS is sent if a phone is on file.
      </p>

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
      )}
      {successMsg && (
        <div className="space-y-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700">
          <p>{successMsg}</p>
          {receiptNumber && (
            <p className="font-mono text-xs">Receipt No: {receiptNumber}</p>
          )}
          {paymentId && (
            <Link
              href={`/accountant/receipts/${paymentId}`}
              target="_blank"
              className="inline-flex font-semibold underline"
            >
              Open / print receipt →
            </Link>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending || invoices.length === 0}>
        {isPending ? "Saving…" : "Record payment"}
      </Button>
    </form>
  );
}
