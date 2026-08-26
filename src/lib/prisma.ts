import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "prisma/.env") });

/**
 * Supabase pooler + Next.js hot-reload can exhaust the default pool (limit 5, timeout 10s).
 * Normalize DATABASE_URL with safer pool settings for local and serverless.
 */
function databaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  try {
    const u = new URL(raw);
    const isPooler =
      u.hostname.includes("pooler.supabase.com") ||
      u.port === "6543" ||
      u.searchParams.get("pgbouncer") === "true";

    // Transaction pooler: keep Prisma's pool small (one app process, many reloads)
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", isPooler ? "5" : "10");
    }
    if (!u.searchParams.has("pool_timeout")) {
      // Default 10s is too aggressive under pooler latency
      u.searchParams.set("pool_timeout", "30");
    }
    if (isPooler && !u.searchParams.has("pgbouncer")) {
      u.searchParams.set("pgbouncer", "true");
    }
    // Supabase requires SSL
    if (!u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return raw;
  }
}

const resolvedUrl = databaseUrl();
if (resolvedUrl) {
  process.env.DATABASE_URL = resolvedUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    datasources: resolvedUrl
      ? { db: { url: resolvedUrl } }
      : undefined,
  });
}

// Reuse one client across hot reloads (dev) and within the same server process
export const prisma = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = prisma;

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      const retryable =
        msg.includes("connection pool") ||
        msg.includes("Timed out fetching") ||
        msg.includes("Can't reach database") ||
        msg.includes("P1001") ||
        msg.includes("P2024");
      if (!retryable || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}
