import type { NextAuthConfig } from "next-auth";
import { config } from "dotenv";
import { resolve } from "path";
import { getAuthSecret } from "@/lib/security";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "prisma/.env") });

export const authConfig: NextAuthConfig = {
  // Always the Next.js route. Do not let AUTH_URL/NEXTAUTH_URL path override this
  // (e.g. a value of https://….vercel.app/login would break every /api/auth/* call with 400).
  basePath: "/api/auth",
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role ?? "";
        token.schoolId = (user as { schoolId?: string | null }).schoolId ?? null;
        token.id = user.id ?? "";
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.schoolId = token.schoolId as string | null;
      }
      return session;
    },
  },
  secret: getAuthSecret(),
};