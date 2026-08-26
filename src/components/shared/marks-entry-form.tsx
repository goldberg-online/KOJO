"use client";

import { useState, useTransition } from "react";
import { createExamAndEnterMark } from "@/lib/actions/teacher-marks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MarksEntryForm({
  subjects,
  students,
  years,
}: {
  subjects: { id: string; name: string }[];
  students: { id: string; label: string }[];
  years: { id: string; name: string; isCurrent: boolean }[];
}) {
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
          const res = await createExamAndEnterMark(fd);
          if (res?.error) setError(res.error);
          else {
            setOk(true);
            (e.target as HTMLFormElement).reset();
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <select name="subjectId" required className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm">
          <option value="">Select subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Academic year</Label>
        <select name="academicYearId" required className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm">
          <option value="">Select year</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}{y.isCurrent ? " (current)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Student</Label>
        <select name="studentId" required className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm">
          <option value="">Select student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Exam / test name</Label>
        <Input name="examName" defaultValue="Class Test" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Marks obtained</Label>
          <Input name="marksObtained" type="number" step="0.01" min="0" required />
        </div>
        <div className="space-y-1.5">
          <Label>Max marks</Label>
          <Input name="maxMarks" type="number" step="0.01" min="1" defaultValue="100" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input name="examDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">Marks saved.</p>}
      <Button type="submit" className="w-full" disabled={pending || subjects.length === 0}>
        {pending ? "Saving..." : "Save marks"}
      </Button>
      {subjects.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No subjects yet. School admin must add subjects under Academic.
        </p>
      )}
    </form>
  );
}
