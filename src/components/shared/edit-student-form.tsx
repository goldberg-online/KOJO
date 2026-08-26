"use client";

import { useState, useTransition } from "react";
import { updateStudentEnrollment } from "@/lib/actions/accountant-ops";
import { GHANA_CLASS_LEVELS } from "@/lib/ghana-levels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isActionError } from "@/lib/utils";

export function EditStudentForm({
  student,
  sections,
}: {
  student: {
    id: string;
    admissionNumber: string;
    address: string | null;
    notes: string | null;
    dateOfBirth: Date | string | null;
    gender: string | null;
    sectionId: string | null;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      isActive: boolean;
    };
  };
  sections: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  const dob =
    student.dateOfBirth
      ? new Date(student.dateOfBirth).toISOString().slice(0, 10)
      : "";

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Edit
      </Button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(false);
        const fd = new FormData(e.currentTarget);
        fd.set("studentId", student.id);
        start(async () => {
          const res = await updateStudentEnrollment(fd);
          if (isActionError(res)) setError(res.error);
          else {
            setOk(true);
            setOpen(false);
          }
        });
      }}
    >
      <input type="hidden" name="studentId" value={student.id} />
      <p className="text-xs font-medium">
        Edit {student.admissionNumber} · {student.user.email}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">First name</Label>
          <Input name="firstName" defaultValue={student.user.firstName} required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Last name</Label>
          <Input name="lastName" defaultValue={student.user.lastName} required />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input name="phone" defaultValue={student.user.phone || ""} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date of birth</Label>
          <Input name="dateOfBirth" type="date" defaultValue={dob} />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Gender</Label>
          <select
            name="gender"
            defaultValue={student.gender || ""}
            className="flex h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Class</Label>
          <select
            name="sectionId"
            defaultValue={student.sectionId || ""}
            className="flex h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="">Keep / select</option>
            <optgroup label="Standard levels">
              {GHANA_CLASS_LEVELS.map((l) => (
                <option key={l} value={`level:${l}`}>
                  {l}
                </option>
              ))}
            </optgroup>
            {sections.length > 0 && (
              <optgroup label="Existing">
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Address</Label>
        <Input name="address" defaultValue={student.address || ""} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Input name="notes" defaultValue={student.notes || ""} />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={student.user.isActive}
        />
        Active login
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {ok && <p className="text-xs text-emerald-700">Saved</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
