"use client";

import { useState, useTransition } from "react";
import { enrollStudent } from "@/lib/actions/accountant-ops";
import { GHANA_CLASS_LEVELS } from "@/lib/ghana-levels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isActionError } from "@/lib/utils";

export function EnrollStudentForm({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [creds, setCreds] = useState<{
    email?: string;
    password?: string;
    admissionNumber?: string;
    parentEmail?: string;
    parentPassword?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setCreds(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await enrollStudent(fd);
      if (isActionError(res)) setError(res.error);
      else {
        setSuccessMsg(res.message || "Student enrolled.");
        setCreds({
          email: res.email,
          password: res.password,
          admissionNumber: res.admissionNumber,
          parentEmail: res.parentEmail,
          parentPassword: res.parentPassword,
        });
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[11px] text-emerald-900">
        <strong>Full control:</strong> choose any class Creche→JHS (created automatically if
        missing), photo, DOB, address, notes, parent login, DISST ID, online access.
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Student
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="photo">Student photo</Label>
        <Input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
        />
        <p className="text-[11px] text-muted-foreground">Optional · JPG/PNG/WebP · max 2 MB</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email (student login)</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" placeholder="+233…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            name="gender"
            className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sectionId">Class (Creche → JHS)</Label>
          <select
            id="sectionId"
            name="sectionId"
            required
            className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="">Select class</option>
            <optgroup label="Standard levels (auto-create if needed)">
              {GHANA_CLASS_LEVELS.map((level, i) => (
                <option key={level} value={`level:${level}`}>
                  {i + 1}. {level}
                  {level === "JHS 3" ? " — BECE" : ""}
                </option>
              ))}
            </optgroup>
            {sections.length > 0 && (
              <optgroup label="Existing classes / sections">
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
      <div className="space-y-1.5">
        <Label htmlFor="address">Home address</Label>
        <Input id="address" name="address" placeholder="House / street, area, city" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="admissionNumber">Student ID (auto DISST01…)</Label>
        <Input id="admissionNumber" name="admissionNumber" placeholder="Leave blank → auto" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Student online password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          placeholder="Leave blank to auto-generate"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Enrollment notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Medical, transport, fee arrangement…"
          className="flex w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
      </div>

      <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Parent / guardian
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="parentFirstName">Parent first name</Label>
          <Input id="parentFirstName" name="parentFirstName" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentLastName">Parent last name</Label>
          <Input id="parentLastName" name="parentLastName" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="parentEmail">Parent email (login)</Label>
        <Input id="parentEmail" name="parentEmail" type="email" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="parentPhone">Parent phone</Label>
          <Input id="parentPhone" name="parentPhone" placeholder="+233…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentRelation">Relation</Label>
          <select
            id="parentRelation"
            name="parentRelation"
            className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
            defaultValue="Guardian"
          >
            <option value="Mother">Mother</option>
            <option value="Father">Father</option>
            <option value="Guardian">Guardian</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="parentPassword">Parent password</Label>
        <Input
          id="parentPassword"
          name="parentPassword"
          type="password"
          minLength={8}
          placeholder="Blank = auto (new parents)"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMsg && (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-medium">{successMsg}</p>
          {creds && (
            <ul className="space-y-1 font-mono text-xs">
              {creds.admissionNumber && <li>Student ID: {creds.admissionNumber}</li>}
              {creds.email && <li>Student login: {creds.email}</li>}
              {creds.password && (
                <li className="font-semibold">Student password: {creds.password}</li>
              )}
              {creds.parentEmail && <li>Parent login: {creds.parentEmail}</li>}
              {creds.parentPassword && (
                <li className="font-semibold">Parent password: {creds.parentPassword}</li>
              )}
            </ul>
          )}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enrolling…" : "Enroll student (full control)"}
      </Button>
    </form>
  );
}
