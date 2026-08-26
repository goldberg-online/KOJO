import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleDashboardPath } from "@/lib/role-routes";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const dashboard = roleDashboardPath(session.user.role);
  redirect(dashboard ?? "/login");
}
