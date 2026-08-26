"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createAcademicYear,
  createClass,
  createSection,
  createSubject,
  importGesSubjects,
  assignTeacherToClassSubject,
  bulkAssignTeacherSubjects,
  seedStandardClasses,
} from "@/lib/actions/academic";
import { isActionError } from "@/lib/utils";
import { GHANA_CLASS_LEVELS } from "@/lib/ghana-levels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  academicYears: { id: string; name: string; isCurrent: boolean }[];
  classes: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  subjects: { id: string; name: string; code: string }[];
};

/** Map class name → recommended subject band */
function bandForClass(name: string): "EARLY" | "PRIMARY" | "JHS" {
  const n = name.toLowerCase();
  if (
    n.includes("jhs") ||
    n.includes("junior") ||
    n.startsWith("jhs")
  )
    return "JHS";
  if (n.includes("primary") || /^p[1-6]\b/.test(n)) return "PRIMARY";
  return "EARLY"; // Creche, Nursery, KG
}

const EARLY_CODES = new Set(["LAL", "NUM", "OWOP", "CA", "PE", "RME"]);
const PRIMARY_CODES = new Set([
  "ENG",
  "MATH",
  "SCI",
  "OWOP",
  "RME",
  "HIST",
  "CA",
  "ICT",
  "GHAN",
  "FRE",
  "PE",
]);
const JHS_CODES = new Set([
  "ENG",
  "MATH",
  "INTSCI",
  "SOST",
  "RME",
  "GHAN",
  "FRE",
  "CTECH",
  "ICT",
  "CAD",
  "PE",
]);

function codesForBand(band: "EARLY" | "PRIMARY" | "JHS") {
  if (band === "JHS") return JHS_CODES;
  if (band === "PRIMARY") return PRIMARY_CODES;
  return EARLY_CODES;
}

