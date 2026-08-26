/**
 * Ghana basic school class ladder (Creche → JHS 3) aligned to GES / WAEC BECE pathway.
 * Nursery 1 and Nursery 2 for schools with two nursery classes.
 * JHS 3 is the WAEC BECE examination class.
 */
export const GHANA_CLASS_LEVELS = [
  "Creche",
  "Nursery 1",
  "Nursery 2",
  "KG 1",
  "KG 2",
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "JHS 1",
  "JHS 2",
  "JHS 3",
] as const;

export type GhanaClassLevel = (typeof GHANA_CLASS_LEVELS)[number];

/** Display order for sorting (legacy "Nursery" sorts with Nursery 1) */
export const GHANA_CLASS_ORDER: Record<string, number> = {
  ...Object.fromEntries(GHANA_CLASS_LEVELS.map((name, i) => [name, i + 1])),
  Nursery: 2,
};

export function sortClassesByGhanaLevel<T extends { name: string }>(classes: T[]): T[] {
  return [...classes].sort((a, b) => {
    const oa = GHANA_CLASS_ORDER[a.name] ?? 100;
    const ob = GHANA_CLASS_ORDER[b.name] ?? 100;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });
}

/** GES / WAEC-related subject catalogue for basic schools */
export type GesSubjectDef = { name: string; code: string };

export const GES_SUBJECTS_EARLY: GesSubjectDef[] = [
  { name: "Language and Literacy", code: "LAL" },
  { name: "Numeracy", code: "NUM" },
  { name: "Our World Our People", code: "OWOP" },
  { name: "Creative Arts", code: "CA" },
  { name: "Physical Education", code: "PE" },
  { name: "Religious and Moral Education", code: "RME" },
];

/** Primary (P1–P6) — GES curriculum core */
export const GES_SUBJECTS_PRIMARY: GesSubjectDef[] = [
  { name: "English Language", code: "ENG" },
  { name: "Mathematics", code: "MATH" },
  { name: "Science", code: "SCI" },
  { name: "Our World Our People", code: "OWOP" },
  { name: "Religious and Moral Education", code: "RME" },
  { name: "History", code: "HIST" },
  { name: "Creative Arts", code: "CA" },
  { name: "Computing", code: "ICT" },
  { name: "Ghanaian Language", code: "GHAN" },
  { name: "French", code: "FRE" },
  { name: "Physical Education", code: "PE" },
];

/**
 * JHS 1–3 — GES Common Core / WAEC BECE subjects
 * (candidates typically sit BECE at the end of JHS 3)
 */
export const GES_SUBJECTS_JHS: GesSubjectDef[] = [
  { name: "English Language", code: "ENG" },
  { name: "Mathematics", code: "MATH" },
  { name: "Integrated Science", code: "INTSCI" },
  { name: "Social Studies", code: "SOST" },
  { name: "Religious and Moral Education", code: "RME" },
  { name: "Ghanaian Language", code: "GHAN" },
  { name: "French", code: "FRE" },
  { name: "Career Technology", code: "CTECH" },
  { name: "Computing", code: "ICT" },
  { name: "Creative Arts and Design", code: "CAD" },
  { name: "Physical Education", code: "PE" },
];

export type GesBand = "EARLY" | "PRIMARY" | "JHS" | "ALL";

export function getGesSubjects(band: GesBand): GesSubjectDef[] {
  if (band === "EARLY") return GES_SUBJECTS_EARLY;
  if (band === "PRIMARY") return GES_SUBJECTS_PRIMARY;
  if (band === "JHS") return GES_SUBJECTS_JHS;
  const map = new Map<string, GesSubjectDef>();
  for (const s of [
    ...GES_SUBJECTS_EARLY,
    ...GES_SUBJECTS_PRIMARY,
    ...GES_SUBJECTS_JHS,
  ]) {
    if (!map.has(s.code)) map.set(s.code, s);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
