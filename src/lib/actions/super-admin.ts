"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

/** Platform-wide account overview stats */
export async function getPlatformOverview() {
  await requireSuperAdmin();

  const [
    schools,
    totalUsers,
    teachers,
    students,
    classes,
    activeUsers,
    schoolAdmins,
    accountants,
    parents,
  ] = await Promise.all([
    prisma.school.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.teacher.count({ where: { deletedAt: null, user: { deletedAt: null } } }),
    prisma.student.count({ where: { deletedAt: null, user: { deletedAt: null } } }),
    prisma.class.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isActive: true } }),
    prisma.user.count({ where: { deletedAt: null, role: Role.SCHOOL_ADMIN } }),
    prisma.user.count({ where: { deletedAt: null, role: Role.ACCOUNTANT } }),
    prisma.user.count({ where: { deletedAt: null, role: Role.PARENT } }),
  ]);

  // Enrollment = active students (total enrollment)
  const enrollment = students;

  const schoolsList = await prisma.school.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      email: true,
      phone: true,
      _count: {
        select: {
          users: { where: { deletedAt: null } },
          classes: { where: { deletedAt: null } },
        },
      },
    },
  });

  return {
    schools,
    totalUsers,
    activeUsers,
    teachers,
    students,
    classes,
    enrollment,
    schoolAdmins,
    accountants,
    parents,
    schoolsList,
  };
}

export async function getPlatformTeachers() {
  await requireSuperAdmin();

  return prisma.teacher.findMany({
    where: { deletedAt: null, user: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
          school: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}

export async function getPlatformStudents() {
  await requireSuperAdmin();

  return prisma.student.findMany({
    where: { deletedAt: null, user: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
          school: { select: { id: true, name: true, code: true } },
        },
      },
      section: {
        select: {
          name: true,
          class: { select: { name: true } },
        },
      },
    },
  });
}

export async function getPlatformClasses() {
  await requireSuperAdmin();

  return prisma.class.findMany({
    where: { deletedAt: null },
    orderBy: [{ school: { name: "asc" } }, { name: "asc" }],
    include: {
      school: { select: { id: true, name: true, code: true } },
      academicYear: { select: { name: true, isCurrent: true } },
      sections: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              students: { where: { deletedAt: null } },
            },
          },
        },
      },
    },
  });
}

/** Fee totals — all schools or one school */
export async function getPlatformFinance(schoolId?: string | null) {
  await requireSuperAdmin();

  const studentScope = schoolId
    ? { student: { user: { schoolId } } }
    : {};

  const [paidAgg, pendingAgg, invoiceCount, paymentCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: { deletedAt: null, ...studentScope },
      _sum: { paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        deletedAt: null,
        ...studentScope,
        status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
      },
      _sum: { totalAmount: true, paidAmount: true },
    }),
    prisma.invoice.count({ where: { deletedAt: null, ...studentScope } }),
    prisma.payment.count({
      where: schoolId
        ? { invoice: { student: { user: { schoolId } } } }
        : {},
    }),
  ]);

  const collected = paidAgg._sum.paidAmount ?? 0;
  const pending =
    (pendingAgg._sum.totalAmount ?? 0) - (pendingAgg._sum.paidAmount ?? 0);

  return {
    collected,
    outstanding: pending < 0 ? 0 : pending,
    invoiceCount,
    paymentCount,
  };
}

/** Schools list for allocating user logins */
export async function getSchoolsForSelect() {
  await requireSuperAdmin();
  return prisma.school.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}

