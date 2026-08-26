"use client";

import { useState, useTransition } from "react";
import { linkParentToStudent } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isActionError } from "@/lib/utils";

type ParentOpt = { id: string; firstName: string; lastName: string; email: string };
type StudentOpt = {
  id: string;
  admissionNumber: string;
  user: { firstName: string; lastName: string };
};

export function LinkParentForm({
  parents,
  students,
}: {
  parents: ParentOpt[];
  students: StudentOpt[];
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
          const res = await linkParentToStudent(fd);
          if (isActionError(res)) setError(res.error);
          else {
            setOk(true);
            (e.target as HTMLFormElement).reset();
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label>Parent account</Label>
        <select
          name="parentUserId"
          required
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Select parent</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} · {p.email}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Student</Label>
        <select
          name="studentId"
          required
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Select student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.admissionNumber} · {s.user.firstName} {s.user.lastName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Relation</Label>
        <Input name="relation" placeholder="Mother / Father / Guardian" defaultValue="Guardian" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && (
        <p className="text-sm text-green-600">
          Linked. Parent can now open Children and Fees for this student.
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending || parents.length === 0 || students.length === 0}>
        {pending ? "Linking..." : "Link parent to student"}
      </Button>
    </form>
  );
}
