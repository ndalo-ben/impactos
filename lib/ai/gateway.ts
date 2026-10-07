/**
 * ImpactOS — pre.dev AI gateway client.
 *
 * One tiny, typed surface over `$PREDEV_API_URL/v1` (OpenAI-compatible). Every
 * model in the pre.dev catalog is reachable with the same call, the workspace
 * key is attached server-side, and requests are attributed to this project with
 * `x-predev-project-id`.
 *
 * SERVER-ONLY: this reads the workspace key from the environment. Never import
 * it from a `"use client"` module — the browser should talk to
 * `/predev-ai/*` (see src/app/predev-ai) or to a route handler instead.
 *
 * Behaviour that matters to callers:
 *   - `isAiConfigured()` tells you whether analysing with a model is possible at
 *     all, so a feature can fall back *before* paying for a failed request.
 *   - `chat()` fails over across models on transient errors, and never retries a
 *     `402` (out of credits) — retrying that in a loop is just noise.
 *   - `chatJson()` asks for a JSON object and parses tolerantly (models
 *     sometimes wrap JSON in a ```json fence or add a sentence around it).
 */

/** Ordered cheap-first defaults for JSON extraction work. */
export const DEFAULT_CHAT_MODELS: string[] = [
  "deepseek/deepseek-v4.1-flash",
  "google/gemini-3.8-flash",
  "openai/gpt-oss-safeguard-20b",
];

export type AiErrorCode =
  | "not_configured"
  | "no_credits"
  | "rate_limited"
  | "timeout"
  | "upstream"
  | "bad_response"
  | "parse";

export interface AiErrorOptions {
  status?: number;
  retryable?: boolean;
  model?: string;
  details?: string;
}

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly model?: string;
  readonly details?: string;

  constructor(code: AiErrorCode, message: string, options: AiErrorOptions = {}) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.status = options.status ?? 0;
    this.retryable = options.retryable ?? false;
    this.model = options.model;
    this.details = options.details;
  }
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/** `$PREDEV_API_URL` with any trailing slash removed, or null when unset. */
export function aiBaseUrl(): string | null {
  const raw = process.env.PREDEV_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function isAiConfigured(): boolean {
  return Boolean(aiBaseUrl() && process.env.PREDEV_API_KEY?.trim());
}

export interface AiStatus {
  configured: boolean;
  baseUrl: string | null;
  models: string[];
  /** Whether calls are attributed to this project. */
  attributed: boolean;
  /** A short, key-free readiness sentence for the UI. */
  message: string;
}

/** Safe-to-expose status (never includes the key). */
export function aiStatus(): AiStatus {
  const configured = isAiConfigured();
  const attributed = Boolean(process.env.PREDEV_PROJECT_ID?.trim());
  return {
    configured,
    baseUrl: configured ? aiBaseUrl() : null,
    models: DEFAULT_CHAT_MODELS,
    attributed,
    message: configured
      ? "pre.dev AI is connected — documents are analysed with a language model."
      : "pre.dev AI is not configured for this workspace — documents are analysed with the built-in rules-based fallback.",
  };
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export interface ChatTextPart {
  type: "text";
  text: string;
}

export interface ChatImagePart {
  type: "image_url";
  image_url: { url: string };
}

export type ChatPart = ChatTextPart | ChatImagePart;
export type ChatContent = string | ChatPart[];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: ChatContent;
}

export interface ChatOptions {
  messages: ChatMessage[];
  /** Try this model first. */
  model?: string;
  /** The full failover list; defaults to `DEFAULT_CHAT_MODELS`. */
  models?: string[];
  maxTokens?: number;
  temperature?: number;
  /** Ask the provider for a JSON object response. */
  json?: boolean;
  timeoutMs?: number;
}

export interface ChatResult {
  content: string;
  model: string;
}

function resolveModels(options: ChatOptions): string[] {
  const candidates = [
    ...(options.model ? [options.model] : []),
    ...(options.models ?? DEFAULT_CHAT_MODELS),
  ];
  return [...new Set(candidates.map((m) => m.trim()).filter(Boolean))];
}

function codeForStatus(status: number): { code: AiErrorCode; retryable: boolean } {
  if (status === 402) return { code: "no_credits", retryable: false };
  if (status === 429) return { code: "rate_limited", retryable: true };
  if (status === 408 || status === 504) return { code: "timeout", retryable: true };
  if (status === 401 || status === 403) return { code: "not_configured", retryable: false };
  return { code: "upstream", retryable: status >= 500 || status === 400 || status === 404 };
}

async function callModel(model: string, options: ChatOptions): Promise<string> {
  const baseUrl = aiBaseUrl();
  const apiKey = process.env.PREDEV_API_KEY?.trim();
  if (!baseUrl || !apiKey) {
    throw new AiError("not_configured", "pre.dev AI is not configured for this workspace.", {
      model,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 90_000);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        ...(process.env.PREDEV_PROJECT_ID
          ? { "x-predev-project-id": process.env.PREDEV_PROJECT_ID }
          : {}),
      },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.2,
        // Extraction answer quality collapses when the model burns the whole
        // budget thinking, so reasoning is explicitly disabled.
        reasoning: { enabled: false },
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  } catch (error) {
    const aborted = (error as { name?: string } | null)?.name === "AbortError";
    throw new AiError(
      aborted ? "timeout" : "upstream",
      aborted
        ? `The AI request timed out after ${Math.round((options.timeoutMs ?? 90_000) / 1000)}s.`
        : "Could not reach pre.dev AI. Please try again.",
      { model, retryable: true, details: (error as Error)?.message },
    );
  } finally {
    clearTimeout(timer);
  }

  const bodyText = await response.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const { code, retryable } = codeForStatus(response.status);
    const upstreamMessage = isRecordWithMessage(payload) ?? bodyText.slice(0, 300);
    throw new AiError(code, upstreamMessage || `pre.dev AI returned HTTP ${response.status}.`, {
      status: response.status,
      retryable,
      model,
      details: bodyText.slice(0, 600),
    });
  }

  const choice = (payload as { choices?: Array<{ message?: { content?: unknown }; finish_reason?: string }> })
    ?.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new AiError("bad_response", "The model returned an empty answer.", {
      status: response.status,
      retryable: true,
      model,
      details: `finish_reason=${choice?.finish_reason ?? "unknown"}`,
    });
  }

  return content;
}

function isRecordWithMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

/**
 * Send a chat request, failing over across models on retryable errors. Throws
 * `AiError` when every candidate fails.
 */
export async function chat(options: ChatOptions): Promise<ChatResult> {
  if (!isAiConfigured()) {
    throw new AiError("not_configured", "pre.dev AI is not configured for this workspace.");
  }

  const models = resolveModels(options);
  let lastError: AiError | null = null;

  for (const model of models) {
    try {
      const content = await callModel(model, options);
      return { content, model };
    } catch (error) {
      const aiError =
        error instanceof AiError
          ? error
          : new AiError("upstream", (error as Error)?.message || "Unknown AI error.", {
              retryable: true,
              model,
            });

      // Out of credits / bad key will fail identically on every model.
      if (aiError.code === "not_configured" || aiError.code === "no_credits") throw aiError;
      lastError = aiError;
    }
  }

  throw lastError ?? new AiError("upstream", "Every AI model failed.", { retryable: false });
}

/* ------------------------------------------------------------------ */
/* Tolerant JSON                                                       */
/* ------------------------------------------------------------------ */

/** Parse JSON even when a model wraps it in prose or a ```json fence. */
export function parseJsonObject<T>(raw: string): T {
  let text = String(raw).trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      /* fall through to the raw parse */
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiError("parse", "The model did not return valid JSON.");
  }
}

/** Like `chat()`, but asks for and returns parsed JSON. */
export async function chatJson<T>(
  options: ChatOptions,
): Promise<{ value: T; model: string; raw: string }> {
  const { content, model } = await chat({ ...options, json: true });
  return { value: parseJsonObject<T>(content), model, raw: content };
}
