"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { saveStudentPhoto } from "@/lib/upload-student-photo";
import { auth } from "@/lib/auth";
import { ExpenseCategory, Role, ServiceFeeType } from "@prisma/client";
import { nextDisStudentAdmission } from "@/lib/sequence";
import { GHANA_CLASS_LEVELS } from "@/lib/ghana-levels";

const SSNIT_RATE = 0.055;

async function requireAccountant() {
  const session = await auth();
  if (!session?.user || !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  // Super Admin without schoolId: use first active school so enrollment still works
  if (session.user.role === "SUPER_ADMIN" && !session.user.schoolId) {
    const first = await prisma.school.findFirst({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    if (first) {
      (session.user as { schoolId?: string | null }).schoolId = first.id;
    }
  }
  return session;
}

/** Accountant, Super Admin, or Service Officer (bus/feeding only) */
async function requireServiceCollector() {
  const session = await auth();
  if (
    !session?.user ||
    !["ACCOUNTANT", "SUPER_ADMIN", "SERVICE_OFFICER"].includes(session.user.role)
  ) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function getAccountantProfile(userId: string, schoolId: string | null) {
  const profile = await prisma.accountant.findUnique({ where: { userId } });
  if (profile) return profile;
  // Super admin fallback: use first accountant in school or create path blocked
  if (!schoolId) return null;
  return prisma.accountant.findFirst({
    where: { user: { schoolId }, deletedAt: null },
  });
}

export async function getAccountantDashboardExtras() {
  const session = await requireAccountant();
  let schoolId = session.user.schoolId;
  // Super admin: platform-wide aggregates when no school linked
  const platformWide = session.user.role === "SUPER_ADMIN" && !schoolId;

  const schoolWhere = platformWide ? {} : { schoolId: schoolId! };

  const [bus, feeding, expenses, salaries, otherIncome] = await Promise.all([
    prisma.serviceCollection.aggregate({
      where: {
        type: ServiceFeeType.BUS,
        deletedAt: null,
        ...schoolWhere,
      },
      _sum: { amount: true },
    }),
    prisma.serviceCollection.aggregate({
      where: {
        type: ServiceFeeType.FEEDING,
        deletedAt: null,
        ...schoolWhere,
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        deletedAt: null,
        ...schoolWhere,
      },
      _sum: { amount: true },
    }),
    prisma.salaryPayment.aggregate({
      where: {
        deletedAt: null,
        ...schoolWhere,
      },
      _sum: { netAmount: true },
    }),
    prisma.otherIncome.aggregate({
      where: {
        deletedAt: null,
        ...schoolWhere,
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    busTotal: bus._sum.amount ?? 0,
    feedingTotal: feeding._sum.amount ?? 0,
    expenseTotal: expenses._sum.amount ?? 0,
    salaryNetTotal: salaries._sum.netAmount ?? 0,
    otherIncomeTotal: otherIncome._sum.amount ?? 0,
  };
}

export async function getClassesForEnrollment() {
  const session = await requireAccountant();
  const schoolId = session.user.schoolId;
  if (!schoolId) return [];

  return prisma.class.findMany({
    where: { schoolId, deletedAt: null },
    include: {
      sections: { where: { deletedAt: null }, select: { id: true, name: true } },
      academicYear: { select: { name: true, isCurrent: true } },
    },
    orderBy: { name: "asc" },
  });
}


/** Ensure current academic year exists for school */
async function ensureCurrentAcademicYear(schoolId: string) {
  let year = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true, deletedAt: null },
  });
  if (year) return year;
  year = await prisma.academicYear.findFirst({
    where: { schoolId, deletedAt: null },
    orderBy: { startDate: "desc" },
  });
  if (year) {
    await prisma.academicYear.update({
      where: { id: year.id },
      data: { isCurrent: true },
    });
    return year;
  }
  const y = new Date().getFullYear();
  return prisma.academicYear.create({
    data: {
      schoolId,
      name: `${y}/${y + 1}`,
      startDate: new Date(`${y}-09-01`),
      endDate: new Date(`${y + 1}-07-31`),
      isCurrent: true,
    },
  });
}

/** Create or find class + section A for a Ghana level name */
async function ensureClassAndSection(schoolId: string, levelName: string) {
  const year = await ensureCurrentAcademicYear(schoolId);
  let klass = await prisma.class.findFirst({
    where: {
      schoolId,
      academicYearId: year.id,
      name: levelName,
      deletedAt: null,
    },
  });
  if (!klass) {
    klass = await prisma.class.create({
      data: {
        schoolId,
        academicYearId: year.id,
        name: levelName,
      },
    });
  }
  let section = await prisma.section.findFirst({
    where: { classId: klass.id, deletedAt: null },
    orderBy: { name: "asc" },
  });
  if (!section) {
    section = await prisma.section.create({
      data: { classId: klass.id, name: "A" },
    });
  }
  return section;
}

/** Accountant: create all Creche→JHS classes under current year */
export async function accountantSetupAllClasses() {
  const session = await requireAccountant();
  const schoolId = session.user.schoolId;
  if (!schoolId) return { error: "No school linked to your account" };

  const year = await ensureCurrentAcademicYear(schoolId);
  let created = 0;
  let skipped = 0;
  for (const name of GHANA_CLASS_LEVELS) {
    const exists = await prisma.class.findFirst({
      where: { schoolId, academicYearId: year.id, name, deletedAt: null },
    });
    if (exists) {
      skipped++;
      // ensure at least one section
      const sec = await prisma.section.findFirst({
        where: { classId: exists.id, deletedAt: null },
      });
      if (!sec) {
        await prisma.section.create({ data: { classId: exists.id, name: "A" } });
      }
      continue;
    }
    const klass = await prisma.class.create({
      data: { schoolId, academicYearId: year.id, name },
    });
    await prisma.section.create({ data: { classId: klass.id, name: "A" } });
    created++;
  }
  revalidatePath("/accountant/students");
  revalidatePath("/school-admin/academic");
  return { success: true, created, skipped, year: year.name };
}


export async function getStudentsByClass() {
  const session = await requireAccountant();
  const schoolId = session.user.schoolId;
  if (!schoolId) return [];

  return prisma.class.findMany({
    where: { schoolId, deletedAt: null },
    include: {
      sections: {
        where: { deletedAt: null },
        include: {
          students: {
            where: { deletedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  isActive: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { admissionNumber: "asc" },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function enrollStudent(formData: FormData) {
  const session = await requireAccountant();
  const schoolId = session.user.schoolId;
  if (!schoolId) return { error: "No school linked" };

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  let password = ((formData.get("password") as string) || "").trim();
  let generatedPassword: string | null = null;
  if (!password) {
    generatedPassword =
      "Dis" + Math.random().toString(36).slice(2, 6) + Math.floor(100 + Math.random() * 900);
    password = generatedPassword;
  }
  const phone = ((formData.get("phone") as string) || "").trim() || null;
  let sectionId = (formData.get("sectionId") as string) || null;

  let admissionNumber = (formData.get("admissionNumber") as string)?.trim() || "";
  const dateOfBirthRaw = (formData.get("dateOfBirth") as string) || "";
  const genderRaw = (formData.get("gender") as string) || "";
  const address = ((formData.get("address") as string) || "").trim() || null;
  const notes = ((formData.get("notes") as string) || "").trim() || null;

  // Parent details (optional but recommended)
  const parentFirstName = ((formData.get("parentFirstName") as string) || "").trim();
  const parentLastName = ((formData.get("parentLastName") as string) || "").trim();
  const parentEmail = ((formData.get("parentEmail") as string) || "").trim().toLowerCase();
  const parentPhone = ((formData.get("parentPhone") as string) || "").trim() || null;
  const parentRelation = ((formData.get("parentRelation") as string) || "Guardian").trim() || "Guardian";
  let parentPassword = ((formData.get("parentPassword") as string) || "").trim();
  let parentGeneratedPassword: string | null = null;

  if (!firstName || !lastName || !email) {
    return { error: "First name, last name, and email are required" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters (or leave blank to auto-generate)" };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Email already in use" };

  if (!admissionNumber) {
    try {
      admissionNumber = await nextDisStudentAdmission(schoolId);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not generate student ID" };
    }
  } else {
    const ok = /^DISST\d{1,4}$/i.test(admissionNumber);
    if (!ok) {
      return { error: "Admission number must look like DISST01 or leave blank for auto" };
    }
    admissionNumber = admissionNumber.toUpperCase();
    const taken = await prisma.student.findFirst({
      where: { admissionNumber, deletedAt: null },
    });
    if (taken) return { error: `Admission number ${admissionNumber} is already used` };
  }

  // Resolve class: section id | class:<id> | level:<Ghana level name>
  if (!sectionId) {
    return { error: "Select a class for this student" };
  }
  if (sectionId.startsWith("level:")) {
    const levelName = sectionId.slice("level:".length).trim();
    if (!(GHANA_CLASS_LEVELS as readonly string[]).includes(levelName)) {
      return { error: "Invalid class level" };
    }
    const section = await ensureClassAndSection(schoolId, levelName);
    sectionId = section.id;
  } else if (sectionId.startsWith("class:")) {
    const classId = sectionId.slice("class:".length);
    const klass = await prisma.class.findFirst({
      where: { id: classId, schoolId, deletedAt: null },
    });
    if (!klass) return { error: "Class not found" };
    let section = await prisma.section.findFirst({
      where: { classId, deletedAt: null },
      orderBy: { name: "asc" },
    });
    if (!section) {
      section = await prisma.section.create({
        data: { classId, name: "A" },
      });
    }
    sectionId = section.id;
  } else {
    const sec = await prisma.section.findFirst({
      where: { id: sectionId, deletedAt: null, class: { schoolId } },
    });
    if (!sec) return { error: "Invalid class / section" };
  }

  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
  const gender =
    genderRaw === "MALE" || genderRaw === "FEMALE" || genderRaw === "OTHER"
      ? (genderRaw as "MALE" | "FEMALE" | "OTHER")
      : null;

  const createParent =
    !!parentFirstName && !!parentLastName && !!parentEmail;

  if (createParent) {
    if (parentEmail === email) {
      return { error: "Parent email must be different from student email" };
    }
    const parentExists = await prisma.user.findUnique({ where: { email: parentEmail } });
    if (parentExists && parentExists.role !== "PARENT") {
      return { error: "That parent email is already used by a non-parent account" };
    }
    if (!parentExists) {
      if (!parentPassword) {
        parentGeneratedPassword =
          "Par" + Math.random().toString(36).slice(2, 6) + Math.floor(100 + Math.random() * 900);
        parentPassword = parentGeneratedPassword;
      }
      if (parentPassword.length < 8) {
        return { error: "Parent password must be at least 8 characters (or leave blank to auto-generate)" };
      }
    }
  }

  const photoFile = formData.get("photo");
  const photoResult = await saveStudentPhoto(
    photoFile instanceof File ? photoFile : null
  );
  if (photoResult.error) return { error: photoResult.error };

  const hashed = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        password: hashed,
        role: Role.STUDENT,
        firstName,
        lastName,
        phone,
        schoolId,
        avatarUrl: photoResult.url || undefined,
        studentProfile: {
          create: {
            admissionNumber,
            sectionId: sectionId,
            admissionDate: new Date(),
            dateOfBirth: dateOfBirth || undefined,
            gender: gender || undefined,
            address: address || undefined,
            notes: notes || undefined,
          },
        },
      },
      include: { studentProfile: true },
    });

    const studentId = user.studentProfile!.id;
    let parentLoginEmail: string | undefined;
    let parentLoginPassword: string | undefined;

    if (createParent) {
      let parentUser = await tx.user.findUnique({
        where: { email: parentEmail },
        include: { parentProfile: true },
      });

      if (!parentUser) {
        const parentHash = await bcrypt.hash(parentPassword, 12);
        parentUser = await tx.user.create({
          data: {
            email: parentEmail,
            password: parentHash,
            role: Role.PARENT,
            firstName: parentFirstName,
            lastName: parentLastName,
            phone: parentPhone,
            schoolId,
            parentProfile: { create: {} },
          },
          include: { parentProfile: true },
        });
        parentLoginEmail = parentEmail;
        parentLoginPassword = parentGeneratedPassword || parentPassword;
      } else if (!parentUser.parentProfile) {
        await tx.parent.create({ data: { userId: parentUser.id } });
        parentUser = await tx.user.findUniqueOrThrow({
          where: { id: parentUser.id },
          include: { parentProfile: true },
        });
      }

      const parentId = parentUser.parentProfile!.id;
      const already = await tx.parentStudent.findUnique({
        where: {
          parentId_studentId: { parentId, studentId },
        },
      });
      if (!already) {
        await tx.parentStudent.create({
          data: {
            parentId,
            studentId,
            relation: parentRelation,
          },
        });
      }
    }

    return { studentId, parentLoginEmail, parentLoginPassword };
  });

  revalidatePath("/accountant/students");
  revalidatePath("/accountant");
  revalidatePath("/school-admin/students");
  revalidatePath("/super-admin/students");
  revalidatePath("/parent");

  return {
    success: true,
    admissionNumber,
    email,
    password: generatedPassword || undefined,
    parentEmail: result.parentLoginEmail,
    parentPassword: result.parentLoginPassword,
    message: createParent
      ? `Student ${admissionNumber} enrolled with parent linked.`
      : `Student ${admissionNumber} enrolled. Add parent later under Users if needed.`,
  };
}

export async function recordServiceCollection(formData: FormData) {
  const session = await requireServiceCollector();
  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    schoolId = first?.id ?? null;
  }
  if (!schoolId) return { error: "No school linked" };

  const mode = (formData.get("mode") as string) || "BUS";
  // modes: BUS | FEEDING | BOTH
  const busAmount = parseFloat((formData.get("busAmount") as string) || "");
  const feedingAmount = parseFloat((formData.get("feedingAmount") as string) || "");
  const legacyAmount = parseFloat((formData.get("amount") as string) || "");
  const collectionDate = formData.get("collectionDate") as string;
  const studentId = (formData.get("studentId") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const date = collectionDate ? new Date(collectionDate) : new Date();

  const entries: { type: ServiceFeeType; amount: number }[] = [];

  if (mode === "BOTH") {
    if (isNaN(busAmount) || busAmount <= 0) {
      return { error: "Enter a valid bus fee amount (GH₵)" };
    }
    if (isNaN(feedingAmount) || feedingAmount <= 0) {
      return { error: "Enter a valid feeding fee amount (GH₵)" };
    }
    entries.push({ type: "BUS", amount: busAmount });
    entries.push({ type: "FEEDING", amount: feedingAmount });
  } else if (mode === "BUS") {
    const amount = !isNaN(busAmount) && busAmount > 0 ? busAmount : legacyAmount;
    if (isNaN(amount) || amount <= 0) return { error: "Enter a valid bus fee amount (GH₵)" };
    entries.push({ type: "BUS", amount });
  } else if (mode === "FEEDING") {
    const amount = !isNaN(feedingAmount) && feedingAmount > 0 ? feedingAmount : legacyAmount;
    if (isNaN(amount) || amount <= 0) return { error: "Enter a valid feeding fee amount (GH₵)" };
    entries.push({ type: "FEEDING", amount });
  } else {
    return { error: "Choose Bus only, Feeding only, or Both" };
  }

  await prisma.$transaction(
    entries.map((e) =>
      prisma.serviceCollection.create({
        data: {
          schoolId: schoolId!,
          type: e.type,
          amount: e.amount,
          collectionDate: date,
          studentId: studentId || undefined,
          notes: notes || undefined,
          recordedByUserId: session.user.id,
        },
      })
    )
  );

  revalidatePath("/accountant/services");
  revalidatePath("/services");
  revalidatePath("/accountant");
  return { success: true, recorded: entries.length };
}

export async function getServiceCollections() {
  const session = await requireServiceCollector();
  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "SUPER_ADMIN") {
    return prisma.serviceCollection.findMany({
      where: { deletedAt: null },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        recordedByUser: { select: { firstName: true, lastName: true } },
      },
      orderBy: { collectionDate: "desc" },
      take: 100,
    });
  }
  if (!schoolId) return [];

  return prisma.serviceCollection.findMany({
    where: { schoolId, deletedAt: null },
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      recordedByUser: { select: { firstName: true, lastName: true } },
    },
    orderBy: { collectionDate: "desc" },
    take: 100,
  });
}

/** Students list for service officers (same school) */
export async function getStudentsForServices() {
  const session = await requireServiceCollector();
  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    schoolId = first?.id ?? null;
  }
  if (!schoolId) return [];

  return prisma.student.findMany({
    where: { deletedAt: null, user: { schoolId, deletedAt: null } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      section: { include: { class: { select: { name: true } } } },
    },
    orderBy: { user: { firstName: "asc" } },
    take: 500,
  });
}

export async function recordExpense(formData: FormData) {
  const session = await requireAccountant();
  const schoolId = session.user.schoolId;
  if (!schoolId) return { error: "No school linked" };

  const acc = await getAccountantProfile(session.user.id, schoolId);
  if (!acc) return { error: "Accountant profile not found" };

  const category = formData.get("category") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const expenseDate = formData.get("expenseDate") as string;
  const description = (formData.get("description") as string) || null;

  if (!Object.values(ExpenseCategory).includes(category as ExpenseCategory)) {
    return { error: "Invalid category" };
  }
  if (isNaN(amount) || amount <= 0) return { error: "Valid amount required" };

  await prisma.expense.create({
    data: {
      schoolId,
      category: category as ExpenseCategory,
      amount,
      description: description || undefined,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      recordedById: acc.id,
    },
  });

  revalidatePath("/accountant/expenses");
  revalidatePath("/accountant");
  return { success: true };
}

export async function getExpenses() {
  const session = await requireAccountant();
  const schoolId = session.user.schoolId;
  if (!schoolId) return [];

  return prisma.expense.findMany({
    where: { schoolId, deletedAt: null },
    orderBy: { expenseDate: "desc" },
    take: 100,
  });
}

export async function recordSalary(formData: FormData) {
  const session = await requireAccountant();
  const schoolId = session.user.schoolId;
  if (!schoolId) return { error: "No school linked" };

  const acc = await getAccountantProfile(session.user.id, schoolId);
  if (!acc) return { error: "Accountant profile not found" };

  const employeeName = (formData.get("employeeName") as string)?.trim();
  const grossAmount = parseFloat(formData.get("grossAmount") as string);
  const paymentDate = formData.get("paymentDate") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!employeeName || isNaN(grossAmount) || grossAmount <= 0) {
    return { error: "Employee name and valid gross amount required" };
  }

  const ssnitDeduction = Math.round(grossAmount * SSNIT_RATE * 100) / 100;
  const netAmount = Math.round((grossAmount - ssnitDeduction) * 100) / 100;

  await prisma.salaryPayment.create({
    data: {
      schoolId,
      employeeName,
      grossAmount,
      ssnitRate: SSNIT_RATE,
      ssnitDeduction,
      netAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes: notes || undefined,
      recordedById: acc.id,
    },
  });

  revalidatePath("/accountant/salaries");
  revalidatePath("/accountant");
  return { success: true, ssnitDeduction, netAmount };
}

export async function getSalaries() {
  const session = await requireAccountant();
  const schoolId = session.user.schoolId;
  if (!schoolId) return [];

  return prisma.salaryPayment.findMany({
    where: { schoolId, deletedAt: null },
    orderBy: { paymentDate: "desc" },
    take: 100,
  });
}

/** Payments and invoice lines that explain collected / outstanding balances */
export async function getFinanceBreakdown() {
  const session = await requireAccountant();
  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    schoolId = first?.id ?? null;
  }
  if (!schoolId) {
    return { payments: [], invoices: [], collected: 0, outstanding: 0 };
  }

  const schoolFilter = { student: { user: { schoolId } } };

  const [payments, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { invoice: { deletedAt: null, ...schoolFilter } },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            student: {
              select: {
                admissionNumber: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 100,
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null, ...schoolFilter },
      include: {
        student: {
          select: {
            admissionNumber: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        payments: { orderBy: { paidAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = invoices.reduce(
    (s, inv) => s + Math.max(0, inv.totalAmount - inv.paidAmount),
    0
  );

  return { payments, invoices, collected, outstanding };
}

/** Edit an enrolled student (Accountant / Super Admin only) */
export async function updateStudentEnrollment(formData: FormData) {
  const session = await requireAccountant();
  const schoolId = session.user.schoolId;
  if (!schoolId) return { error: "No school linked" };

  const studentId = (formData.get("studentId") as string) || "";
  if (!studentId) return { error: "Student required" };

  const firstName = ((formData.get("firstName") as string) || "").trim();
  const lastName = ((formData.get("lastName") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim() || null;
  const address = ((formData.get("address") as string) || "").trim() || null;
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  const dateOfBirthRaw = (formData.get("dateOfBirth") as string) || "";
  const genderRaw = (formData.get("gender") as string) || "";
  let sectionId = (formData.get("sectionId") as string) || "";
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";

  if (!firstName || !lastName) return { error: "Name is required" };

  const student = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null, user: { schoolId } },
    include: { user: true },
  });
  if (!student) return { error: "Student not found" };

  // Same class resolution as enroll
  if (sectionId.startsWith("level:")) {
    const levelName = sectionId.slice("level:".length).trim();
    if ((GHANA_CLASS_LEVELS as readonly string[]).includes(levelName)) {
      const section = await ensureClassAndSection(schoolId, levelName);
      sectionId = section.id;
    }
  } else if (sectionId.startsWith("class:")) {
    const classId = sectionId.slice("class:".length);
    let section = await prisma.section.findFirst({
      where: { classId, deletedAt: null },
      orderBy: { name: "asc" },
    });
    if (!section) {
      section = await prisma.section.create({ data: { classId, name: "A" } });
    }
    sectionId = section.id;
  }

  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
  const gender =
    genderRaw === "MALE" || genderRaw === "FEMALE" || genderRaw === "OTHER"
      ? (genderRaw as "MALE" | "FEMALE" | "OTHER")
      : undefined;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: student.userId },
      data: {
        firstName,
        lastName,
        phone,
        isActive,
      },
    }),
    prisma.student.update({
      where: { id: studentId },
      data: {
        address,
        notes,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender === undefined ? undefined : gender,
        sectionId: sectionId || undefined,
      },
    }),
  ]);

  revalidatePath("/accountant/students");
  revalidatePath("/school-admin/students");
  revalidatePath("/teacher/students");
  return { success: true };
}

export async function getStudentForEdit(studentId: string) {
  const session = await requireAccountant();
  const schoolId = session.user.schoolId;
  if (!schoolId) return null;

  return prisma.student.findFirst({
    where: { id: studentId, deletedAt: null, user: { schoolId } },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
          avatarUrl: true,
        },
      },
      section: { include: { class: { select: { id: true, name: true } } } },
    },
  });
}

// ---------- Other income ----------

export async function getOtherIncomes() {
  const session = await requireAccountant();
  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    schoolId = first?.id ?? null;
  }
  if (!schoolId) return [];

  return prisma.otherIncome.findMany({
    where: { schoolId, deletedAt: null },
    include: {
      recordedBy: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { incomeDate: "desc" },
    take: 200,
  });
}

export async function recordOtherIncome(formData: FormData) {
  const session = await requireAccountant();
  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    schoolId = first?.id ?? null;
  }
  if (!schoolId) return { error: "No school linked" };

  const description = ((formData.get("description") as string) || "").trim();
  const amount = parseFloat((formData.get("amount") as string) || "");
  const incomeDate = (formData.get("incomeDate") as string) || "";
  const notes = ((formData.get("notes") as string) || "").trim() || null;

  if (!description) return { error: "Description is required" };
  if (isNaN(amount) || amount <= 0) return { error: "Enter a valid amount (GH₵)" };

  const acc = await getAccountantProfile(session.user.id, schoolId);
  if (!acc) {
    return { error: "Accountant profile not found. Super Admin: create an accountant login first." };
  }

  await prisma.otherIncome.create({
    data: {
      schoolId,
      description,
      amount,
      incomeDate: incomeDate ? new Date(incomeDate) : new Date(),
      notes,
      recordedById: acc.id,
    },
  });

  revalidatePath("/accountant/other-income");
  revalidatePath("/accountant");
  return { success: true };
}

