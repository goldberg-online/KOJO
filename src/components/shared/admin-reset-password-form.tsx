"use client";

import { useState, useTransition } from "react";
import { adminResetPassword } from "@/lib/actions/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isActionError } from "@/lib/utils";

export function AdminResetPasswordForm({
  userId,
  userLabel,
}: {
  userId: string;
  userLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reset password
      </Button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-xl border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(false);
        const fd = new FormData(e.currentTarget);
        fd.set("userId", userId);
        start(async () => {
          const res = await adminResetPassword(fd);
          if (isActionError(res)) setError(res.error);
          else {
            setOk(true);
            (e.target as HTMLFormElement).reset();
          }
        });
      }}
    >
      <p className="text-xs text-muted-foreground">New password for {userLabel}</p>
      <input type="hidden" name="userId" value={userId} />
      <div className="space-y-1">
        <Label className="text-xs">New password</Label>
        <Input name="newPassword" type="password" minLength={8} required />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Confirm</Label>
        <Input name="confirmPassword" type="password" minLength={8} required />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {ok && <p className="text-xs text-emerald-700">Password reset.</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
