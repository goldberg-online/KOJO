"use client";

import { useMemo, useState, useTransition } from "react";
import { recordServiceCollection } from "@/lib/actions/accountant-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isActionError } from "@/lib/utils";

type StudentOpt = { id: string; label: string };

export function ServiceCollectionForm({
  students,
}: {
  students: StudentOpt[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"BUS" | "FEEDING" | "BOTH">("BOTH");
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [busAmount, setBusAmount] = useState("");
  const [feedingAmount, setFeedingAmount] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students.slice(0, 8);
    return students
      .filter((s) => s.label.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, students]);

  const selected = students.find((s) => s.id === studentId);

  const dayPreview = useMemo(() => {
    const b = mode === "FEEDING" ? 0 : parseFloat(busAmount) || 0;
    const f = mode === "BUS" ? 0 : parseFloat(feedingAmount) || 0;
    return b + f;
  }, [mode, busAmount, feedingAmount]);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(null);
        const fd = new FormData(e.currentTarget);
        fd.set("mode", mode);
        fd.set("studentId", studentId);
        fd.set("busAmount", busAmount);
        fd.set("feedingAmount", feedingAmount);
        start(async () => {
          const res = await recordServiceCollection(fd);
          if (isActionError(res)) setError(res.error);
          else {
            setOk(
              res?.recorded === 2
                ? "Bus and feeding recorded."
                : "Collection recorded."
            );
            setBusAmount("");
            setFeedingAmount("");
            setQuery("");
            setStudentId("");
            (e.target as HTMLFormElement).reset();
            setMode("BOTH");
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label>Payment type</Label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "BUS" | "FEEDING" | "BOTH")}
          className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
        >
          <option value="FEEDING">Feeding only</option>
          <option value="BUS">Bus only</option>
          <option value="BOTH">Both (bus + feeding)</option>
        </select>
      </div>

      {(mode === "BUS" || mode === "BOTH") && (
        <div className="space-y-1.5">
          <Label>Bus fee (GH₵)</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={busAmount}
            onChange={(e) => setBusAmount(e.target.value)}
            placeholder="0.00"
            required={mode === "BUS" || mode === "BOTH"}
          />
        </div>
      )}

      {(mode === "FEEDING" || mode === "BOTH") && (
        <div className="space-y-1.5">
          <Label>Feeding fee (GH₵)</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={feedingAmount}
            onChange={(e) => setFeedingAmount(e.target.value)}
            placeholder="0.00"
            required={mode === "FEEDING" || mode === "BOTH"}
          />
        </div>
      )}

      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2 text-sm">
        This entry total:{" "}
        <span className="font-semibold">
          GH₵{dayPreview.toFixed(2)}
        </span>
      </div>

      <div className="space-y-1.5">
        <Label>Student (type name to search)</Label>
        <Input
          value={selected && !query ? selected.label : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setStudentId("");
          }}
          placeholder="Start typing student name…"
          autoComplete="off"
        />
        {query.trim() && !studentId && (
          <ul className="max-h-40 overflow-auto rounded-xl border border-border bg-card shadow-sm">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">No student found</li>
            ) : (
              matches.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setStudentId(s.id);
                      setQuery("");
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
          <p className="text-xs text-emerald-700">
            Selected — clear search to change
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                setStudentId("");
                setQuery("");
              }}
            >
              Clear
            </button>
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          {students.length} students in system. Leave empty for general/batch total.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input
          name="collectionDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input name="notes" placeholder="Optional" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">{ok}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Record collection"}
      </Button>
    </form>
  );
}
