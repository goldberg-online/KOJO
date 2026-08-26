"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { formatGHS } from "@/lib/currency";
import { buildPaymentReceiptMessage, sendSms } from "@/lib/sms";

async function requireStaff() {
  const session = await auth();
  // Finance: Accountant and Super Admin only — School Admin has no finance access
  if (
    !session?.user ||
    !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)
  ) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function getSchoolId(session: Awaited<ReturnType<typeof auth>>) {
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "SUPER_ADMIN") return null;
  if (!session.user.schoolId) throw new Error("No school linked");
  return session.user.schoolId;
}

/** Prefer session school; Super Admin falls back to first school for write ops */
async function resolveWriteSchoolId(
  session: Awaited<ReturnType<typeof auth>>
): Promise<string | null> {
  if (!session?.user) return null;
  if (session.user.schoolId) return session.user.schoolId;
  if (session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    return first?.id ?? null;
  }
  return null;
}

// ---------- Fee Structures ----------

export async function getFeeStructures() {
  const session = await requireStaff();
  const schoolId = await getSchoolId(session);

  return prisma.feeStructure.findMany({
    where: {
      deletedAt: null,
      ...(schoolId ? { schoolId } : {}),
    },
    include: {
      section: {
        include: { class: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFeeStructure(formData: FormData) {
  const session = await requireStaff();
  const schoolId = await resolveWriteSchoolId(session);
  if (!schoolId) return { error: "School is required" };

  const name = (formData.get("name") as string)?.trim();
  const amount = parseFloat(formData.get("amount") as string);
  const frequency = (formData.get("frequency") as string) || "1st Term";
  const sectionId = (formData.get("sectionId") as string) || null;
  const dueDay = formData.get("dueDayOfMonth")
    ? parseInt(formData.get("dueDayOfMonth") as string, 10)
    : null;

  if (!name || isNaN(amount) || amount <= 0) {
    return { error: "Name and a valid amount are required" };
  }

  await prisma.feeStructure.create({
    data: {
      schoolId,
      name,
      amount,
      frequency,
      sectionId: sectionId || undefined,
      dueDayOfMonth: dueDay && !isNaN(dueDay) ? dueDay : undefined,
    },
  });

  revalidatePath("/accountant/structures");
  revalidatePath("/school-admin/fees");
  revalidatePath("/accountant");
  return { success: true };
}

// ---------- Invoices ----------

export async function getInvoices() {
  const session = await requireStaff();
  const schoolId = await getSchoolId(session);

  return prisma.invoice.findMany({
    where: {
      deletedAt: null,
      ...(schoolId
        ? { student: { user: { schoolId } } }
        : {}),
    },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      academicYear: { select: { name: true } },
      items: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStudentsForInvoices() {
  const session = await requireStaff();
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
    orderBy: { admissionNumber: "asc" },
  });
}

export async function getAcademicYearsForSchool() {
  const session = await requireStaff();
  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    schoolId = first?.id ?? null;
  }
  if (!schoolId) return [];

  return prisma.academicYear.findMany({
    where: { schoolId, deletedAt: null },
    orderBy: { startDate: "desc" },
  });
}

export async function getSectionsForSchool() {
  const session = await requireStaff();
  const schoolId = await resolveWriteSchoolId(session);
  if (!schoolId) return [];

  return prisma.section.findMany({
    where: { deletedAt: null, class: { schoolId, deletedAt: null } },
    include: { class: { select: { name: true } } },
    orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
  });
}

function nextInvoiceNumber() {
  const ts = Date.now().toString().slice(-8);
  return `DIS-BILL-${ts}`;
}

function nextReceiptNumber() {
  const ts = Date.now().toString().slice(-8);
  const rnd = Math.floor(100 + Math.random() * 900);
  return `DIS-RCP-${ts}${rnd}`;
}

export async function createInvoice(formData: FormData) {
  const session = await requireStaff();
  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "SUPER_ADMIN") {
    const first = await prisma.school.findFirst({ where: { deletedAt: null } });
    schoolId = first?.id ?? null;
  }
  if (!schoolId) return { error: "School is required" };

  const studentId = (formData.get("studentId") as string) || "";
  const academicYearId = (formData.get("academicYearId") as string) || "";
  const feeStructureId = (formData.get("feeStructureId") as string) || "";
  const dueDate = (formData.get("dueDate") as string) || "";
  const term = ((formData.get("term") as string) || "").trim() || "1st Term";
  const customAmount = formData.get("amount")
    ? parseFloat(formData.get("amount") as string)
    : null;

  if (!studentId || !academicYearId || !feeStructureId || !dueDate) {
    return {
      error: "Student, academic year, fee structure, and due date are required",
    };
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null, user: { schoolId } },
  });
  if (!student) return { error: "Student not found in this school" };

  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId, deletedAt: null },
  });
  if (!year) return { error: "Academic year not found" };

  const structure = await prisma.feeStructure.findFirst({
    where: { id: feeStructureId, schoolId, deletedAt: null },
  });
  if (!structure) return { error: "Fee structure not found" };

  const amount =
    customAmount && !isNaN(customAmount) && customAmount > 0
      ? customAmount
      : structure.amount;

  const description = `${structure.name} — ${term}`;

  await prisma.invoice.create({
    data: {
      studentId,
      academicYearId,
      invoiceNumber: nextInvoiceNumber(),
      totalAmount: amount,
      paidAmount: 0,
      status: InvoiceStatus.PENDING,
      dueDate: new Date(dueDate),
      items: {
        create: [
          {
            feeStructureId: structure.id,
            description,
            amount,
          },
        ],
      },
    },
  });

  revalidatePath("/accountant/invoices");
  revalidatePath("/accountant/payments");
  revalidatePath("/accountant/ledger");
  revalidatePath("/accountant");
  revalidatePath("/student/fees");
  revalidatePath("/parent/fees");
  return { success: true };
}

