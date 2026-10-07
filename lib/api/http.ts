/**
 * ImpactOS — shared HTTP helpers for the App Router route handlers.
 *
 * Every route answers with one of two shapes: a JSON payload on success, or
 * `{ error: { code, message } }` with a meaningful status on failure. Stack
 * traces, file paths and keys never reach the browser.
 *
 * SERVER-ONLY (imported by route handlers only).
 */

import { AiError } from "../ai/gateway";
import { ExtractionError } from "../ai/extract";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function json<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data as unknown, { status: 200, ...init });
}

export function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function badRequest(message: string, code = "bad_request"): Response {
  return apiError(400, code, message);
}

export function notFound(message = "Not found."): Response {
  return apiError(404, "not_found", message);
}

const EXTRACTION_STATUS: Record<ExtractionError["code"], number> = {
  unsupported: 415,
  empty: 422,
  corrupt: 422,
  unavailable: 501,
};

const EXTRACTION_CODE: Record<ExtractionError["code"], string> = {
  unsupported: "unsupported_file_type",
  empty: "no_readable_text",
  corrupt: "unreadable_file",
  unavailable: "engine_unavailable",
};

/** Map any thrown value onto the API's error shape (never leaks internals). */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) return apiError(error.status, error.code, error.message);

  if (error instanceof ExtractionError) {
    return apiError(EXTRACTION_STATUS[error.code], EXTRACTION_CODE[error.code], error.message);
  }

  if (error instanceof AiError) {
    switch (error.code) {
      case "not_configured":
        return apiError(
          503,
          "ai_not_configured",
          "pre.dev AI is not connected in this workspace, so this request cannot be answered by a model.",
        );
      case "no_credits":
        return apiError(
          402,
          "ai_out_of_credits",
          "The workspace is out of pre.dev AI credits. Nothing was charged — try again once credits are topped up.",
        );
      case "rate_limited":
        return apiError(
          429,
          "ai_rate_limited",
          "pre.dev AI is rate-limiting this workspace right now. Please try again in a moment.",
        );
      case "timeout":
        return apiError(504, "ai_timeout", "The AI model took too long to answer. Please try again.");
      case "parse":
      case "bad_response":
        return apiError(502, "ai_bad_response", "The AI model did not return a usable answer. Please try again.");
      default:
        return apiError(502, "ai_unavailable", error.message || "pre.dev AI could not be reached.");
    }
  }

  const message = error instanceof Error && error.message ? error.message : "Something went wrong.";
  console.error("[impactos] unhandled route error:", error);
  return apiError(500, "server_error", message);
}

/* ------------------------------------------------------------------ */
/* Body / field reading                                                */
/* ------------------------------------------------------------------ */

/** Read a JSON object body, tolerating an empty or malformed one. */
export async function readJson<T extends object>(request: Request): Promise<T> {
  try {
    const text = await request.text();
    if (!text.trim()) return {} as T;
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

export function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const text = asString(value)?.toLowerCase();
  if (text === "true" || text === "1" || text === "yes") return true;
  if (text === "false" || text === "0" || text === "no") return false;
  return null;
}

/** Duck-type an uploaded `File` out of a FormData entry. */
export function asFile(value: unknown): File | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as { arrayBuffer?: unknown; name?: unknown; size?: unknown };
  return typeof candidate.arrayBuffer === "function" && typeof candidate.name === "string"
    ? (value as File)
    : null;
}

/** A required string field. Throws a 400 `ApiError` when missing. */
export function requireString(value: unknown, field: string): string {
  const text = asString(value);
  if (!text) throw new ApiError("missing_field", `\`${field}\` is required.`, 400);
  return text;
}

/** One of a fixed set of literals, or a 400. */
export function requireOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  const text = asString(value)?.toLowerCase();
  if (!text || !(allowed as readonly string[]).includes(text)) {
    throw new ApiError("invalid_field", `\`${field}\` must be one of: ${allowed.join(", ")}.`, 400);
  }
  return text as T;
}

/** One of a fixed set of literals, or null (for optional query filters). */
export function oneOfOrNull<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const text = asString(value)?.toLowerCase();
  return text && (allowed as readonly string[]).includes(text) ? (text as T) : null;
}
