"use client";

import { useMemo, useState, useTransition } from "react";
import { createInvoice } from "@/lib/actions/fees";
import { SCHOOL_TERMS } from "@/lib/terms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS } from "@/lib/currency";
import { isActionError } from "@/lib/utils";

type StudentOpt = { id: string; label: string };
type YearOpt = { id: string; name: string };
type StructureOpt = { id: string; name: string; amount: number; frequency?: string };

export function CreateInvoiceForm({
  students,
  years,
  structures,
}: {
  students: StudentOpt[];
  years: YearOpt[];
  structures: StructureOpt[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedStructure, setSelectedStructure] = useState("");
  const [studentId, setStudentId] = useState("");
  const [query, setQuery] = useState("");

  const structure = structures.find((s) => s.id === selectedStructure);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students.slice(0, 10);
    return students.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 12);
  }, [query, students]);

  const selectedStudent = students.find((s) => s.id === studentId);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!studentId) {
      setError("Select a student (type name to search)");
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set("studentId", studentId);
    startTransition(async () => {
      const res = await createInvoice(fd);
      if (isActionError(res)) setError(res.error);
      else {
        setSuccess(true);
        setStudentId("");
        setQuery("");
        setSelectedStructure("");
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Student</Label>
        <Input
          value={selectedStudent ? selectedStudent.label : query}
          onChange={(e) => {
            setStudentId("");
            setQuery(e.target.value);
          }}
          placeholder="Type student name…"
          autoComplete="off"
        />
        {!studentId && (
          <ul className="max-h-36 overflow-auto rounded-lg border border-border bg-card text-sm">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-muted-foreground">No match</li>
            ) : (
              matches.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left hover:bg-muted"
                    onClick={() => {
                      setStudentId(s.id);
                      setQuery(s.label);
                    }}
                  >
                    {s.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
        {studentId && (
          <p className="text-[11px] text-emerald-700">Selected — clear the box to change</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="academicYearId">Academic year</Label>
        <select
          id="academicYearId"
          name="academicYearId"
          required
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Select year</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="term">Term</Label>
        <select
          id="term"
          name="term"
          required
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          defaultValue="1st Term"
        >
          {SCHOOL_TERMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="feeStructureId">Fee structure</Label>
        <select
          id="feeStructureId"
          name="feeStructureId"
          required
          value={selectedStructure}
          onChange={(e) => setSelectedStructure(e.target.value)}
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Select fee</option>
          {structures.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.frequency ? ` · ${s.frequency}` : ""} ({formatGHS(s.amount)})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount GH₵ (optional override)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder={structure ? String(structure.amount) : "Uses structure amount"}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dueDate">Due date</Label>
        <Input id="dueDate" name="dueDate" type="date" required />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">Billing created.</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating…" : "Create billing"}
      </Button>
    </form>
  );
}
