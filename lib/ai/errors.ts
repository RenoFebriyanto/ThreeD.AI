// lib/ai/errors.ts
// Provider errors never reach the UI raw: @google/genai puts the whole response
// body JSON into err.message, which is unreadable for users. Everything is
// normalised here into one short Indonesian sentence, and transient failures
// (429/5xx, network) are retried with a small backoff.

export type AiErrorKind =
  | "quota"
  | "overloaded"
  | "auth"
  | "safety"
  | "invalid"
  | "server"
  | "network"
  | "unknown";

export interface AiErrorInfo {
  message: string;
  kind: AiErrorKind;
  retryable: boolean;
  status?: number;
  code?: string;
}

/** Error that carries the normalised info so HTTP routes can expose `kind`. */
export class AiError extends Error {
  readonly info: AiErrorInfo;

  constructor(info: AiErrorInfo) {
    super(info.message);
    this.name = "AiError";
    this.info = info;
  }
}

export function aiErrorInfo(err: unknown): AiErrorInfo {
  return err instanceof AiError ? err.info : describeAiError(err);
}

function rawMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function parseError(err: unknown): { status?: number; code?: string; providerMessage?: string } {
  let status: number | undefined;
  let code: string | undefined;
  let providerMessage: string | undefined;

  if (err && typeof err === "object") {
    const record = err as Record<string, unknown>;

    if (typeof record.status === "number") status = record.status;

    const message = typeof record.message === "string" ? record.message.trim() : "";
    if (message.startsWith("{")) {
      // @google/genai: err.message = '{"error":{"code":503,"status":"UNAVAILABLE",...}}'
      try {
        const body = JSON.parse(message) as {
          error?: { code?: number; message?: string; status?: string };
        };
        if (body.error) {
          if (typeof body.error.code === "number") status ??= body.error.code;
          code = body.error.status;
          providerMessage = body.error.message;
        }
      } catch {
        // not JSON after all — fall through
      }
    } else if (message) {
      providerMessage = message;
    }

    // Anthropic: err.error = { type, message }
    const nested = record.error as { type?: string; message?: string } | undefined;
    if (nested && typeof nested === "object") {
      if (typeof nested.type === "string") code ??= nested.type;
      if (typeof nested.message === "string") providerMessage ??= nested.message;
    }
  }

  return { status, code, providerMessage };
}

/** Parses the "Please retry in 4h39m0.5s" hint Google puts in quota errors. */
function parseRetryDelay(text: string): number | undefined {
  const match = text.match(/retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
  if (!match) return undefined;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;

  return total > 0 ? total : undefined;
}

export function describeAiError(err: unknown): AiErrorInfo {
  const { status, code, providerMessage } = parseError(err);
  const normalized = (code ?? "").toUpperCase();
  const detail = providerMessage ?? rawMessage(err);

  if (status === 503 || normalized === "UNAVAILABLE") {
    return {
      status,
      code,
      kind: "overloaded",
      retryable: true,
      message: "Model AI sedang kelebihan beban (503). Biasanya sementara — coba lagi dalam beberapa detik.",
    };
  }

  if (status === 429 || normalized === "RESOURCE_EXHAUSTED") {
    const retrySeconds = parseRetryDelay(detail);
    const cloudflareQuota =
      /cloudflare|workers ai|neurons/i.test(detail) &&
      /daily|quota|limit|neurons/i.test(detail);
    const hardQuota =
      /limit:\s*0\b/.test(detail) ||
      (retrySeconds !== undefined && retrySeconds > 60) ||
      cloudflareQuota;

    return {
      status,
      code,
      kind: "quota",
      retryable: !hardQuota,
      message: hardQuota
        ? cloudflareQuota
          ? "Kuota gratis harian Cloudflare Workers AI habis. Kuota direset setiap hari; coba lagi setelah reset."
          : "Kuota model AI habis atau tidak tersedia di free tier. Periksa paket dan billing penyedia AI."
        : "Rate limit AI tercapai (429). Tunggu sebentar lalu coba lagi.",
    };
  }

  if (
    status === 401 ||
    normalized === "UNAUTHENTICATED" ||
    normalized === "AUTHENTICATION_ERROR" ||
    /api key not valid|api_key_invalid|invalid api key|incorrect api key/i.test(detail)
  ) {
    return {
      status,
      code,
      kind: "auth",
      retryable: false,
      message: "Kredensial AI tidak valid atau ditolak. Periksa API key dan token penyedia AI di .env.",
    };
  }

  if (status === 403 || normalized === "PERMISSION_DENIED") {
    return {
      status,
      code,
      kind: "auth",
      retryable: false,
      message: "Project atau API key tidak memiliki izin untuk fitur/model AI ini. Periksa pembatasan API key, akses model Gemini, dan billing project.",
    };
  }

  if (normalized === "SAFETY" || /safety|blocked|prohibited/i.test(detail)) {
    return {
      status,
      code,
      kind: "safety",
      retryable: false,
      message: "Prompt diblokir safety filter. Ubah tema atau kalimat prompt-nya.",
    };
  }

  if (status === 400 || normalized === "INVALID_ARGUMENT" || normalized === "FAILED_PRECONDITION") {
    return {
      status,
      code,
      kind: "invalid",
      retryable: false,
      message: "Permintaan ditolak model AI. Coba ubah tema atau prompt-nya.",
    };
  }

  if (status !== undefined && status >= 500) {
    return {
      status,
      code,
      kind: "server",
      retryable: true,
      message: `Server AI sedang bermasalah (${status}). Coba lagi sebentar lagi.`,
    };
  }

  if (/fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|AbortError|timeout|Koneksi ke Pollinations|Pollinations\.AI gagal/i.test(detail)) {
    return {
      status,
      code,
      kind: "network",
      retryable: true,
      message: "Koneksi ke penyedia AI gagal. Periksa jaringan lalu coba lagi.",
    };
  }

  return {
    status,
    code,
    kind: "unknown",
    retryable: true,
    message: "Gagal menghubungi model AI. Coba lagi sebentar lagi.",
  };
}

/**
 * Safe message for an HTTP response: keeps our own friendly errors, but never
 * leaks a raw provider payload (which is JSON text) to the client.
 */
export function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const message = err.message.trim();
    if (message && !message.startsWith("{") && message.length <= 300) return message;
  }

  return fallback;
}

/**
 * Runs an AI call with retries for transient failures only.
 * Non-retryable errors (bad key, safety block, hard quota) fail fast.
 * Uses longer back-off for 429 rate-limit errors so Gemini free tier can recover.
 */
export async function withAiRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const info = describeAiError(err);

      if (!info.retryable || attempt === attempts) {
        // Keep the raw provider payload in server logs for debugging, never in
        // the HTTP response.
        console.error(
          `[ai] attempt ${attempt}/${attempts} ${info.status ?? "-"} ${info.code ?? "-"} ${rawMessage(err).slice(0, 500)}`
        );
        throw new AiError(info);
      }

      // Rate-limit (429) needs a longer back-off than a generic transient error
      // so the Gemini free-tier per-minute quota has time to reset.
      const isRateLimit = info.status === 429 || info.kind === "quota";
      const backoff = isRateLimit
        ? 5000 * attempt + Math.random() * 2000   // 5–7s, 10–12s
        : 700 * attempt + Math.random() * 300;    // 0.7–1s, 1.4–1.7s

      console.warn(
        `[ai] attempt ${attempt}/${attempts} ${info.status ?? "-"} ${info.kind} — retrying in ${Math.round(backoff)}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw new AiError(describeAiError(lastError));
}
