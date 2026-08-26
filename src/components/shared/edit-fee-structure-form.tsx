"use client";

import { useState, useTransition } from "react";
import {
  updateFeeStructure,
  softDeleteFeeStructure,
} from "@/lib/actions/fees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EditFeeStructureForm({
  id,
  name,
  amount,
  frequency,
}: {
  id: string;
  name: string;
  amount: number;
  frequency: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <div className="flex justify-end gap-1">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          Edit
        </Button>
      </div>
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
          const res = await updateFeeStructure(fd);
          if (res?.error) setError(res.error);
          else setOpen(false);
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Input name="name" defaultValue={name} required />
      <Input name="amount" type="number" step="0.01" min="0" defaultValue={amount} required />
      <select
        name="frequency"
        defaultValue={frequency}
        className="flex h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
      >
        <option value="1st Term">1st Term</option>
        <option value="2nd Term">2nd Term</option>
        <option value="3rd Term">3rd Term</option>
        <option value="Full year">Full year</option>
        <option value="Monthly">Monthly</option>
        <option value="One-time">One-time</option>
        <option value="Termly">Termly (legacy)</option>
      </select>
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
              const res = await softDeleteFeeStructure(fd);
              if (res?.error) setError(res.error);
            });
          }}
        >
          Remove
        </Button>
      </div>
    </form>
  );
}