// ---------- Payments ----------

export async function getPayments() {
  const session = await requireStaff();
  const schoolId = await getSchoolId(session);

  return prisma.payment.findMany({
    where: schoolId
      ? { invoice: { student: { user: { schoolId } } } }
      : {},
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          totalAmount: true,
          student: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
      recordedBy: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { paidAt: "desc" },
    take: 100,
  });
}

export async function getOpenInvoices() {
  const session = await requireStaff();
  const schoolId = await resolveWriteSchoolId(session);
  if (!schoolId) return [];

  return prisma.invoice.findMany({
    where: {
      deletedAt: null,
      status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
      student: { user: { schoolId } },
    },
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}

export async function recordPayment(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  // Prefer accountant; school admin can also record if they have an accountant profile
  // or we create a lightweight path for school admin via a system accountant lookup.
  let accountantId: string | null = null;

  if (session.user.role === "ACCOUNTANT") {
    const profile = await prisma.accountant.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) return { error: "Accountant profile not found" };
    accountantId = profile.id;
  } else if (session.user.role === "SUPER_ADMIN") {
    const schoolId = session.user.schoolId;
    const acc = await prisma.accountant.findFirst({
      where: {
        deletedAt: null,
        ...(schoolId ? { user: { schoolId } } : {}),
      },
    });
    if (!acc) {
      return { error: "No accountant profile found. Create an accountant first." };
    }
    accountantId = acc.id;
  } else {
    return { error: "Only accountants can record payments" };
  }

  const invoiceId = formData.get("invoiceId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const method = (formData.get("method") as string) || "CASH";
  const reference = (formData.get("reference") as string) || null;

  if (!invoiceId || isNaN(amount) || amount <= 0) {
    return { error: "Invoice and a valid amount are required" };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      student: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              school: { select: { name: true, phone: true } },
            },
          },
          parents: {
            include: {
              parent: {
                include: {
                  user: { select: { phone: true, firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!invoice || invoice.deletedAt) return { error: "Invoice not found" };

  const remaining = invoice.totalAmount - invoice.paidAmount;
  if (amount > remaining + 0.001) {
    return { error: `Amount exceeds remaining balance (${formatGHS(remaining)})` };
  }

  const newPaid = invoice.paidAmount + amount;
  let status: InvoiceStatus = InvoiceStatus.PARTIALLY_PAID;
  if (newPaid >= invoice.totalAmount) status = InvoiceStatus.PAID;
  else if (new Date() > invoice.dueDate) status = InvoiceStatus.OVERDUE;

  const balanceAfter = invoice.totalAmount - newPaid;

  const receiptNumber = nextReceiptNumber();

  const payment = await prisma.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: {
        invoiceId,
        amount,
        method: method as PaymentMethod,
        reference: reference || undefined,
        receiptNumber,
        recordedById: accountantId!,
      },
    });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: newPaid, status },
    });
    return pay;
  });

  // --- SMS receipt ---
  // Prefer student phone; if missing, send to each linked parent who has a phone.
  const studentName = `${invoice.student.user.firstName} ${invoice.student.user.lastName}`;
  const schoolName = invoice.student.user.school?.name;
  const receiptText = buildPaymentReceiptMessage({
    studentName,
    amount,
    invoiceNumber: invoice.invoiceNumber,
    balance: balanceAfter,
    method,
    schoolName: schoolName || undefined,
    reference,
  });

  const phones = new Set<string>();
  if (invoice.student.user.phone) phones.add(invoice.student.user.phone);
  for (const link of invoice.student.parents) {
    if (link.parent.user.phone) phones.add(link.parent.user.phone);
  }

  let smsSent = 0;
  let smsFailed = 0;
  const smsDetails: string[] = [];

  for (const phone of phones) {
    const result = await sendSms(phone, receiptText);
    if (result.ok) {
      smsSent += 1;
      if (result.mocked) smsDetails.push(`Mock SMS logged for ${phone}`);
    } else {
      smsFailed += 1;
      console.error("[SMS] Failed to send receipt to", phone, result.error);
    }
  }

  if (phones.size === 0) {
    console.warn(
      "[SMS] No phone number on student or parent for invoice",
      invoice.invoiceNumber
    );
  }

  revalidatePath("/accountant/payments");
  revalidatePath("/accountant/invoices");
  revalidatePath("/school-admin/fees");
  revalidatePath("/accountant");
  revalidatePath("/student/fees");
  revalidatePath("/parent/fees");

  revalidatePath(`/accountant/receipts/${payment.id}`);

  return {
    success: true,
    paymentId: payment.id,
    receiptNumber: payment.receiptNumber,
    sms: {
      recipients: phones.size,
      sent: smsSent,
      failed: smsFailed,
      note:
        phones.size === 0
          ? "Payment saved, but no phone number on student/parent profile — SMS not sent."
          : smsSent > 0
            ? `Payment saved. SMS receipt sent to ${smsSent} number(s).`
            : "Payment saved, but SMS could not be delivered. Check SMS settings.",
    },
  };
}

