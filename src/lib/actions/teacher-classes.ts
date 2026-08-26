"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user || !["TEACHER", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function getTeacherRecord(userId: string) {
  return prisma.teacher.findUnique({ where: { userId } });
}

/** Classes this teacher is assigned to (subject teacher or class teacher) */
export async function getMyAssignedClasses() {
  const session = await requireTeacher();
  const teacher = await getTeacherRecord(session.user.id);
  if (!teacher) return [];

  const [asSubject, asClassTeacher] = await Promise.all([
    prisma.classSubject.findMany({
      where: { teacherId: teacher.id },
      include: {
        class: {
          include: {
            academicYear: { select: { name: true, isCurrent: true } },
            sections: {
              where: { deletedAt: null },
              select: { id: true, name: true },
            },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.section.findMany({
      where: { classTeacherId: teacher.id, deletedAt: null },
      include: {
        class: {
          include: {
            academicYear: { select: { name: true, isCurrent: true } },
          },
        },
      },
    }),
  ]);

  type Row = {
    classId: string;
    className: string;
    yearName: string;
    isCurrent: boolean;
    sections: { id: string; name: string }[];
    subjects: { id: string; name: string; code: string }[];
    isClassTeacher: boolean;
  };

  const map = new Map<string, Row>();

  for (const cs of asSubject) {
    if (cs.class.deletedAt) continue;
    const existing = map.get(cs.classId);
    if (!existing) {
      map.set(cs.classId, {
        classId: cs.classId,
        className: cs.class.name,
        yearName: cs.class.academicYear.name,
        isCurrent: cs.class.academicYear.isCurrent,
        sections: cs.class.sections,
        subjects: [cs.subject],
        isClassTeacher: false,
      });
    } else {
      if (!existing.subjects.some((s) => s.id === cs.subject.id)) {
        existing.subjects.push(cs.subject);
      }
    }
  }

  for (const sec of asClassTeacher) {
    if (sec.class.deletedAt) continue;
    const existing = map.get(sec.classId);
    if (!existing) {
      map.set(sec.classId, {
        classId: sec.classId,
        className: sec.class.name,
        yearName: sec.class.academicYear.name,
        isCurrent: sec.class.academicYear.isCurrent,
        sections: [{ id: sec.id, name: sec.name }],
        subjects: [],
        isClassTeacher: true,
      });
    } else {
      existing.isClassTeacher = true;
      if (!existing.sections.some((s) => s.id === sec.id)) {
        existing.sections.push({ id: sec.id, name: sec.name });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.className.localeCompare(b.className)
  );
}

/** Students in a class the teacher is allowed to see */
export async function getMyClassStudents(classId: string) {
  const session = await requireTeacher();
  const teacher = await getTeacherRecord(session.user.id);
  if (!teacher) return { error: "Teacher profile not found", students: [] };

  const allowed = await prisma.classSubject.findFirst({
    where: { classId, teacherId: teacher.id },
  });
  const asCt = await prisma.section.findFirst({
    where: { classId, classTeacherId: teacher.id, deletedAt: null },
  });
  if (!allowed && !asCt && session.user.role !== "SUPER_ADMIN") {
    return { error: "You are not assigned to this class", students: [] };
  }

  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      section: { classId, deletedAt: null },
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
        },
      },
      section: { select: { id: true, name: true } },
    },
    orderBy: { admissionNumber: "asc" },
  });

  return { students, error: null as string | null };
}

/** Load attendance for a class on a given date */
export async function getClassAttendance(classId: string, dateStr: string) {
  const { students, error } = await getMyClassStudents(classId);
  if (error) return { students: [], records: {}, error };

  const day = new Date(dateStr);
  if (Number.isNaN(day.getTime())) {
    return { students, records: {}, error: "Invalid date" };
  }
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  const rows = await prisma.attendance.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      date: { gte: start, lte: end },
    },
  });

  const records: Record<string, { status: string; remarks: string | null }> = {};
  for (const r of rows) {
    records[r.studentId] = { status: r.status, remarks: r.remarks };
  }
  return { students, records, error: null as string | null };
}

/** Save attendance for many students (one date) */
export async function saveClassAttendance(formData: FormData) {
  const session = await requireTeacher();
  const teacher = await getTeacherRecord(session.user.id);
  if (!teacher) return { error: "Teacher profile not found" };

  const classId = formData.get("classId") as string;
  const dateStr = formData.get("date") as string;
  if (!classId || !dateStr) return { error: "Class and date are required" };

  const { students, error } = await getMyClassStudents(classId);
  if (error) return { error };

  const day = new Date(dateStr);
  if (Number.isNaN(day.getTime())) return { error: "Invalid date" };
  day.setHours(12, 0, 0, 0); // midday avoids TZ edge cases on unique date

  const allowedIds = new Set(students.map((s) => s.id));

  for (const student of students) {
    const statusRaw = (formData.get(`status_${student.id}`) as string) || "PRESENT";
    const remarks = ((formData.get(`remarks_${student.id}`) as string) || "").trim() || null;
    if (!allowedIds.has(student.id)) continue;

    const status = (
      ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "EXCUSED"].includes(statusRaw)
        ? statusRaw
        : "PRESENT"
    ) as AttendanceStatus;

    const existing = await prisma.attendance.findFirst({
      where: {
        studentId: student.id,
        date: {
          gte: new Date(new Date(dateStr).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(dateStr).setHours(23, 59, 59, 999)),
        },
      },
    });

    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { status, remarks, markedById: teacher.id },
      });
    } else {
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          date: day,
          status,
          remarks,
          markedById: teacher.id,
        },
      });
    }
  }

  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher/students");
  return { success: true, count: students.length };
}
