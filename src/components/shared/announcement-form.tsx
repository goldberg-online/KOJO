"use client";

import { useState, useTransition } from "react";
import { createAnnouncement } from "@/lib/actions/school-comms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isActionError } from "@/lib/utils";

export function AnnouncementForm() {
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
          const res = await createAnnouncement(fd);
          if (isActionError(res)) setError(res.error);
          else {
            setOk(true);
            (e.target as HTMLFormElement).reset();
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input name="title" required />
      </div>
      <div className="space-y-1.5">
        <Label>Message</Label>
        <textarea
          name="body"
          required
          rows={4}
          className="flex w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Audience</Label>
        <select name="audience" className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm">
          <option value="ALL">Everyone</option>
          <option value="TEACHER">Teachers</option>
          <option value="STUDENT">Students</option>
          <option value="ACCOUNTANT">Accountant</option>
          <option value="PARENT">Parents</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">Announcement sent.</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending..." : "Publish"}
      </Button>
    </form>
  );
}
