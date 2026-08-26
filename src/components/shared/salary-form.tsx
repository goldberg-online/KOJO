"use client";

import { useMemo, useState, useTransition } from "react";
import { recordSalary } from "@/lib/actions/accountant-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS } from "@/lib/currency";
import { isActionError } from "@/lib/utils";

export function SalaryForm() {
  const [gross, setGross] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const preview = useMemo(() => {
    const g = parseFloat(gross);
    if (isNaN(g) || g <= 0) return null;
    const ssnit = Math.round(g * 0.055 * 100) / 100;
    const net = Math.round((g - ssnit) * 100) / 100;
    return { ssnit, net };
  }, [gross]);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(null);
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await recordSalary(fd);
          if (isActionError(res)) setError(res.error);
          else {
            setOk(
              `Saved. SSNIT ${formatGHS(res.ssnitDeduction ?? 0)} · Net ${formatGHS(res.netAmount ?? 0)}`
            );
            (e.target as HTMLFormElement).reset();
            setGross("");
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label>Employee name</Label>
        <Input name="employeeName" required placeholder="Full name" />
      </div>
      <div className="space-y-1.5">
        <Label>Gross salary (GH₵)</Label>
        <Input
          name="grossAmount"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={gross}
          onChange={(e) => setGross(e.target.value)}
        />
      </div>
      {preview && (
        <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
          <p>SSNIT (5.5%): <strong>{formatGHS(preview.ssnit)}</strong></p>
          <p>Net after deduction: <strong>{formatGHS(preview.net)}</strong></p>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Payment date</Label>
        <Input name="paymentDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input name="notes" placeholder="Optional" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">{ok}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Record salary payment"}
      </Button>
    </form>
  );
}
