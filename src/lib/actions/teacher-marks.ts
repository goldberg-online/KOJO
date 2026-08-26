"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ExamType } from "@prisma/client";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user || !["TEACHER", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getTeacherSubjectsAndStudents() {
  const session = await requireTeacher();
  const schoolId = session.user.schoolId;
  if (!schoolId) return { subjects: [], students: [], academicYears: [] };

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
  });

  const [subjects, students, academicYears] = await Promise.all([
    prisma.subject.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { deletedAt: null, user: { schoolId, deletedAt: null } },
      include: {
        user: { select: { firstName: true, lastName: true } },
        section: { include: { class: { select: { name: true } } } },
      },
      orderBy: { admissionNumber: "asc" },
    }),
    prisma.academicYear.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { startDate: "desc" },
    }),
  ]);

  return { subjects, students, academicYears, teacherId: teacher?.id ?? null };
}

export async function createExamAndEnterMark(formData: FormData) {
  const session = await requireTeacher();
  const schoolId = session.user.schoolId;
  if (!schoolId) return { error: "No school" };

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
  });
  if (!teacher) return { error: "Teacher profile not found" };

  const subjectId = formData.get("subjectId") as string;
  const academicYearId = formData.get("academicYearId") as string;
  const examName = (formData.get("examName") as string)?.trim() || "Class Test";
  const studentId = formData.get("studentId") as string;
  const marksObtained = parseFloat(formData.get("marksObtained") as string);
  const maxMarks = parseFloat(formData.get("maxMarks") as string) || 100;
  const examDate = formData.get("examDate") as string;

  if (!subjectId || !academicYearId || !studentId || isNaN(marksObtained)) {
    return { error: "Subject, year, student, and marks are required" };
  }

  const exam = await prisma.exam.create({
    data: {
      academicYearId,
      subjectId,
      name: examName,
      type: ExamType.UNIT_TEST,
      examDate: examDate ? new Date(examDate) : new Date(),
      maxMarks,
      passMarks: maxMarks * 0.4,
    },
  });

  await prisma.mark.create({
    data: {
      examId: exam.id,
      studentId,
      marksObtained,
      enteredById: teacher.id,
      grade:
        marksObtained >= maxMarks * 0.8
          ? "A"
          : marksObtained >= maxMarks * 0.6
            ? "B"
            : marksObtained >= maxMarks * 0.4
              ? "C"
              : "D",
    },
  });

  revalidatePath("/teacher/marks");
  revalidatePath("/teacher");
  return { success: true };
}

export async function getRecentMarks() {
  const session = await requireTeacher();
  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
  });
  if (!teacher) return [];

  return prisma.mark.findMany({
    where: { enteredById: teacher.id },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      exam: { include: { subject: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}
