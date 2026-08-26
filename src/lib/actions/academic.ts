"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { getGesSubjects, type GesBand, GHANA_CLASS_LEVELS } from "@/lib/ghana-levels";

async function requireSchoolAdmin() {
  const session = await auth();
  if (!session?.user || !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  // Super admin without schoolId: use first active school for write ops context
  if (session.user.role === "SUPER_ADMIN" && !session.user.schoolId) {
    const first = await prisma.school.findFirst({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    if (first) {
      (session.user as { schoolId?: string | null }).schoolId = first.id;
    }
  }
  if (!session.user.schoolId) {
    throw new Error("No school available. Create a school first.");
  }
  return session;
}

export async function getAcademicData() {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId!;

  const [academicYears, classes, subjects, teachers] = await Promise.all([
    prisma.academicYear.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { startDate: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId, deletedAt: null },
      include: {
        academicYear: { select: { name: true } },
        sections: {
          where: { deletedAt: null },
          include: {
            classTeacher: { include: { user: { select: { firstName: true, lastName: true } } } },
            _count: { select: { students: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      where: { user: { schoolId, deletedAt: null }, deletedAt: null },
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return { academicYears, classes, subjects, teachers };
}

export async function createAcademicYear(formData: FormData) {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId!;

  const name = formData.get("name") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const isCurrent = formData.get("isCurrent") === "on";

  if (!name || !startDate || !endDate) return { error: "All fields required" };

  if (isCurrent) {
    await prisma.academicYear.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false },
    });
  }

  await prisma.academicYear.create({
    data: {
      schoolId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isCurrent,
    },
  });

  revalidatePath("/school-admin/academic");
  return { success: true };
}

export async function createClass(formData: FormData) {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId!;

  const name = formData.get("name") as string;
  const academicYearId = formData.get("academicYearId") as string;

  if (!name || !academicYearId) return { error: "Name and academic year required" };

  const cls = await prisma.class.create({
    data: { schoolId, name, academicYearId },
  });
  await prisma.section.create({
    data: { classId: cls.id, name: "A" },
  });

  revalidatePath("/school-admin/academic");
  revalidatePath("/accountant/students");
  return { success: true };
}

export async function createSection(formData: FormData) {
  await requireSchoolAdmin();

  const classId = formData.get("classId") as string;
  const name = formData.get("name") as string;
  const classTeacherId = (formData.get("classTeacherId") as string) || null;
  const roomNumber = (formData.get("roomNumber") as string) || null;

  if (!classId || !name) return { error: "Class and section name required" };

  await prisma.section.create({
    data: {
      classId,
      name,
      classTeacherId: classTeacherId || undefined,
      roomNumber: roomNumber || undefined,
    },
  });

  revalidatePath("/school-admin/academic");
  return { success: true };
}

export async function createSubject(formData: FormData) {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId!;

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;

  if (!name || !code) return { error: "Name and code required" };

  const existing = await prisma.subject.findFirst({
    where: { schoolId, code, deletedAt: null },
  });
  if (existing) return { error: "Subject code already exists" };

  await prisma.subject.create({
    data: { schoolId, name, code: code.toUpperCase() },
  });

  revalidatePath("/school-admin/academic");
  revalidatePath("/school-admin/subjects");
  return { success: true };
}


/** Import GES subject catalogue into this school (skips existing codes) */
export async function importGesSubjects(formData: FormData) {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId!;
  const band = ((formData.get("band") as string) || "ALL") as GesBand;

  const list = getGesSubjects(
    ["EARLY", "PRIMARY", "JHS", "ALL"].includes(band) ? band : "ALL"
  );

  let created = 0;
  let skipped = 0;

  for (const s of list) {
    const existing = await prisma.subject.findFirst({
      where: { schoolId, code: s.code, deletedAt: null },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.subject.create({
      data: { schoolId, name: s.name, code: s.code },
    });
    created++;
  }

  revalidatePath("/school-admin/academic");
  revalidatePath("/school-admin/subjects");
  return { success: true, created, skipped };
}

/** Assign teacher to a subject in a class (classroom) */
export async function assignTeacherToClassSubject(formData: FormData) {
  await requireSchoolAdmin();

  const classId = formData.get("classId") as string;
  const subjectId = formData.get("subjectId") as string;
  const teacherId = (formData.get("teacherId") as string) || "";

  if (!classId || !subjectId) {
    return { error: "Class and subject are required" };
  }

  await prisma.classSubject.upsert({
    where: {
      classId_subjectId: { classId, subjectId },
    },
    create: {
      classId,
      subjectId,
      teacherId: teacherId || null,
    },
    update: {
      teacherId: teacherId || null,
    },
  });

  revalidatePath("/school-admin/academic");
  revalidatePath("/school-admin/assignments");
  revalidatePath("/teacher");
  return { success: true };
}

/**
 * Assign one teacher to many subjects on one class (Ghana band subjects).
 * subjectIds = comma-separated or repeated form fields subjectIds
 */
export async function bulkAssignTeacherSubjects(formData: FormData) {
  await requireSchoolAdmin();
  const classId = (formData.get("classId") as string) || "";
  const teacherId = (formData.get("teacherId") as string) || "";
  if (!classId || !teacherId) {
    return { error: "Class and teacher are required" };
  }

  const subjectIds = formData.getAll("subjectIds").map(String).filter(Boolean);
  if (subjectIds.length === 0) {
    return { error: "Select at least one subject" };
  }

  let assigned = 0;
  for (const subjectId of subjectIds) {
    await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId, subjectId } },
      create: { classId, subjectId, teacherId },
      update: { teacherId },
    });
    assigned++;
  }

  revalidatePath("/school-admin/academic");
  revalidatePath("/teacher");
  return { success: true, created: assigned };
}

/** List class–subject–teacher assignments for the school */
export async function getClassSubjectAssignments() {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId!;

  return prisma.classSubject.findMany({
    where: { class: { schoolId, deletedAt: null } },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          academicYear: { select: { name: true } },
        },
      },
      subject: { select: { id: true, name: true, code: true } },
      teacher: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });
}

/** Students with fee payment summary for school admin */
export async function getStudentsWithFees() {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId!;

  const students = await prisma.student.findMany({
    where: { deletedAt: null, user: { schoolId, deletedAt: null } },
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
      section: {
        include: { class: { select: { name: true } } },
      },
      invoices: {
        where: { deletedAt: null },
        select: {
          totalAmount: true,
          paidAmount: true,
          status: true,
        },
      },
    },
    orderBy: { admissionNumber: "asc" },
  });

  return students.map((s) => {
    const totalBilled = s.invoices.reduce((a, i) => a + i.totalAmount, 0);
    const totalPaid = s.invoices.reduce((a, i) => a + i.paidAmount, 0);
    const balance = totalBilled - totalPaid;
    return {
      id: s.id,
      admissionNumber: s.admissionNumber,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      email: s.user.email,
      phone: s.user.phone,
      isActive: s.user.isActive,
      avatarUrl: s.user.avatarUrl,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      address: s.address,
      notes: s.notes,
      className: s.section?.class.name ?? "—",
      sectionName: s.section?.name ?? "—",
      totalBilled,
      totalPaid,
      balance,
      invoiceCount: s.invoices.length,
      feeStatus:
        totalBilled === 0
          ? "NO_INVOICE"
          : balance <= 0
            ? "PAID"
            : totalPaid > 0
              ? "PARTIAL"
              : "UNPAID",
    };
  });
}

/** Create all standard classes Creche → JHS 3 for the selected academic year (WAEC/GES ladder) */
export async function seedStandardClasses(formData: FormData) {
  const session = await requireSchoolAdmin();
  const schoolId = session.user.schoolId!;
  const academicYearId = formData.get("academicYearId") as string;
  if (!academicYearId) return { error: "Select an academic year first" };

  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId, deletedAt: null },
  });
  if (!year) return { error: "Academic year not found" };

  let created = 0;
  let skipped = 0;

  for (const name of GHANA_CLASS_LEVELS) {
    const exists = await prisma.class.findFirst({
      where: { schoolId, academicYearId, name, deletedAt: null },
    });
    if (exists) {
      skipped++;
      continue;
    }
    const cls = await prisma.class.create({
      data: { schoolId, academicYearId, name },
    });
    await prisma.section.create({
      data: { classId: cls.id, name: "A" },
    });
    created++;
  }

  revalidatePath("/school-admin/academic");
  revalidatePath("/accountant/students");
  return { success: true, created, skipped };
}
