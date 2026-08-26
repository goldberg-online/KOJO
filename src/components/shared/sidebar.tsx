"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ROLE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { GraduationCap, Menu, X } from "lucide-react";

function NavLinks({
  role,
  onNavigate,
}: {
  role: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = ROLE_NAV[role] ?? [];

  return (
    <nav className="flex-1 space-y-1 p-3">
      <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
        Menu
      </p>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-md shadow-black/20"
                : "text-white/65 hover:bg-white/10 hover:text-white"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                active ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ role }: { role: string }) {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-700 text-white shadow-md">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight text-white">
          DIS ONLINE
        </p>
        <p className="truncate text-[10px] text-white/55">
          Doorbell International School
        </p>
        <p className="truncate text-[11px] capitalize text-white/45">
          {role.replace(/_/g, " ").toLowerCase()}
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ role }: { role: string }) {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <Brand role={role} />
      <NavLinks role={role} />
      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/5 px-3 py-2.5">
          <p className="text-[11px] font-medium text-white/70">Christ is our light</p>
          <p className="text-[10px] leading-relaxed text-white/40">
            Fees in GH₵ · SMS receipts · Multi-role
          </p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ role }: { role: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground md:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-sidebar text-sidebar-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pr-3">
              <Brand role={role} />
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks role={role} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
