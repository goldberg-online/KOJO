import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "prisma/.env") });

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma, withDbRetry } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "@/lib/auth.config";
import { rateLimit, pruneRateLimits } from "@/lib/security";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            console.error("[auth] invalid form data", parsed.error.flatten());
            return null;
          }

          const email = parsed.data.email.trim().toLowerCase();
          const password = parsed.data.password;

          pruneRateLimits();
          const limited = rateLimit(`login:${email}`, 8, 15 * 60 * 1000);
          if (!limited.ok) {
            console.error("[auth] rate limited", email, limited.retryAfterSec);
            return null;
          }

          const user = await withDbRetry(() =>
            prisma.user.findFirst({
              where: {
                email: { equals: email, mode: "insensitive" },
              },
            })
          );

          if (!user) {
            console.error("[auth] no user found for", email);
            return null;
          }
          if (user.deletedAt) {
            console.error("[auth] user soft-deleted", email);
            return null;
          }
          if (!user.isActive) {
            console.error("[auth] user inactive", email);
            return null;
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            console.error("[auth] bad password for", email);
            return null;
          }

          await withDbRetry(() =>
            prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            })
          );

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            schoolId: user.schoolId,
          };
        } catch (err) {
          console.error("[auth] authorize error (often DB connection):", err);
          return null;
        }
      },
    }),
  ],
});
