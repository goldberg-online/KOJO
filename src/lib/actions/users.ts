"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { Role } from "@prisma/client";
import { nextDisStudentAdmission, nextDisStaffId } from "@/lib/sequence";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "PARENT", "SERVICE_OFFICER"]),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  admissionNumber: z.string().optional(),
});

export async function getUsersForSchool() {
  const session = await auth();
  if (!session?.user?.schoolId) {
    if (session?.user?.role !== "SUPER_ADMIN") return [];
  }

  const where =
    session.user.role === "SUPER_ADMIN"
      ? { deletedAt: null }
      : { schoolId: session.user.schoolId!, deletedAt: null };

  return prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
      schoolId: true,
      teacherProfile: { select: { employeeId: true } },
      studentProfile: { select: { admissionNumber: true } },
      accountantProfile: { select: { employeeId: true } },
    },
  });
}

export async function createUser(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
    throw new Error("Forbidden");
  }

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    role: formData.get("role") as string,
    phone: (formData.get("phone") as string) || undefined,
    employeeId: (formData.get("employeeId") as string) || undefined,
    admissionNumber: (formData.get("admissionNumber") as string) || undefined,
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;

  // Student enrollment is only via Accountant enroll flow (or Super Admin on that page)
  if ((data.role as string) === "STUDENT") {
    return { error: "Use Accountant → Students to enroll students (full profile)." };
  }

  if (session.user.role === "SCHOOL_ADMIN") {
    return {
      error:
        "School Admin cannot create or enroll accounts. Super Admin allocates logins. Your role is to assign subjects and classes to teachers under Academic.",
    };
  }

  const schoolId =
    session.user.role === "SUPER_ADMIN"
      ? (formData.get("schoolId") as string) || null
      : session.user.schoolId;

  if (!schoolId && data.role !== "SUPER_ADMIN") {
    return { error: "School is required" };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return { error: "Email already in use" };

  const hashed = await bcrypt.hash(data.password, 12);

  let studentAdmission = data.admissionNumber?.trim() || "";
  let staffEmployeeId = data.employeeId?.trim() || "";
  if (
    (data.role === "TEACHER" || data.role === "ACCOUNTANT") &&
    !staffEmployeeId &&
    schoolId
  ) {
    try {
      staffEmployeeId = await nextDisStaffId(schoolId);
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Could not allocate staff ID",
      };
    }
  }

  if (data.role === "STUDENT") {
    if (!schoolId) return { error: "School is required for students" };
    if (!studentAdmission) {
      try {
        studentAdmission = await nextDisStudentAdmission(schoolId);
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : "Could not allocate student ID",
        };
      }
    } else {
      studentAdmission = studentAdmission.toUpperCase();
      if (!/^DISST\d{1,4}$/.test(studentAdmission)) {
        return { error: "Admission number must look like DISST01" };
      }
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashed,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role as Role,
          phone: data.phone,
          schoolId,
        },
      });

      if (data.role === "TEACHER") {
        await tx.teacher.create({
          data: {
            userId: user.id,
            employeeId: staffEmployeeId,
          },
        });
      } else if (data.role === "STUDENT") {
        await tx.student.create({
          data: {
            userId: user.id,
            admissionNumber: studentAdmission,
          },
        });
      } else if (data.role === "ACCOUNTANT") {
        await tx.accountant.create({
          data: {
            userId: user.id,
            employeeId: staffEmployeeId,
          },
        });
      } else if (data.role === "PARENT") {
        await tx.parent.create({ data: { userId: user.id } });
      }
      // SERVICE_OFFICER, SCHOOL_ADMIN: user row only (role on User is enough)
    });
  } catch (e) {
    console.error(e);
    return { error: "Failed to create user" };
  }

  revalidatePath("/school-admin/users");
  revalidatePath("/super-admin/users");
  revalidatePath("/services");
  return { success: true };
}

export async function toggleUserActive(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
    throw new Error("Forbidden");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) return { error: "User not found" };

  if (
    session.user.role === "SCHOOL_ADMIN" &&
    user.schoolId !== session.user.schoolId
  ) {
    return { error: "Forbidden" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/school-admin/users");
  revalidatePath("/super-admin/users");
  revalidatePath("/services");
  return { success: true };
}

/** Link an existing parent account to a student (required for parent portal) */
export async function linkParentToStudent(formData: FormData) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
    return { error: "Unauthorized" };
  }

  const parentUserId = (formData.get("parentUserId") as string) || "";
  const studentId = (formData.get("studentId") as string) || "";
  const relation = ((formData.get("relation") as string) || "Guardian").trim();

  if (!parentUserId || !studentId) {
    return { error: "Select parent and student" };
  }

  const parent = await prisma.parent.findUnique({ where: { userId: parentUserId } });
  if (!parent) return { error: "Parent profile not found for that user" };

  const student = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null },
    include: { user: { select: { schoolId: true } } },
  });
  if (!student) return { error: "Student not found" };

  if (
    session.user.role !== "SUPER_ADMIN" &&
    session.user.schoolId &&
    student.user.schoolId !== session.user.schoolId
  ) {
    return { error: "Student is not in your school" };
  }

  const existing = await prisma.parentStudent.findUnique({
    where: {
      parentId_studentId: { parentId: parent.id, studentId: student.id },
    },
  });
  if (existing) return { error: "Already linked" };

  await prisma.parentStudent.create({
    data: {
      parentId: parent.id,
      studentId: student.id,
      relation: relation || "Guardian",
    },
  });

  revalidatePath("/school-admin/users");
  revalidatePath("/super-admin/users");
  revalidatePath("/parent");
  revalidatePath("/parent/children");
  revalidatePath("/parent/fees");
  return { success: true };
}

export async function getParentsAndStudentsForLinking() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
    return { parents: [], students: [] };
  }

  const schoolId =
    session.user.role === "SUPER_ADMIN" ? undefined : session.user.schoolId;

  const [parents, students] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "PARENT",
        deletedAt: null,
        ...(schoolId ? { schoolId } : {}),
        parentProfile: { isNot: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.student.findMany({
      where: {
        deletedAt: null,
        ...(schoolId ? { user: { schoolId } } : {}),
      },
      select: {
        id: true,
        admissionNumber: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { admissionNumber: "asc" },
    }),
  ]);

  return { parents, students };
}
