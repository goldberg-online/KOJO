"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ServiceExpenseCategory } from "@prisma/client";

async function requireServiceDesk() {
  const session = await auth();
  if (
    !session?.user ||
    !["SERVICE_OFFICER", "ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)
  ) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function resolveSchoolId(
  session: Awaited<ReturnType<typeof requireServiceDesk>>
): Promise<string | null> {
  if (session.user.schoolId) return session.user.schoolId;
  if (session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    return first?.id ?? null;
  }
  return null;
}

function startOfDay(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
function startOfWeek(d = new Date()) {
  const day = d.getDay(); // 0 Sun
  const diff = (day + 6) % 7; // Monday start
  const s = startOfDay(d);
  s.setUTCDate(s.getUTCDate() - diff);
  return s;
}
function startOfMonth(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
}

async function sumCollections(schoolId: string, from: Date, to?: Date) {
  const where: {
    schoolId: string;
    deletedAt: null;
    collectionDate: { gte: Date; lt?: Date };
  } = {
    schoolId,
    deletedAt: null,
    collectionDate: { gte: from },
  };
  if (to) where.collectionDate.lt = to;
  const agg = await prisma.serviceCollection.aggregate({
    where,
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

async function sumExpenses(schoolId: string, from: Date, to?: Date) {
  const where: {
    schoolId: string;
    deletedAt: null;
    expenseDate: { gte: Date; lt?: Date };
  } = {
    schoolId,
    deletedAt: null,
    expenseDate: { gte: from },
  };
  if (to) where.expenseDate.lt = to;
  const agg = await prisma.serviceExpense.aggregate({
    where,
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/** Today / week / month collected, expenses, and net balances */
export async function getServiceDeskSummary() {
  const session = await requireServiceDesk();
  const schoolId = await resolveSchoolId(session);
  if (!schoolId) {
    return {
      todayCollected: 0,
      weekCollected: 0,
      monthCollected: 0,
      todayExpense: 0,
      weekExpense: 0,
      monthExpense: 0,
      todayNet: 0,
      weekNet: 0,
      monthNet: 0,
      allTimeCollected: 0,
      allTimeExpense: 0,
      allTimeNet: 0,
    };
  }

  const now = new Date();
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const month = startOfMonth(now);
  const epoch = new Date(0);

  const [
    todayCollected,
    weekCollected,
    monthCollected,
    allTimeCollected,
    todayExpense,
    weekExpense,
    monthExpense,
    allTimeExpense,
  ] = await Promise.all([
    sumCollections(schoolId, today),
    sumCollections(schoolId, week),
    sumCollections(schoolId, month),
    sumCollections(schoolId, epoch),
    sumExpenses(schoolId, today),
    sumExpenses(schoolId, week),
    sumExpenses(schoolId, month),
    sumExpenses(schoolId, epoch),
  ]);

  return {
    todayCollected,
    weekCollected,
    monthCollected,
    todayExpense,
    weekExpense,
    monthExpense,
    todayNet: todayCollected - todayExpense,
    weekNet: weekCollected - weekExpense,
    monthNet: monthCollected - monthExpense,
    allTimeCollected,
    allTimeExpense,
    allTimeNet: allTimeCollected - allTimeExpense,
  };
}

export async function recordServiceExpense(formData: FormData) {
  const session = await requireServiceDesk();
  const schoolId = await resolveSchoolId(session);
  if (!schoolId) return { error: "No school linked" };

  const description = ((formData.get("description") as string) || "").trim();
  const amount = parseFloat(formData.get("amount") as string);
  const expenseDate = formData.get("expenseDate") as string;
  const categoryRaw = (formData.get("category") as string) || "OTHER";

  if (!description) return { error: "Description is required" };
  if (isNaN(amount) || amount <= 0) return { error: "Enter a valid amount (GH₵)" };

  const allowed = ["FUEL", "FOOD_SUPPLIES", "VEHICLE_REPAIR"] as string[];
  if (!allowed.includes(categoryRaw)) {
    return { error: "Category must be Fuel, Food supplies, or Vehicle repair" };
  }
  const category = categoryRaw as ServiceExpenseCategory;

  await prisma.serviceExpense.create({
    data: {
      schoolId,
      category,
      description,
      amount,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      recordedByUserId: session.user.id,
    },
  });

  revalidatePath("/services");
  revalidatePath("/accountant/services");
  return { success: true };
}

export async function getServiceExpenses() {
  const session = await requireServiceDesk();
  const schoolId = await resolveSchoolId(session);
  if (!schoolId) return [];

  return prisma.serviceExpense.findMany({
    where: { schoolId, deletedAt: null },
    include: {
      recordedByUser: { select: { firstName: true, lastName: true } },
    },
    orderBy: { expenseDate: "desc" },
    take: 50,
  });
}

/** Read-only fee invoices for service officer awareness */
export async function getFeesOverviewForService() {
  const session = await requireServiceDesk();
  const schoolId = await resolveSchoolId(session);
  if (!schoolId) return [];

  return prisma.invoice.findMany({
    where: {
      deletedAt: null,
      student: { user: { schoolId } },
    },
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
}
