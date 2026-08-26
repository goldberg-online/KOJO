"use client";

import { useState, useTransition } from "react";
import { recordExpense } from "@/lib/actions/accountant-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Accountant school expenses (not bus/feeding desk) */
const CATEGORIES = [
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "STAFF_ALLOWANCE", label: "Staff allowance" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "OTHER", label: "Other" },
  { value: "POWER", label: "Power / electricity" },
  { value: "GRA_TAX", label: "GRA tax" },
  { value: "SSNIT", label: "SSNIT" },
];

export function ExpenseForm() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(false);
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await recordExpense(fd);
          if (res?.error) setError(res.error);
          else {
            setOk(true);
            (e.target as HTMLFormElement).reset();
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label>Category (accountant)</Label>
        <select
          name="category"
          required
          defaultValue="MAINTENANCE"
          className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Amount (GH₵)</Label>
        <Input name="amount" type="number" step="0.01" min="0.01" required />
      </div>
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input
          name="expenseDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input name="description" placeholder="Optional details" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">Expense saved.</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Record expense"}
      </Button>
    </form>
  );
}
