/**
 * ImpactOS — the browser-side fetch helper.
 *
 * Client components talk to the app's own route handlers through this, so the
 * error shape (`{ error: { code, message } }`) is unwrapped in exactly one
 * place and a friendly message reaches the UI. Safe in the browser only.
 */

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

async function unwrap<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown = null;
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const payload = body as { error?: { code?: unknown; message?: unknown } } | null;
    const code =
      typeof payload?.error?.code === "string" ? payload.error.code : "request_failed";
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `The request failed (${response.status}).`;
    throw new ApiClientError(code, message, response.status);
  }

  return body as T;
}

function message(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;
  return new ApiClientError(
    "network_error",
    "Could not reach the ImpactOS server. Check your connection and try again.",
    0,
  );
}

export async function apiGet<T>(path: string): Promise<T> {
  try {
    return await unwrap<T>(await fetch(path, { headers: { accept: "application/json" } }));
  } catch (error) {
    throw message(error);
  }
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  try {
    return await unwrap<T>(
      await fetch(path, {
        method,
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  } catch (error) {
    throw message(error);
  }
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return send<T>(path, "POST", body ?? {});
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return send<T>(path, "PATCH", body ?? {});
}

export function apiDelete<T>(path: string): Promise<T> {
  return send<T>(path, "DELETE");
}

/** Upload a file (and friends) as multipart/form-data. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  try {
    return await unwrap<T>(await fetch(path, { method: "POST", body: form }));
  } catch (error) {
    throw message(error);
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
