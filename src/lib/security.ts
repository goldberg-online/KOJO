/**
 * Security helpers for DIS ONLINE
 */

const isProd = process.env.NODE_ENV === "production";

/** Auth secret: never use a fixed fallback in production */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret && secret.length >= 16) return secret;

  if (isProd) {
    throw new Error(
      "AUTH_SECRET (or NEXTAUTH_SECRET) must be set to a long random value in production"
    );
  }

  // Dev only — unique per process so sessions don't silently share a public string across machines
  const g = globalThis as unknown as { __disDevSecret?: string };
  if (!g.__disDevSecret) {
    g.__disDevSecret =
      "dev-only-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    console.warn(
      "[security] AUTH_SECRET not set — using ephemeral dev secret. Set AUTH_SECRET before production."
    );
  }
  return g.__disDevSecret;
}

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory rate limit (per server process).
 * key e.g. "login:email@x.com" or "reset:ip"
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true };
}

/** Clear expired buckets occasionally */
export function pruneRateLimits() {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(k);
  }
}

export const PASSWORD_MIN = 8;

export function passwordPolicyError(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`;
  }
  // Optional strength: at least one letter and one number for new passwords
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number";
  }
  return null;
}
