import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

const tones = {
  green: {
    wrap: "gradient-card-green border-emerald-100",
    icon: "bg-emerald-100 text-emerald-700",
  },
  amber: {
    wrap: "gradient-card-amber border-amber-100",
    icon: "bg-amber-100 text-amber-700",
  },
  blue: {
    wrap: "gradient-card-blue border-sky-100",
    icon: "bg-sky-100 text-sky-700",
  },
  rose: {
    wrap: "gradient-card-rose border-rose-100",
    icon: "bg-rose-100 text-rose-700",
  },
} as const;

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = "green",
  href,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: keyof typeof tones;
  /** When set, the whole card is a clickable link */
  href?: string;
}) {
  const t = tones[tone];
  const body = (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-card transition hover:shadow-soft",
        href && "cursor-pointer hover:border-primary/40 hover:ring-1 hover:ring-primary/20",
        t.wrap
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
          {href ? (
            <p className="mt-2 flex items-center gap-0.5 text-[11px] font-medium text-primary">
              View details
              <ChevronRight className="h-3 w-3" />
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            t.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
        {body}
      </Link>
    );
  }
  return body;
}