/** Full payment row for printable receipt */
export async function getPaymentReceipt(paymentId: string) {
  const session = await requireStaff();
  const schoolId =
    session.user.role === "SUPER_ADMIN" ? null : session.user.schoolId;

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      ...(schoolId
        ? { invoice: { student: { user: { schoolId } } } }
        : {}),
    },
    include: {
      invoice: {
        include: {
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  school: {
                    select: { name: true, address: true, phone: true, email: true },
                  },
                },
              },
              section: { include: { class: { select: { name: true } } } },
            },
          },
          items: true,
          academicYear: { select: { name: true } },
        },
      },
      recordedBy: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return payment;
}

// ---------- Student / Parent views ----------

export async function getMyInvoices() {
  const session = await auth();
  if (!session?.user) return [];

  if (session.user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    });
    if (!student) return [];

    return prisma.invoice.findMany({
      where: { studentId: student.id, deletedAt: null },
      include: {
        academicYear: { select: { name: true } },
        items: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (session.user.role === "PARENT") {
    const parent = await prisma.parent.findUnique({
      where: { userId: session.user.id },
      include: { children: { select: { studentId: true } } },
    });
    if (!parent) return [];

    const studentIds = parent.children.map((c) => c.studentId);
    return prisma.invoice.findMany({
      where: { studentId: { in: studentIds }, deletedAt: null },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        academicYear: { select: { name: true } },
        items: true,
        payments: { orderBy: { paidAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return [];
}

export async function getFeeStats() {
  const session = await requireStaff();
  const schoolId =
    session.user.role === "SUPER_ADMIN" ? null : session.user.schoolId;

  // SUPER_ADMIN: platform-wide totals; others: their school only
  const schoolFilter = schoolId
    ? { student: { user: { schoolId } } }
    : {};
  const structureFilter = schoolId
    ? { schoolId, deletedAt: null }
    : { deletedAt: null };

  const [structures, invoices, pendingAgg, paidAgg] = await Promise.all([
    prisma.feeStructure.count({ where: structureFilter }),
    prisma.invoice.count({
      where: { deletedAt: null, ...schoolFilter },
    }),
    prisma.invoice.aggregate({
      where: {
        deletedAt: null,
        ...schoolFilter,
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
      },
      _sum: { totalAmount: true, paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { deletedAt: null, ...schoolFilter },
      _sum: { paidAmount: true },
    }),
  ]);

  const pendingTotal =
    (pendingAgg._sum.totalAmount ?? 0) - (pendingAgg._sum.paidAmount ?? 0);

  return {
    structures,
    invoices,
    pending: pendingTotal < 0 ? 0 : pendingTotal,
    collected: paidAgg._sum.paidAmount ?? 0,
  };
}

export async function updateFeeStructure(formData: FormData) {
  const session = await requireStaff();
  const schoolId = session.user.schoolId;
  if (!schoolId && session.user.role !== "SUPER_ADMIN") {
    return { error: "No school" };
  }

  const id = (formData.get("id") as string) || "";
  const name = ((formData.get("name") as string) || "").trim();
  const amount = parseFloat(formData.get("amount") as string);
  const frequency = ((formData.get("frequency") as string) || "").trim();

  if (!id || !name || isNaN(amount) || amount < 0) {
    return { error: "Valid name and amount required" };
  }

  const existing = await prisma.feeStructure.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(schoolId ? { schoolId } : {}),
    },
  });
  if (!existing) return { error: "Fee structure not found" };

  await prisma.feeStructure.update({
    where: { id },
    data: {
      name,
      amount,
      frequency: frequency || existing.frequency,
    },
  });

  revalidatePath("/accountant/structures");
  return { success: true };
}

export async function softDeleteFeeStructure(formData: FormData) {
  const session = await requireStaff();
  const id = (formData.get("id") as string) || "";
  if (!id) return { error: "Missing id" };

  const schoolId = session.user.schoolId;
  const existing = await prisma.feeStructure.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(schoolId ? { schoolId } : {}),
    },
  });
  if (!existing) return { error: "Not found" };

  await prisma.feeStructure.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/accountant/structures");
  return { success: true };
}
