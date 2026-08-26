"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";

type School = { id: string; name: string; code: string };

export function SchoolSwitcher({
  schools,
  selectedId,
}: {
  schools: School[];
  selectedId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete("schoolId");
    else params.set("schoolId", value);
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="schoolSwitcher" className="text-xs text-muted-foreground">
          Viewing
        </Label>
        <select
          id="schoolSwitcher"
          value={selectedId || ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-9 min-w-[200px] rounded-xl border border-border bg-background px-3 text-sm shadow-sm"
        >
          <option value="">All schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
