/**
 * SMS service for Ghana.
 *
 * Supports:
 *  - Hubtel (recommended for Ghana) when SMS_PROVIDER=hubtel
 *  - Generic HTTP webhook when SMS_PROVIDER=http
 *  - Mock/console mode when credentials are missing (development)
 *
 * Env vars (see .env.example):
 *  SMS_PROVIDER=hubtel | http | mock
 *  SMS_SENDER_ID=DISOnline
 *  HUBTEL_CLIENT_ID=
 *  HUBTEL_CLIENT_SECRET=
 *  SMS_HTTP_URL=   (for generic provider)
 *  SMS_HTTP_API_KEY=
 */

import { formatGHS } from "@/lib/currency";

export type SmsResult = {
  ok: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  /** True when no real provider was configured and we only logged */
  mocked?: boolean;
};

function normalizeGhanaPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("0") && p.length === 10) p = "+233" + p.slice(1);
  if (p.startsWith("233") && p.length === 12) p = "+" + p;
  if (!p.startsWith("+") && p.length === 9) p = "+233" + p;
  // Basic validation: +233 followed by 9 digits
  if (!/^\+233\d{9}$/.test(p)) return null;
  return p;
}

export function buildPaymentReceiptMessage(opts: {
  studentName: string;
  amount: number;
  invoiceNumber: string;
  balance: number;
  method: string;
  schoolName?: string;
  reference?: string | null;
}): string {
  const school = opts.schoolName || "School";
  const lines = [
    `${school} Fee Receipt`,
    `Student: ${opts.studentName}`,
    `Paid: ${formatGHS(opts.amount)}`,
    `Invoice: ${opts.invoiceNumber}`,
    `Method: ${opts.method.replace(/_/g, " ")}`,
    `Balance: ${formatGHS(opts.balance)}`,
  ];
  if (opts.reference) lines.push(`Ref: ${opts.reference}`);
  lines.push("Thank you.");
  return lines.join("\n");
}

async function sendViaHubtel(to: string, content: string): Promise<SmsResult> {
  const clientId = process.env.HUBTEL_CLIENT_ID;
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
  const from = process.env.SMS_SENDER_ID || "DISOnline";

  if (!clientId || !clientSecret) {
    return { ok: false, provider: "hubtel", error: "Hubtel credentials missing" };
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = `https://sms.hubtel.com/v1/messages/send?From=${encodeURIComponent(from)}&To=${encodeURIComponent(to)}&Content=${encodeURIComponent(content)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    });
    const data = (await res.json().catch(() => ({}))) as {
      MessageId?: string;
      status?: number;
      statusDescription?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        provider: "hubtel",
        error: data.statusDescription || `HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      provider: "hubtel",
      messageId: data.MessageId,
    };
  } catch (e) {
    return {
      ok: false,
      provider: "hubtel",
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

async function sendViaHttp(to: string, content: string): Promise<SmsResult> {
  const endpoint = process.env.SMS_HTTP_URL;
  const apiKey = process.env.SMS_HTTP_API_KEY;
  const from = process.env.SMS_SENDER_ID || "DISOnline";

  if (!endpoint) {
    return { ok: false, provider: "http", error: "SMS_HTTP_URL not set" };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ to, from, message: content }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, provider: "http", error: text || `HTTP ${res.status}` };
    }

    return { ok: true, provider: "http" };
  } catch (e) {
    return {
      ok: false,
      provider: "http",
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

/**
 * Send an SMS. Falls back to mock (console log) when no provider is configured.
 * Never throws — callers can ignore failures so payments still succeed.
 */
export async function sendSms(toRaw: string, content: string): Promise<SmsResult> {
  const to = normalizeGhanaPhone(toRaw);
  if (!to) {
    return {
      ok: false,
      provider: "none",
      error: `Invalid Ghana phone number: ${toRaw}`,
    };
  }

  const provider = (process.env.SMS_PROVIDER || "mock").toLowerCase();

  if (provider === "hubtel") {
    return sendViaHubtel(to, content);
  }

  if (provider === "http") {
    return sendViaHttp(to, content);
  }

  // Development / mock mode
  console.log("[SMS MOCK]", { to, content });
  return {
    ok: true,
    provider: "mock",
    mocked: true,
    messageId: `mock-${Date.now()}`,
  };
}
