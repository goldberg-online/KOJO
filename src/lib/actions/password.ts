"use server";

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma, withDbRetry } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit, passwordPolicyError, PASSWORD_MIN } from "@/lib/security";

const MIN_LEN = 8;
const TOKEN_HOURS = 2;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function validateNewPassword(password: string): string | null {
  return passwordPolicyError(password);
}

/**
 * Logged-in user changes their own password (needs current password).
 */
export async function changeOwnPassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const current = ((formData.get("currentPassword") as string) || "").trim();
  const next = ((formData.get("newPassword") as string) || "").trim();
  const confirm = ((formData.get("confirmPassword") as string) || "").trim();

  if (!current) return { error: "Current password is required" };
  const v = validateNewPassword(next);
  if (v) return { error: v };
  if (next !== confirm) return { error: "New passwords do not match" };

  try {
    const user = await withDbRetry(() =>
      prisma.user.findFirst({
        where: { id: session.user.id, deletedAt: null },
      })
    );
    if (!user || !user.isActive) return { error: "Account not found" };

    const ok = await bcrypt.compare(current, user.password);
    if (!ok) return { error: "Current password is incorrect" };

    const hashed = await bcrypt.hash(next, 12);
    await withDbRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      })
    );

    await withDbRetry(() =>
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      })
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("connection pool") || msg.includes("Timed out fetching")) {
      return {
        error:
          "Database is busy. Wait a few seconds and try again. If this keeps happening, add connection_limit=5&pool_timeout=30&sslmode=require to DATABASE_URL.",
      };
    }
    throw e;
  }

  return { success: true };
}

/**
 * Admin / school admin sets a new password for a user (no current password).
 */
export async function adminResetPassword(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
    return { error: "Forbidden" };
  }

  const userId = (formData.get("userId") as string) || "";
  const next = ((formData.get("newPassword") as string) || "").trim();
  const confirm = ((formData.get("confirmPassword") as string) || "").trim();

  if (!userId) return { error: "User required" };
  const v = validateNewPassword(next);
  if (v) return { error: v };
  if (next !== confirm) return { error: "Passwords do not match" };

  const target = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!target) return { error: "User not found" };

  if (
    session.user.role === "SCHOOL_ADMIN" &&
    target.schoolId !== session.user.schoolId
  ) {
    return { error: "Forbidden" };
  }
  if (target.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return { error: "Cannot reset Super Admin password" };
  }

  const hashed = await bcrypt.hash(next, 12);
  await prisma.user.update({
    where: { id: target.id },
    data: { password: hashed },
  });
  await prisma.passwordResetToken.updateMany({
    where: { userId: target.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  revalidatePath("/school-admin/users");
  revalidatePath("/super-admin/users");
  return { success: true };
}

/**
 * Request a reset link (forgot password). Always returns success message
 * (does not reveal whether email exists). Logs link in mock mode.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email" };
  }

  const limited = rateLimit(`reset:${email}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return {
      error: `Too many reset requests. Try again in ${limited.retryAfterSec} seconds.`,
    };
  }

  const generic = {
    success: true,
    message:
      "If an account exists for that email, a reset link has been issued. Check with your school admin if you do not receive it.",
  };

  const user = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      deletedAt: null,
      isActive: true,
    },
  });

  if (!user) return generic;

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const base =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  const resetUrl = `${base.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

  // No email provider wired: log for admin/dev (same pattern as mock SMS)
  console.info("[password-reset] link for", user.email, resetUrl);

  // In development, return the link so the school can complete reset without SMTP
  if (process.env.NODE_ENV !== "production" || process.env.SMS_PROVIDER === "mock") {
    return {
      ...generic,
      devResetUrl: resetUrl,
    };
  }

  return generic;
}

/**
 * Complete reset using token from email/link.
 */
export async function resetPasswordWithToken(formData: FormData) {
  const token = ((formData.get("token") as string) || "").trim();
  const next = ((formData.get("newPassword") as string) || "").trim();
  const confirm = ((formData.get("confirmPassword") as string) || "").trim();

  if (!token) return { error: "Invalid or missing reset token" };
  const v = validateNewPassword(next);
  if (v) return { error: v };
  if (next !== confirm) return { error: "Passwords do not match" };

  const tokenHash = hashToken(token);
  const row = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!row) return { error: "This reset link is invalid or has expired" };

  const hashed = await bcrypt.hash(next, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { password: hashed },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true };
}
