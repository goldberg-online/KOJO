"use client";

import { useState, useTransition } from "react";
import { accountantSetupAllClasses } from "@/lib/actions/accountant-ops";
import { Button } from "@/components/ui/button";
import { isActionError } from "@/lib/utils";

export function AccountantSetupClassesButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          setErr(null);
          start(async () => {
            const res = await accountantSetupAllClasses();
            if (isActionError(res)) setErr(res.error);
            else
              setMsg(
                `Classes ready for ${res.year}: ${res.created} created, ${res.skipped} already there (Creche→JHS 3).`
              );
          });
        }}
      >
        {pending ? "Setting up…" : "Setup all classes Creche → JHS 3"}
      </Button>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {msg && <p className="text-xs text-emerald-700">{msg}</p>}
    </div>
  );
}
