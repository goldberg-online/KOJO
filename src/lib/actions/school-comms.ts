"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AnnouncementAudience, Role } from "@prisma/client";

async function requireSchoolAdmin() {
  const session = await auth();
  if (!session?.user || !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  if (!session.user.schoolId && session.user.role !== "SUPER_ADMIN") {
    throw new Error("No school");
  }
  return session;
}

export async function createAnnouncement(formData: FormData) {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId;
  if (!schoolId) return { error: "No school linked" };

  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const audience = (formData.get("audience") as string) || "ALL";

  if (!title || !body) return { error: "Title and message required" };

  const allowed = ["ALL", "TEACHER", "STUDENT", "ACCOUNTANT", "PARENT"];
  if (!allowed.includes(audience)) return { error: "Invalid audience" };

  await prisma.announcement.create({
    data: {
      schoolId,
      authorId: session.user.id,
      title,
      body,
      audience: audience as AnnouncementAudience,
    },
  });

  revalidatePath("/school-admin/announcements");
  revalidatePath("/school-admin");
  return { success: true };
}

export async function getAnnouncements() {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId;
  if (!schoolId) return [];

  return prisma.announcement.findMany({
    where: { schoolId, deletedAt: null },
    include: {
      author: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createStaffTask(formData: FormData) {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId;
  if (!schoolId) return { error: "No school linked" };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string) || null;
  const assigneeRole = formData.get("assigneeRole") as string;
  const dueDate = formData.get("dueDate") as string;

  if (!title || !["TEACHER", "STUDENT", "ACCOUNTANT"].includes(assigneeRole)) {
    return { error: "Title and valid assignee role required" };
  }

  await prisma.staffTask.create({
    data: {
      schoolId,
      title,
      description: description || undefined,
      assigneeRole: assigneeRole as Role,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdById: session.user.id,
    },
  });

  revalidatePath("/school-admin/tasks");
  revalidatePath("/school-admin");
  return { success: true };
}

export async function getStaffTasks() {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId;
  if (!schoolId) return [];

  return prisma.staffTask.findMany({
    where: { schoolId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
