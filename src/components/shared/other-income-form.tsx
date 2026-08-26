"use client";

import { useState, useTransition } from "react";
import { recordOtherIncome } from "@/lib/actions/accountant-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isActionError } from "@/lib/utils";

export function OtherIncomeForm() {
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
          const res = await recordOtherIncome(fd);
          if (isActionError(res)) setError(res.error);
          else {
            setOk(true);
            (e.target as HTMLFormElement).reset();
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          required
          placeholder="e.g. Donation, hall rental, grant…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (GH₵)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="incomeDate">Date</Label>
        <Input
          id="incomeDate"
          name="incomeDate"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" placeholder="Reference / payer" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-emerald-700">Income recorded.</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Record income"}
      </Button>
    </form>
  );
}
