/** Ghana school year terms for DIS ONLINE billing */
export const SCHOOL_TERMS = [
  "1st Term",
  "2nd Term",
  "3rd Term",
] as const;

export type SchoolTerm = (typeof SCHOOL_TERMS)[number];

export const FEE_FREQUENCIES = [
  "1st Term",
  "2nd Term",
  "3rd Term",
  "Full year",
  "Monthly",
  "One-time",
] as const;

export function isSchoolTerm(v: string): v is SchoolTerm {
  return (SCHOOL_TERMS as readonly string[]).includes(v);
}
