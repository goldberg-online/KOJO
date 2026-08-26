"use client";

import { useState, useTransition } from "react";
import {
  updateOtherIncome,
  softDeleteOtherIncome,
} from "@/lib/actions/accountant-ops";
import { isActionError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EditOtherIncomeForm({
  id,
  description,
  amount,
  notes,
}: {
  id: string;
  description: string;
  amount: number;
  notes: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Edit
      </Button>
    );
  }

  return (
    <form
      className="space-y-2 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        fd.set("id", id);
        start(async () => {
          const res = await updateOtherIncome(fd);
          if (isActionError(res)) setError(res.error);
          else setOpen(false);
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Input name="description" defaultValue={description} required />
      <Input
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        defaultValue={amount}
        required
      />
      <Input name="notes" defaultValue={notes || ""} placeholder="Notes" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-1">
        <Button type="submit" size="sm" disabled={pending}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-red-600"
          disabled={pending}
          onClick={() => {
            const fd = new FormData();
            fd.set("id", id);
            start(async () => {
              const res = await softDeleteOtherIncome(fd);
              if (isActionError(res)) setError(res.error);
            });
          }}
        >
          Remove
        </Button>
      </div>
    </form>
  );
}
