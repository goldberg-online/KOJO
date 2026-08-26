import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ROLE_ROUTES, roleDashboardPath } from "@/lib/role-routes";
import { getAuthSecret } from "@/lib/security";

async function readSessionToken(req: NextRequest, secret: string) {
  const secure =
    req.nextUrl.protocol === "https:" || process.env.VERCEL === "1";
  const names = secure
    ? ["__Secure-authjs.session-token", "authjs.session-token"]
    : ["authjs.session-token", "__Secure-authjs.session-token"];

  for (const cookieName of names) {
    const token = await getToken({
      req,
      secret,
      secureCookie: cookieName.startsWith("__Secure-"),
      cookieName,
      salt: cookieName,
    });
    if (token) return token;
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  let secret: string;
  try {
    secret = getAuthSecret();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const token = await readSessionToken(req, secret);
  const isLoggedIn = !!token;
  const role = (token?.role as string | undefined) || undefined;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  if (isAuthRoute) {
    if (isLoggedIn) {
      const dashboard = roleDashboardPath(role);
      if (dashboard) {
        return NextResponse.redirect(new URL(dashboard, req.url));
      }
    }
    return NextResponse.next();
  }

  const matchedPrefix = Object.keys(ROLE_ROUTES).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (matchedPrefix) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role === "SUPER_ADMIN") {
      return NextResponse.next();
    }
    const allowedRoles = ROLE_ROUTES[matchedPrefix];
    if (!role || !allowedRoles.includes(role)) {
      const dashboard = roleDashboardPath(role);
      return NextResponse.redirect(new URL(dashboard ?? "/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