/** Setup checklist for first-run guidance */
export async function getSetupChecklist(schoolId?: string | null) {
  await requireSuperAdmin();

  const schoolFilter = schoolId ? { schoolId } : {};

  const [
    schools,
    schoolAdmins,
    accountants,
    teachers,
    students,
    feeStructures,
    invoices,
    payments,
  ] = await Promise.all([
    prisma.school.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: { deletedAt: null, role: Role.SCHOOL_ADMIN, ...schoolFilter },
    }),
    prisma.user.count({
      where: { deletedAt: null, role: Role.ACCOUNTANT, ...schoolFilter },
    }),
    prisma.teacher.count({
      where: {
        deletedAt: null,
        user: { deletedAt: null, ...(schoolId ? { schoolId } : {}) },
      },
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        user: { deletedAt: null, ...(schoolId ? { schoolId } : {}) },
      },
    }),
    prisma.feeStructure.count({
      where: { deletedAt: null, ...(schoolId ? { schoolId } : {}) },
    }),
    prisma.invoice.count({
      where: {
        deletedAt: null,
        ...(schoolId ? { student: { user: { schoolId } } } : {}),
      },
    }),
    prisma.payment.count({
      where: schoolId
        ? { invoice: { student: { user: { schoolId } } } }
        : {},
    }),
  ]);

  const steps = [
    {
      id: "school",
      label: "School registered",
      done: schools > 0,
      href: "/super-admin",
    },
    {
      id: "school_admin",
      label: "School Admin login allocated",
      done: schoolAdmins > 0,
      href: "/super-admin/users",
    },
    {
      id: "accountant",
      label: "Accountant login allocated",
      done: accountants > 0,
      href: "/super-admin/users",
    },
    {
      id: "teacher",
      label: "At least one teacher",
      done: teachers > 0,
      href: "/super-admin/users",
    },
    {
      id: "student",
      label: "At least one student enrolled",
      done: students > 0,
      href: "/super-admin/students",
    },
    {
      id: "fees",
      label: "Fee structure created",
      done: feeStructures > 0,
      href: "/accountant/structures",
    },
    {
      id: "invoice",
      label: "First invoice issued",
      done: invoices > 0,
      href: "/accountant/invoices",
    },
    {
      id: "payment",
      label: "First payment recorded",
      done: payments > 0,
      href: "/accountant/payments",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  return {
    steps,
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
  };
}

/** Health alerts for the platform / selected school */
export async function getHealthAlerts(schoolId?: string | null) {
  await requireSuperAdmin();

  const alerts: { id: string; severity: "high" | "medium" | "low"; message: string; href: string }[] = [];

  const finance = await getPlatformFinance(schoolId);
  if (finance.outstanding > 0 && finance.outstanding >= finance.collected && finance.collected > 0) {
    alerts.push({
      id: "outstanding_high",
      severity: "high",
      message: `Outstanding balance (${finance.outstanding.toFixed(2)} GH₵) is high relative to collections.`,
      href: "/accountant",
    });
  } else if (finance.outstanding > 5000) {
    alerts.push({
      id: "outstanding_note",
      severity: "medium",
      message: `Outstanding fees total more than GH₵5,000. Review overdue invoices.`,
      href: "/accountant/invoices",
    });
  }

  const usersNoPhone = await prisma.user.count({
    where: {
      deletedAt: null,
      isActive: true,
      role: { in: [Role.STUDENT, Role.PARENT] },
      OR: [{ phone: null }, { phone: "" }],
      ...(schoolId ? { schoolId } : {}),
    },
  });
  if (usersNoPhone > 0) {
    alerts.push({
      id: "missing_phone",
      severity: "medium",
      message: `${usersNoPhone} student/parent account(s) have no phone number — SMS receipts will fail.`,
      href: "/super-admin/users",
    });
  }

  const accountants = await prisma.user.count({
    where: {
      deletedAt: null,
      role: Role.ACCOUNTANT,
      isActive: true,
      ...(schoolId ? { schoolId } : {}),
    },
  });
  if (accountants === 0) {
    alerts.push({
      id: "no_accountant",
      severity: "high",
      message: "No active accountant login. Allocate one to record fees and salaries.",
      href: "/super-admin/users",
    });
  }

  const inactive = await prisma.user.count({
    where: {
      deletedAt: null,
      isActive: false,
      ...(schoolId ? { schoolId } : {}),
    },
  });
  if (inactive > 0) {
    alerts.push({
      id: "inactive_users",
      severity: "low",
      message: `${inactive} deactivated account(s). Review if any should be reactivated.`,
      href: "/super-admin/users",
    });
  }

  if (finance.paymentCount === 0 && finance.invoiceCount > 0) {
    alerts.push({
      id: "invoices_no_pay",
      severity: "medium",
      message: "Invoices exist but no payments recorded yet.",
      href: "/accountant/payments",
    });
  }

  return alerts;
}

/** Recent activity feed (derived from users + payments) */
export async function getRecentActivity(schoolId?: string | null) {
  await requireSuperAdmin();

  const [recentUsers, recentPayments] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { not: Role.SUPER_ADMIN },
        ...(schoolId ? { schoolId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        school: { select: { name: true } },
      },
    }),
    prisma.payment.findMany({
      where: schoolId
        ? { invoice: { student: { user: { schoolId } } } }
        : {},
      orderBy: { paidAt: "desc" },
      take: 8,
      select: {
        id: true,
        amount: true,
        method: true,
        paidAt: true,
        invoice: {
          select: {
            invoiceNumber: true,
            student: {
              select: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    school: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  type Item = {
    id: string;
    at: Date;
    kind: "user" | "payment";
    summary: string;
  };

  const items: Item[] = [];

  for (const u of recentUsers) {
    items.push({
      id: `u-${u.id}`,
      at: u.createdAt,
      kind: "user",
      summary: `Login created: ${u.firstName} ${u.lastName} (${u.role.replace(/_/g, " ")}) · ${u.email}${
        u.school ? ` · ${u.school.name}` : ""
      }`,
    });
  }
  for (const p of recentPayments) {
    const st = p.invoice.student.user;
    items.push({
      id: `p-${p.id}`,
      at: p.paidAt,
      kind: "payment",
      summary: `Payment GH₵${p.amount.toFixed(2)} · ${p.invoice.invoiceNumber} · ${st.firstName} ${st.lastName} · ${p.method.replace(/_/g, " ")}`,
    });
  }

  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.slice(0, 12);
}
