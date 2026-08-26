import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let db: "ok" | "fail" = "fail";
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      ),
    ]);
    db = "ok";
  } catch {
    db = "fail";
  }

  return NextResponse.json({
    ok: true,
    message: "API is working",
    db,
    time: new Date().toISOString(),
  });
}
