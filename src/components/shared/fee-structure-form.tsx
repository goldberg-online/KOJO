"use client";

import { useState, useTransition } from "react";
import { createFeeStructure } from "@/lib/actions/fees";
import { FEE_FREQUENCIES } from "@/lib/terms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isActionError } from "@/lib/utils";

type SectionOption = {
  id: string;
  name: string;
  className: string;
};

export function FeeStructureForm({ sections }: { sections: SectionOption[] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createFeeStructure(fd);
      if (isActionError(res)) setError(res.error);
      else {
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Fee name</Label>
        <Input id="name" name="name" placeholder="Tuition / PTA / Exam" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (GH₵)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 1500.00"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="frequency">Term / period</Label>
        <select
          id="frequency"
          name="frequency"
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          defaultValue="1st Term"
        >
          {FEE_FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          Use 1st Term, 2nd Term, or 3rd Term for term fees.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sectionId">Section (optional)</Label>
        <select
          id="sectionId"
          name="sectionId"
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">All sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.className} – {s.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">Fee structure saved.</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : "Save fee structure"}
      </Button>
    </form>
  );
}
