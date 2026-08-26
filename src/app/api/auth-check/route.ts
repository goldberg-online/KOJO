import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { resolve } from "path";

export const runtime = "nodejs";

/**
 * Setup diagnostic only. Disabled in production unless ENABLE_AUTH_CHECK=true.
 */
export async function GET() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_AUTH_CHECK !== "true"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rootEnv = existsSync(resolve(process.cwd(), ".env"));
  const prismaEnv = existsSync(resolve(process.cwd(), "prisma/.env"));
  const hasSecret = !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
  const hasDb = !!process.env.DATABASE_URL;
  const routeFile = existsSync(
    resolve(process.cwd(), "src/app/api/auth/[...nextauth]/route.ts")
  );

  return NextResponse.json({
    ok: true,
    envFile: rootEnv,
    prismaEnvFile: prismaEnv,
    hasAuthSecret: hasSecret,
    hasDatabaseUrl: hasDb,
    nextAuthRouteFileExists: routeFile,
    tip: !routeFile
      ? "On Windows, the folder src/app/api/auth/[...nextauth] may have been renamed when unzipping. Recreate it."
      : "Route file is present. If /api/auth/session still 404s, restart npm run dev.",
  });
}
