import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Sidebar, MobileNav } from "@/components/shared/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, KeyRound } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role ?? "";
  const initials = (session.user.name || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/80 bg-card/90 px-4 backdrop-blur-md md:px-6">
          <MobileNav role={role} />
          <div className="min-w-0 md:hidden">
            <p className="truncate text-sm font-semibold tracking-tight">DIS ONLINE</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">
                {session.user.name}
              </p>
              <p className="text-[11px] capitalize text-muted-foreground">
                {role.replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
            <Link
              href="/account"
              title="View and edit profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm ring-offset-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {initials}
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Profile
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="outline" size="sm" className="gap-1.5 rounded-xl">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
