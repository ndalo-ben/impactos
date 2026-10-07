/**
 * ImpactOS — display formatting.
 *
 * Rules that matter for trust:
 *  - A date-only value (YYYY-MM-DD) is formatted WITHOUT time-zone conversion,
 *    so "2026-06-30" never renders as "29 Jun" for someone west of UTC.
 *  - Unparseable / missing values render an em dash, never "Invalid Date".
 */

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DASH = "\u2014";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return new Intl.NumberFormat("en-KE").format(value);
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return formatNumber(Number(value.toFixed(digits))) + "%";
}

/** "KES 25,000" — Kenyan shillings, the workspace's reporting currency. */
export function formatKes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return "KES " + new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
}

/** Whole units, e.g. 8_000_000 -> "8M". Handy for budget roll-ups. */
export function formatKesCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return "KES " + new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** Short human date: "30 Jun 2026". Date-only input is treated as calendar date. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return DASH;
  const match = DATE_ONLY.exec(value);
  if (match) {
    const [, year, month, day] = match;
    const label = MONTHS_SHORT[Number(month) - 1];
    if (label) return String(Number(day)) + " " + label + " " + year;
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** Timestamp in the viewer's local time: "30 Jun 2026, 14:05". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "3 days ago" / "in 2 hours" — for activity feeds. */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  const deltaMs = date.getTime() - Date.now();
  const abs = Math.abs(deltaMs);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000000],
    ["month", 2592000000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "minute") {
      return formatter.format(Math.round(deltaMs / ms), unit);
    }
  }
  return "just now";
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return DASH;
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size = size / 1024;
    index += 1;
  }
  return (size >= 10 ? Math.round(size) : Number(size.toFixed(1))) + " " + units[index];
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? singular + "s";
}

/** "beneficiary" | 127 -> "127 beneficiaries" */
export function countLabel(count: number, singular: string, plural?: string): string {
  return formatNumber(count) + " " + pluralize(count, singular, plural);
}
