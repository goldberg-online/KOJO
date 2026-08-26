"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";
import { isActionError } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">DIS ONLINE</p>
            <p className="text-xs text-muted-foreground">Reset password</p>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your account email. Your school can also reset the password for you.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setMessage(null);
            setDevUrl(null);
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await requestPasswordReset(fd);
              if (isActionError(res)) setError(res.error);
              else {
                setMessage(res.message || "If the account exists, a reset was issued.");
                if ("devResetUrl" in res && res.devResetUrl) setDevUrl(res.devResetUrl as string);
              }
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {devUrl && (
            <p className="break-all rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Dev / mock mode reset link:
              <br />
              <a href={devUrl} className="font-medium underline">
                Open reset link
              </a>
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Request reset link"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
