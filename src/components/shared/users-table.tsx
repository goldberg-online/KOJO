"use client";

import { Fragment, useState, useTransition } from "react";
import { toggleUserActive } from "@/lib/actions/users";
import { adminResetPassword } from "@/lib/actions/password";
import { isActionError } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  teacherProfile: { employeeId: string } | null;
  studentProfile: { admissionNumber: string } | null;
  accountantProfile: { employeeId: string } | null;
};

export function UsersTable({ users }: { users: UserRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [err, setErr] = useState<Record<string, string>>({});

  if (users.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No users yet. Use <strong>Allocate login</strong> above to create the first account.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Manage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const extraId =
              u.teacherProfile?.employeeId ||
              u.accountantProfile?.employeeId ||
              u.studentProfile?.admissionNumber ||
              "—";
            const open = openId === u.id;

            return (
              <Fragment key={u.id}>
                <TableRow>
                  <TableCell className="font-medium">
                    {u.firstName} {u.lastName}
                    {u.phone ? (
                      <p className="text-[11px] font-normal text-muted-foreground">{u.phone}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.role.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {extraId}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "success" : "destructive"}>
                      {u.isActive ? "Active" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await toggleUserActive(u.id);
                          })
                        }
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={open ? "default" : "outline"}
                        onClick={() => {
                          setOpenId(open ? null : u.id);
                          setMsg((m) => ({ ...m, [u.id]: "" }));
                          setErr((e) => ({ ...e, [u.id]: "" }));
                        }}
                      >
                        {open ? "Close" : "Reset password"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {open && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/40">
                      <form
                        className="mx-auto flex max-w-md flex-col gap-2 py-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          fd.set("userId", u.id);
                          startTransition(async () => {
                            setErr((x) => ({ ...x, [u.id]: "" }));
                            setMsg((x) => ({ ...x, [u.id]: "" }));
                            const res = await adminResetPassword(fd);
                            if (isActionError(res)) {
                              setErr((x) => ({ ...x, [u.id]: res.error || "Failed" }));
                            } else {
                              setMsg((x) => ({
                                ...x,
                                [u.id]: "Password updated. Share the new password securely.",
                              }));
                              (e.target as HTMLFormElement).reset();
                            }
                          });
                        }}
                      >
                        <p className="text-xs font-medium">
                          New password for {u.firstName} {u.lastName}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">New password</Label>
                            <Input name="newPassword" type="password" minLength={8} required />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Confirm</Label>
                            <Input name="confirmPassword" type="password" minLength={8} required />
                          </div>
                        </div>
                        {err[u.id] && <p className="text-xs text-red-600">{err[u.id]}</p>}
                        {msg[u.id] && <p className="text-xs text-emerald-700">{msg[u.id]}</p>}
                        <Button type="submit" size="sm" disabled={isPending}>
                          {isPending ? "Saving…" : "Save new password"}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
