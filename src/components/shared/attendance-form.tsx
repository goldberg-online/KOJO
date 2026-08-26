"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveClassAttendance } from "@/lib/actions/teacher-classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Student = {
  id: string;
  admissionNumber: string;
  user: { firstName: string; lastName: string };
  section: { name: string } | null;
};

const STATUSES = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "HALF_DAY", label: "Half day" },
  { value: "EXCUSED", label: "Excused" },
];

export function AttendanceForm({
  classId,
  date,
  students,
  records,
}: {
  classId: string;
  date: string;
  students: Student[];
  records: Record<string, { status: string; remarks: string | null }>;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        setErr(null);
        const fd = new FormData(e.currentTarget);
        fd.set("classId", classId);
        start(async () => {
          const res = await saveClassAttendance(fd);
          if (res?.error) setErr(res.error);
          else {
            setMsg(`Attendance saved for ${res.count} student(s).`);
            router.refresh();
          }
        });
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      <div className="max-w-xs space-y-1">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={date}
          required
          onChange={(e) => {
            router.push(
              `/teacher/attendance?classId=${classId}&date=${e.target.value}`
            );
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Student</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Remark</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => {
              const rec = records[st.id];
              return (
                <tr key={st.id} className="border-b border-border/60">
                  <td className="px-3 py-2">
                    <p className="font-medium">
                      {st.user.firstName} {st.user.lastName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {st.admissionNumber}
                      {st.section ? ` · ${st.section.name}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      name={`status_${st.id}`}
                      defaultValue={rec?.status || "PRESENT"}
                      className="flex h-9 w-full min-w-[8rem] rounded-md border border-border bg-background px-2 text-sm"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      name={`remarks_${st.id}`}
                      defaultValue={rec?.remarks || ""}
                      placeholder="Optional"
                      className="min-w-[10rem]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <Button type="submit" disabled={pending || students.length === 0}>
        {pending ? "Saving…" : "Save attendance"}
      </Button>
    </form>
  );
}
