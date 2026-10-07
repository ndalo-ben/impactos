/**
 * ImpactOS — small pure text helpers shared by the analysis pipeline.
 *
 * Nothing here touches the network, the filesystem or the AI gateway, so it is
 * safe to unit-test in isolation and to import from anywhere.
 */

/* ------------------------------------------------------------------ */
/* Coercion                                                            */
/* ------------------------------------------------------------------ */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export function strOrNull(value: unknown): string | null {
  const value2 = str(value);
  return value2.length > 0 ? value2 : null;
}

/** Pull a number out of "KES 3,150,000", "80%", "120 beneficiaries", 120 … */
export function parseNumeric(value: string): number | null {
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function numberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return parseNumeric(value);
  return null;
}

/** Coerce an arbitrary value into one of a known set of string literals. */
export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const normalised = str(value).toLowerCase().replace(/[\s-]+/g, "_");
  return (allowed as readonly string[]).includes(normalised) ? (normalised as T) : fallback;
}

/* ------------------------------------------------------------------ */
/* Strings                                                             */
/* ------------------------------------------------------------------ */

export function clip(value: unknown, max: number): string {
  const text = str(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function slug(input: unknown, max = 48): string {
  const value = str(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (value || "item").slice(0, max).replace(/_+$/g, "") || "item";
}

export function humanize(input: unknown): string {
  return str(input)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (first) => first.toUpperCase());
}

/** Case/punctuation-insensitive key used to spot the same finding twice. */
export function normalizeTitle(input: unknown): string {
  return str(input).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Collapse noisy whitespace and cap the length, keeping head + tail. */
export function clipText(text: string, max: number): { text: string; truncated: boolean } {
  const cleaned = String(text).replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= max) return { text: cleaned, truncated: false };
  const head = Math.floor(max * 0.7);
  const tail = Math.max(0, max - head);
  return {
    text: `${cleaned.slice(0, head)}\n\n…[middle of the document omitted]…\n\n${cleaned.slice(
      cleaned.length - tail,
    )}`,
    truncated: true,
  };
}

/* ------------------------------------------------------------------ */
/* Sentences + locators                                                */
/* ------------------------------------------------------------------ */

export interface PageLike {
  label: string;
  text: string;
}

/** Split prose into sentence-ish units without pulling in a tokeniser. */
export function splitSentences(text: string): string[] {
  return String(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

/**
 * Where did this quote come from? Prefers a page whose text contains the quote
 * (so PDF "p.3" / spreadsheet `Sheet "Register"` labels are used); falls back to
 * the first page.
 */
export function locatorForQuote(pages: PageLike[], quote: string): string {
  const needle = str(quote).slice(0, 40).toLowerCase();
  if (needle.length >= 12) {
    for (const page of pages) {
      if (page.text.toLowerCase().includes(needle)) return page.label;
    }
  }
  return pages[0]?.label ?? "document text";
}

/** English number words that turn up in narrative reports. */
export const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
};

export function toNumber(raw: unknown): number | null {
  const direct = parseNumeric(str(raw));
  if (direct !== null) return direct;
  const word = WORD_NUMBERS[str(raw).toLowerCase()];
  return word ?? null;
}
