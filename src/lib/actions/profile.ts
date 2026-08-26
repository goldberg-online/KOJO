"use server";

import { revalidatePath } from "next/cache";
import { prisma, withDbRetry } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getMyProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return withDbRetry(() =>
    prisma.user.findFirst({
      where: { id: session.user.id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        schoolId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        school: { select: { name: true, code: true } },
      },
    })
  );
}

export async function updateMyProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const firstName = ((formData.get("firstName") as string) || "").trim();
  const lastName = ((formData.get("lastName") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim() || null;

  if (!firstName || !lastName) {
    return { error: "First and last name are required" };
  }

  try {
    await withDbRetry(() =>
      prisma.user.update({
        where: { id: session.user.id },
        data: { firstName, lastName, phone },
      })
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("connection pool") || msg.includes("Timed out")) {
      return { error: "Database busy — try again in a few seconds." };
    }
    throw e;
  }

  revalidatePath("/account");
  return { success: true };
}
