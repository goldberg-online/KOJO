import { prisma } from "@/lib/prisma";

export const SEQUENCE_KEYS = {
  STUDENT_ADMISSION: "STUDENT_ADMISSION",
  STAFF_EMPLOYEE: "STAFF_EMPLOYEE",
} as const;

const STUDENT_PREFIX = "DISST";
const STUDENT_MAX = 1000;

/** Staff IDs: DISSTF101 … DISSTF500 */
const STAFF_PREFIX = "DISSTF";
const STAFF_MIN = 101;
const STAFF_MAX = 500;

function formatDisst(n: number): string {
  if (n < 1 || n > STUDENT_MAX) {
    throw new Error(`Student sequence out of range: ${n}`);
  }
  // DISST01 … DISST09, DISST10 … DISST99, DISST100 … DISST1000
  const body = n <= 99 ? String(n).padStart(2, "0") : String(n);
  return `${STUDENT_PREFIX}${body}`;
}

/**
 * Bootstrap sequence value from existing DISST#### admission numbers
 * so re-deploy / empty sequence table stays consistent.
 */
async function syncStudentSequenceFromData(schoolId: string): Promise<number> {
  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      user: { schoolId },
      admissionNumber: { startsWith: STUDENT_PREFIX },
    },
    select: { admissionNumber: true },
  });

  let max = 0;
  for (const s of students) {
    const m = new RegExp(`^${STUDENT_PREFIX}(\\d+)$`, "i").exec(s.admissionNumber);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return max;
}

/**
 * Atomically allocate the next integer for a school + key.
 * Uses a row lock via interactive transaction + update.
 */
export async function nextSequenceValue(
  schoolId: string,
  key: string
): Promise<number> {
  return prisma.$transaction(
    async (tx) => {
      let row = await tx.idSequence.findUnique({
        where: { schoolId_key: { schoolId, key } },
      });

      if (!row) {
        // First use: seed from existing students if this is student admissions
        let start = 0;
        if (key === SEQUENCE_KEYS.STUDENT_ADMISSION) {
          start = await syncStudentSequenceFromData(schoolId);
        } else if (key === SEQUENCE_KEYS.STAFF_EMPLOYEE) {
          start = await syncStaffSequenceFromData(schoolId);
          // First auto ID should be 101 → store 100 so increment yields 101
          if (start < STAFF_MIN - 1) start = STAFF_MIN - 1;
        }
        row = await tx.idSequence.create({
          data: { schoolId, key, value: start },
        });
      }

      if (key === SEQUENCE_KEYS.STUDENT_ADMISSION && row.value >= STUDENT_MAX) {
        throw new Error(
          "Student ID limit reached (DISST1000). Contact administrator."
        );
      }
      // Staff sequence stores the last issued number (starts bootstrapped at 100 so first is 101)
      if (key === SEQUENCE_KEYS.STAFF_EMPLOYEE && row.value >= STAFF_MAX) {
        throw new Error(
          "Staff ID limit reached (DISSTF500). Contact administrator."
        );
      }

      const updated = await tx.idSequence.update({
        where: { id: row.id },
        data: { value: { increment: 1 } },
      });

      return updated.value;
    },
    {
      // Serializable reduces double-issue risk under concurrency
      isolationLevel: "Serializable",
      maxWait: 5000,
      timeout: 10000,
    }
  );
}

/** Next DISST01-style admission number for a school (DB sequence). */
export async function nextDisStudentAdmission(schoolId: string): Promise<string> {
  const n = await nextSequenceValue(schoolId, SEQUENCE_KEYS.STUDENT_ADMISSION);
  return formatDisst(n);
}

/** Peek current counter without incrementing (for UI hints). */
export async function peekStudentAdmissionCounter(schoolId: string): Promise<{
  current: number;
  nextId: string;
}> {
  const row = await prisma.idSequence.findUnique({
    where: {
      schoolId_key: { schoolId, key: SEQUENCE_KEYS.STUDENT_ADMISSION },
    },
  });
  let current = row?.value ?? 0;
  if (!row) {
    current = await syncStudentSequenceFromData(schoolId);
  }
  const next = current + 1;
  return {
    current,
    nextId: next <= STUDENT_MAX ? formatDisst(next) : "LIMIT",
  };
}

async function syncStaffSequenceFromData(schoolId: string): Promise<number> {
  const [teachers, accountants] = await Promise.all([
    prisma.teacher.findMany({
      where: {
        deletedAt: null,
        user: { schoolId },
        employeeId: { startsWith: STAFF_PREFIX },
      },
      select: { employeeId: true },
    }),
    prisma.accountant.findMany({
      where: {
        deletedAt: null,
        user: { schoolId },
        employeeId: { startsWith: STAFF_PREFIX },
      },
      select: { employeeId: true },
    }),
  ]);

  let max = STAFF_MIN - 1; // 100
  for (const row of [...teachers, ...accountants]) {
    const m = new RegExp(`^${STAFF_PREFIX}(\d+)$`, "i").exec(row.employeeId);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return max;
}

function formatStaffId(n: number): string {
  if (n < STAFF_MIN || n > STAFF_MAX) {
    throw new Error(`Staff sequence out of range: ${n} (allowed ${STAFF_MIN}–${STAFF_MAX})`);
  }
  return `${STAFF_PREFIX}${n}`;
}

/** Next staff ID DISSTF101 … DISSTF500 for a school */
export async function nextDisStaffId(schoolId: string): Promise<string> {
  const n = await nextSequenceValue(schoolId, SEQUENCE_KEYS.STAFF_EMPLOYEE);
  return formatStaffId(n);
}
