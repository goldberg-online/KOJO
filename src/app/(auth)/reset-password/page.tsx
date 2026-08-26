"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPasswordWithToken } from "@/lib/actions/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (!token) {
    return (
      <p className="text-sm text-red-600">
        Missing reset token. Request a new link from{" "}
        <Link href="/forgot-password" className="underline">
          forgot password
        </Link>
        .
      </p>
    );
  }

  if (done) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-700">
          Password updated. You can sign in with your new password.
        </p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        fd.set("token", token);
        start(async () => {
          const res = await resetPasswordWithToken(fd);
          if (res?.error) setError(res.error);
          else setDone(true);
        });
      }}
    >
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">DIS ONLINE</p>
            <p className="text-xs text-muted-foreground">Choose a new password</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <ResetForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
