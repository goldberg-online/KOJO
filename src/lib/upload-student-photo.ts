import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

/**
 * Save student photo under public/uploads/students and return public URL path.
 */
export async function saveStudentPhoto(
  file: File | null | undefined
): Promise<{ url?: string; error?: string }> {
  if (!file || typeof file === "string" || file.size === 0) {
    return {};
  }

  if (!ALLOWED.has(file.type)) {
    return { error: "Photo must be JPG, PNG, or WebP" };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Photo must be 2 MB or smaller" };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

  const dir = path.join(process.cwd(), "public", "uploads", "students");
  await mkdir(dir, { recursive: true });

  const name = `stu_${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`;
  const full = path.join(dir, name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(full, buffer);

  return { url: `/uploads/students/${name}` };
}
