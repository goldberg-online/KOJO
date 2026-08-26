"use client";

import { useState, useTransition } from "react";
import { recordServiceExpense } from "@/lib/actions/service-desk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Bus & feeding desk only */
const CATEGORIES = [
  { value: "FUEL", label: "Fuel" },
  { value: "FOOD_SUPPLIES", label: "Food supplies" },
  { value: "VEHICLE_REPAIR", label: "Vehicle repair" },
];

export function ServiceExpenseForm() {
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
          const res = await recordServiceExpense(fd);
          if (res?.error) setError(res.error);
          else {
            setOk(true);
            (e.target as HTMLFormElement).reset();
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="category">Category (bus & feeding)</Label>
        <select
          id="category"
          name="category"
          required
          defaultValue="FUEL"
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
        <Label>Description</Label>
        <Input name="description" required placeholder="e.g. Fuel for bus — Shell Accra" />
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && (
        <p className="text-sm text-green-600">
          Expense saved. Net totals updated (collected − expense).
        </p>
      )}
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Record expense"}
      </Button>
    </form>
  );
}
