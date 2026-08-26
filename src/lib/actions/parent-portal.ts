"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireParent() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    throw new Error("Unauthorized");
  }
  return session;
}

/** Linked children with class, fees, and recent marks — parent acts for the student */
export async function getParentChildrenOverview() {
  const session = await requireParent();

  const parent = await prisma.parent.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: {
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  isActive: true,
                },
              },
              section: {
                include: {
                  class: { select: { name: true } },
                },
              },
              invoices: {
                where: { deletedAt: null },
                include: {
                  academicYear: { select: { name: true } },
                  items: true,
                  payments: { orderBy: { paidAt: "desc" } },
                },
                orderBy: { createdAt: "desc" },
              },
              marks: {
                orderBy: { createdAt: "desc" },
                take: 10,
                include: {
                  exam: {
                    select: {
                      name: true,
                      subject: { select: { name: true, code: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!parent) return [];

  return parent.children.map((link) => {
    const s = link.student;
    const totalBilled = s.invoices.reduce((a, i) => a + i.totalAmount, 0);
    const totalPaid = s.invoices.reduce((a, i) => a + i.paidAmount, 0);
    const balance = totalBilled - totalPaid;
    return {
      relation: link.relation,
      studentId: s.id,
      admissionNumber: s.admissionNumber,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      email: s.user.email,
      phone: s.user.phone,
      isActive: s.user.isActive,
      className: s.section?.class.name ?? "—",
      sectionName: s.section?.name ?? "—",
      totalBilled,
      totalPaid,
      balance,
      feeStatus:
        totalBilled === 0
          ? "NO_INVOICE"
          : balance <= 0
            ? "PAID"
            : totalPaid > 0
              ? "PARTIAL"
              : "UNPAID",
      invoices: s.invoices,
      marks: s.marks,
    };
  });
}