export async function updateOtherIncome(formData: FormData) {
  const session = await requireAccountant();
  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    schoolId = first?.id ?? null;
  }
  if (!schoolId) return { error: "No school linked" };

  const id = (formData.get("id") as string) || "";
  const description = ((formData.get("description") as string) || "").trim();
  const amount = parseFloat((formData.get("amount") as string) || "");
  const notes = ((formData.get("notes") as string) || "").trim() || null;

  if (!id) return { error: "Missing record" };
  if (!description) return { error: "Description is required" };
  if (isNaN(amount) || amount <= 0) return { error: "Enter a valid amount" };

  const existing = await prisma.otherIncome.findFirst({
    where: { id, schoolId, deletedAt: null },
  });
  if (!existing) return { error: "Not found" };

  await prisma.otherIncome.update({
    where: { id },
    data: { description, amount, notes },
  });
  revalidatePath("/accountant/other-income");
  revalidatePath("/accountant");
  return { success: true };
}

export async function softDeleteOtherIncome(formData: FormData) {
  const session = await requireAccountant();
  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    schoolId = first?.id ?? null;
  }
  const id = (formData.get("id") as string) || "";
  if (!id || !schoolId) return { error: "Missing data" };

  const existing = await prisma.otherIncome.findFirst({
    where: { id, schoolId, deletedAt: null },
  });
  if (!existing) return { error: "Not found" };

  await prisma.otherIncome.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/accountant/other-income");
  revalidatePath("/accountant");
  return { success: true };
}