export function AcademicForms({ academicYears, classes, teachers, subjects }: Props) {
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [assignClassId, setAssignClassId] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const run = (
    action: (
      fd: FormData
    ) => Promise<{ error?: string; success?: boolean; created?: number; skipped?: number }>,
    form: HTMLFormElement
  ) => {
    setMsg(null);
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await action(fd);
      if (isActionError(res)) setMsg({ type: "err", text: res.error });
      else {
        const extra =
          res?.created != null
            ? ` · ${res.created} added/assigned, ${res.skipped ?? 0} skipped`
            : "";
        setMsg({ type: "ok", text: "Saved successfully" + extra });
        form.reset();
        setSelectedSubjects([]);
      }
    });
  };

  const selectedClass = classes.find((c) => c.id === assignClassId);
  const band = selectedClass ? bandForClass(selectedClass.name) : "EARLY";
  const suggested = useMemo(() => {
    if (!selectedClass) return subjects;
    const codes = codesForBand(band);
    const filtered = subjects.filter((s) => codes.has(s.code.toUpperCase()));
    return filtered.length > 0 ? filtered : subjects;
  }, [selectedClass, subjects, band]);

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllSuggested = () => {
    setSelectedSubjects(suggested.map((s) => s.id));
  };

  return (
    <div className="space-y-4">
      {msg && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            msg.type === "ok"
              ? "bg-green-500/10 text-green-600"
              : "bg-red-500/10 text-red-500"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
        <p className="font-semibold">Setup order (School Admin)</p>
        <ol className="mt-1 list-inside list-decimal text-xs text-emerald-900">
          <li>Create academic year</li>
          <li>Create all class levels (Creche → Nursery 1–2 → KG → Primary → JHS)</li>
          <li>Import GES subjects (Early / Primary / JHS)</li>
          <li>Assign teacher to subject(s) + class below</li>
        </ol>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Academic Year */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">1. Academic year</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(createAcademicYear, e.currentTarget);
              }}
            >
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input name="name" placeholder="2025/2026" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input name="startDate" type="date" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input name="endDate" type="date" required />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="isCurrent" value="true" />
                Current year
              </label>
              <Button type="submit" size="sm" className="w-full" disabled={isPending}>
                Save year
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Class */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">2. Classes (Ghana ladder)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(createClass, e.currentTarget);
              }}
            >
              <div className="space-y-1">
                <Label className="text-xs">Academic year</Label>
                <select
                  name="academicYearId"
                  required
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select year</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                      {y.isCurrent ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Class level</Label>
                <select
                  name="name"
                  required
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select level</option>
                  {GHANA_CLASS_LEVELS.map((level, i) => (
                    <option key={level} value={level}>
                      {i + 1}. {level}
                      {level === "JHS 3" ? " — BECE" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Creche · Nursery 1 · Nursery 2 · KG · Primary · JHS
                </p>
              </div>
              <Button type="submit" size="sm" className="w-full" disabled={isPending}>
                Add one class
              </Button>
            </form>

            <form
              className="space-y-2 border-t border-border pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(seedStandardClasses, e.currentTarget);
              }}
            >
              <Label className="text-xs">
                Create all {GHANA_CLASS_LEVELS.length} levels (+ section A)
              </Label>
              <select
                name="academicYearId"
                required
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Select year</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="w-full"
                disabled={isPending}
              >
                Create Creche → JHS 3
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Section (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(createSection, e.currentTarget);
              }}
            >
              <div className="space-y-1">
                <Label className="text-xs">Class</Label>
                <select
                  name="classId"
                  required
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Section name</Label>
                <Input name="name" placeholder="A" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Class teacher</Label>
                <select
                  name="classTeacherId"
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">None</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="sm" className="w-full" disabled={isPending}>
                Add section
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">3. Subjects (GES)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(importGesSubjects, e.currentTarget);
              }}
            >
              <Label className="text-xs">Import catalogue</Label>
              <select
                name="band"
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                defaultValue="ALL"
              >
                <option value="ALL">All (Early + Primary + JHS)</option>
                <option value="EARLY">Early (Creche / Nursery / KG)</option>
                <option value="PRIMARY">Primary 1–6</option>
                <option value="JHS">JHS 1–3 (BECE)</option>
              </select>
              <Button type="submit" size="sm" className="w-full" disabled={isPending}>
                Import GES subjects
              </Button>
            </form>
            <form
              className="space-y-2 border-t border-border pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(createSubject, e.currentTarget);
              }}
            >
              <Label className="text-xs">Or add one subject</Label>
              <Input name="name" placeholder="Subject name" required />
              <Input name="code" placeholder="Code e.g. ENG" required />
              <Button type="submit" size="sm" variant="outline" className="w-full" disabled={isPending}>
                Add subject
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Assign — full width */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">
            4. Assign subjects to a teacher (by class)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Pick a class (Creche, Nursery, KG, Primary, or JHS). Suggested subjects match that
            level. Select one or many subjects, then choose the teacher.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(null);
              const fd = new FormData(e.currentTarget);
              selectedSubjects.forEach((id) => fd.append("subjectIds", id));
              startTransition(async () => {
                const res = await bulkAssignTeacherSubjects(fd);
                if (isActionError(res)) setMsg({ type: "err", text: res.error });
                else {
                  setMsg({
                    type: "ok",
                    text: `Assigned ${res.created ?? selectedSubjects.length} subject(s) to teacher`,
                  });
                  setSelectedSubjects([]);
                }
              });
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Classroom</Label>
                <select
                  name="classId"
                  required
                  value={assignClassId}
                  onChange={(e) => {
                    setAssignClassId(e.target.value);
                    setSelectedSubjects([]);
                  }}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {selectedClass && (
                  <p className="text-[11px] text-muted-foreground">
                    Band:{" "}
                    {band === "EARLY"
                      ? "Early childhood (Creche / Nursery / KG)"
                      : band === "PRIMARY"
                        ? "Primary"
                        : "JHS / BECE"}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Teacher</Label>
                <select
                  name="teacherId"
                  required
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {teachers.length === 0 && (
                  <p className="text-[11px] text-amber-700">
                    No teachers yet. Super Admin must allocate teacher logins first.
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Subjects to assign</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={selectAllSuggested}
                  disabled={!assignClassId}
                >
                  Select all suggested
                </Button>
              </div>
              {!assignClassId ? (
                <p className="text-sm text-muted-foreground">Choose a class first.</p>
              ) : suggested.length === 0 ? (
                <p className="text-sm text-amber-700">
                  No subjects in the school yet. Import GES subjects above.
                </p>
              ) : (
                <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {suggested.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(s.id)}
                        onChange={() => toggleSubject(s.id)}
                      />
                      <span>
                        {s.name}{" "}
                        <span className="text-xs text-muted-foreground">({s.code})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {/* Also allow single assign via all subjects list */}
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Show all school subjects</summary>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {subjects.map((s) => (
                    <label key={s.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(s.id)}
                        onChange={() => toggleSubject(s.id)}
                      />
                      {s.name} ({s.code})
                    </label>
                  ))}
                </div>
              </details>
            </div>

            <Button
              type="submit"
              disabled={isPending || !assignClassId || selectedSubjects.length === 0}
            >
              {isPending
                ? "Saving…"
                : `Assign ${selectedSubjects.length || ""} subject(s) to teacher`}
            </Button>
          </form>

          {/* Quick single assign */}
          <form
            className="mt-6 grid gap-2 border-t border-border pt-4 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(assignTeacherToClassSubject, e.currentTarget);
            }}
          >
            <p className="md:col-span-4 text-xs font-medium text-muted-foreground">
              Quick: one subject only
            </p>
            <select
              name="classId"
              required
              className="flex h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              name="subjectId"
              required
              className="flex h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              name="teacherId"
              className="flex h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" disabled={isPending}>
              Save one
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
