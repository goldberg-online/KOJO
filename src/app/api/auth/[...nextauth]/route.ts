import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AUTH_URL / NEXTAUTH_URL must be the live app origin, e.g.
 * https://kojo-gamma.vercel.app
 * If they are set to https://vercel.com (the dashboard) Auth.js rewrites
 * callbacks there and sign-in hangs / returns 400.
 */
function alignAuthUrl(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host || host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return;
  }
  const origin = `${proto}://${host.split(",")[0].trim()}`;
  const current = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  let hostname = "";
  try {
    hostname = current ? new URL(current).hostname : "";
  } catch {
    hostname = "";
  }
  const dashboard =
    hostname === "vercel.com" ||
    hostname === "www.vercel.com" ||
    hostname === "localhost" ||
    hostname === "";
  if (dashboard || hostname !== host.split(",")[0].trim()) {
    process.env.AUTH_URL = origin;
    process.env.NEXTAUTH_URL = origin;
  }
}

export async function GET(req: NextRequest) {
  alignAuthUrl(req);
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  alignAuthUrl(req);
  return handlers.POST(req);
}
