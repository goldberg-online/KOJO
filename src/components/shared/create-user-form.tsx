"use client";

import { useState, useTransition } from "react";
import { createUser } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Super Admin — all staff roles including Service Officer */
const SUPER_ADMIN_ROLES = [
  { value: "SERVICE_OFFICER", label: "Service Officer (Bus & Feeding)" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "SCHOOL_ADMIN", label: "School Admin" },
  { value: "TEACHER", label: "Teacher" },
  { value: "PARENT", label: "Parent" },
];

/** School Admin cannot create logins (server also blocks) */
const SCHOOL_ADMIN_ROLES = [
  { value: "TEACHER", label: "Teacher (blocked — Super Admin only)" },
];

type SchoolOpt = { id: string; name: string; code: string };

export function CreateUserForm({
  schools = [],
  isSuperAdmin = false,
}: {
  schools?: SchoolOpt[];
  isSuperAdmin?: boolean;
}) {
  const ROLES = isSuperAdmin ? SUPER_ADMIN_ROLES : SCHOOL_ADMIN_ROLES;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState(
    isSuperAdmin ? "SERVICE_OFFICER" : "TEACHER"
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUser(formData);
      if (result?.error) setError(result.error);
      else {
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
        setRole(isSuperAdmin ? "SERVICE_OFFICER" : "TEACHER");
      }
    });
  };

  if (!isSuperAdmin) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
        School Admin cannot create logins. Ask <strong>Super Admin</strong> to allocate
        accounts (including Service Officer). Your job is Academic — assign subjects and
        classes to teachers.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        Roles include <strong>Service Officer (Bus &amp; Feeding)</strong>, Accountant,
        School Admin, Teacher, Parent. Students are enrolled under Accountant → Students.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="schoolId">School</Label>
        <select
          id="schoolId"
          name="schoolId"
          required
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          defaultValue={schools[0]?.id || ""}
        >
          <option value="" disabled>
            Select school
          </option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
        {schools.length === 0 && (
          <p className="text-xs text-amber-600">No schools found. Run seed first.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="flex h-10 w-full rounded-md border border-primary/40 bg-background px-3 text-sm font-medium"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {role === "SERVICE_OFFICER" && (
          <p className="text-[11px] text-emerald-700">
            Opens Bus &amp; Feeding collection desk after login.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" name="firstName" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lastName">Last name</Label>
        <Input id="lastName" name="lastName" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email (login)</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password (min 8, letter + number)</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" placeholder="+233..." />
      </div>
      {(role === "TEACHER" || role === "ACCOUNTANT") && (
        <div className="space-y-1.5">
          <Label htmlFor="employeeId">Staff ID (auto DISSTF101… if blank)</Label>
          <Input id="employeeId" name="employeeId" placeholder="Leave blank → auto" />
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
      )}
      {success && (
        <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
          Login created
          {role === "SERVICE_OFFICER"
            ? " — Service Officer can sign in and open Bus & Feeding."
            : ". Share the email and password with the user."}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending || schools.length === 0}>
        {isPending
          ? "Creating..."
          : role === "SERVICE_OFFICER"
            ? "Create Service Officer login"
            : "Allocate login"}
      </Button>
    </form>
  );
}
