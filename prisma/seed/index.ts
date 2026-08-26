import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "prisma/.env") });

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Production-style seed — creates real standard accounts only.
 * No @demo.com users and no shared Password123!.
 *
 * Required in .env:
 *   SEED_SUPERADMIN_EMAIL
 *   SEED_SUPERADMIN_PASSWORD   (min 10 characters)
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD        (min 10 characters)
 *
 * Optional:
 *   SEED_SUPERADMIN_FIRST_NAME / SEED_SUPERADMIN_LAST_NAME
 *   SEED_ADMIN_FIRST_NAME / SEED_ADMIN_LAST_NAME
 *   SEED_SCHOOL_NAME / SEED_SCHOOL_CODE / SEED_SCHOOL_PHONE / SEED_SCHOOL_EMAIL / SEED_SCHOOL_ADDRESS
 *   SEED_ACADEMIC_YEAR         (default 2025/2026)
 */

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(
      `Missing ${name} in .env. Set real account values before running: npm run seed`
    );
  }
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

async function main() {
  console.log("Seeding database (standard accounts — not demo)...");

  const superEmail = required("SEED_SUPERADMIN_EMAIL").toLowerCase();
  const superPassword = required("SEED_SUPERADMIN_PASSWORD");
  const adminEmail = required("SEED_ADMIN_EMAIL").toLowerCase();
  const adminPassword = required("SEED_ADMIN_PASSWORD");

  if (superPassword.length < 10) {
    throw new Error("SEED_SUPERADMIN_PASSWORD must be at least 10 characters");
  }
  if (adminPassword.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters");
  }
  if (superEmail === adminEmail) {
    throw new Error("SEED_SUPERADMIN_EMAIL and SEED_ADMIN_EMAIL must be different");
  }
  if (superEmail.endsWith("@demo.com") || adminEmail.endsWith("@demo.com")) {
    throw new Error("Use real email addresses — @demo.com is not allowed for standard seed");
  }

  const superFirst = optional("SEED_SUPERADMIN_FIRST_NAME", "Platform");
  const superLast = optional("SEED_SUPERADMIN_LAST_NAME", "Admin");
  const adminFirst = optional("SEED_ADMIN_FIRST_NAME", "School");
  const adminLast = optional("SEED_ADMIN_LAST_NAME", "Administrator");

  const schoolName = optional("SEED_SCHOOL_NAME", "Doorbell International School");
  const schoolCode = optional("SEED_SCHOOL_CODE", "DIS");
  const schoolPhone = optional("SEED_SCHOOL_PHONE", "");
  const schoolEmail = optional("SEED_SCHOOL_EMAIL", adminEmail);
  const schoolAddress = optional("SEED_SCHOOL_ADDRESS", "Ghana");
  const yearName = optional("SEED_ACADEMIC_YEAR", "2025/2026");

  console.log("Clearing old data...");
  await prisma.payment.deleteMany().catch(() => undefined);
  await prisma.invoiceItem.deleteMany().catch(() => undefined);
  await prisma.invoice.deleteMany().catch(() => undefined);
  await prisma.feeStructure.deleteMany().catch(() => undefined);
  await prisma.serviceCollection.deleteMany().catch(() => undefined);
  await prisma.expense.deleteMany().catch(() => undefined);
  await prisma.salaryPayment.deleteMany().catch(() => undefined);
  await prisma.staffTask.deleteMany().catch(() => undefined);
  await prisma.assignmentSubmission.deleteMany().catch(() => undefined);
  await prisma.assignment.deleteMany().catch(() => undefined);
  await prisma.mark.deleteMany().catch(() => undefined);
  await prisma.exam.deleteMany().catch(() => undefined);
  await prisma.attendance.deleteMany().catch(() => undefined);
  await prisma.timetableSlot.deleteMany().catch(() => undefined);
  await prisma.classSubject.deleteMany().catch(() => undefined);
  await prisma.parentStudent.deleteMany().catch(() => undefined);
  await prisma.announcement.deleteMany().catch(() => undefined);
  await prisma.student.deleteMany().catch(() => undefined);
  await prisma.teacher.deleteMany().catch(() => undefined);
  await prisma.parent.deleteMany().catch(() => undefined);
  await prisma.accountant.deleteMany().catch(() => undefined);
  await prisma.section.deleteMany().catch(() => undefined);
  await prisma.class.deleteMany().catch(() => undefined);
  await prisma.subject.deleteMany().catch(() => undefined);
  await prisma.academicYear.deleteMany().catch(() => undefined);
  await prisma.user.deleteMany().catch(() => undefined);
  await prisma.school.deleteMany().catch(() => undefined);

  const superHash = await bcrypt.hash(superPassword, 12);
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const school = await prisma.school.create({
    data: {
      name: schoolName,
      code: schoolCode,
      address: schoolAddress || null,
      phone: schoolPhone || null,
      email: schoolEmail || null,
    },
  });

  await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: yearName,
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-07-31"),
      isCurrent: true,
    },
  });

  await prisma.user.create({
    data: {
      email: superEmail,
      password: superHash,
      role: Role.SUPER_ADMIN,
      firstName: superFirst,
      lastName: superLast,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      email: adminEmail,
      password: adminHash,
      role: Role.SCHOOL_ADMIN,
      firstName: adminFirst,
      lastName: adminLast,
      schoolId: school.id,
      isActive: true,
    },
  });

  console.log("Seed complete (standard accounts).");
  console.log("School:", schoolName, `(${schoolCode})`);
  console.log("Super Admin login:", superEmail);
  console.log("School Admin login:", adminEmail);
  console.log("Create teachers, students, parents, and accountants from the app after login.");
  console.log("Passwords are not printed. Use the values you set in .env.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
