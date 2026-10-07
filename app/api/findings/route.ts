import { asString, json, oneOfOrNull, toErrorResponse } from "@/lib/api/http";
import { getStore } from "@/lib/data";
import type { FindingSeverity, FindingStatus, FindingType } from "@/lib/types";

/**
 * GET /api/findings — the review queue.
 *
 * Filters: status=open|reviewed|dismissed · type=inconsistency|missing_information|
 * financial_mapping|verified · severity=critical|warning|info|success ·
 * projectId · q (free text over title/summary/detail/assessment).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: readonly FindingStatus[] = ["open", "reviewed", "dismissed"];
const TYPES: readonly FindingType[] = [
  "inconsistency",
  "missing_information",
  "financial_mapping",
  "verified",
];
const SEVERITIES: readonly FindingSeverity[] = ["critical", "warning", "info", "success"];

export async function GET(request: Request): Promise<Response> {
  try {
    const store = getStore();
    const url = new URL(request.url);
    const query = asString(url.searchParams.get("q"))?.toLowerCase() ?? null;
    const projectId = asString(url.searchParams.get("projectId"));

    let findings = store.listFindings({
      status: oneOfOrNull<FindingStatus>(url.searchParams.get("status"), STATUSES) ?? undefined,
      type: oneOfOrNull<FindingType>(url.searchParams.get("type"), TYPES) ?? undefined,
      severity:
        oneOfOrNull<FindingSeverity>(url.searchParams.get("severity"), SEVERITIES) ?? undefined,
      projectId: projectId ?? undefined,
    });

    if (query) {
      findings = findings.filter((finding) =>
        `${finding.title} ${finding.summary} ${finding.detail} ${finding.assessment}`
          .toLowerCase()
          .includes(query),
      );
    }

    const all = store.listFindings();
    return json({
      findings,
      total: findings.length,
      counts: {
        total: all.length,
        open: all.filter((finding) => finding.status === "open").length,
        reviewed: all.filter((finding) => finding.status === "reviewed").length,
        dismissed: all.filter((finding) => finding.status === "dismissed").length,
        criticalOpen: all.filter(
          (finding) => finding.status === "open" && finding.severity === "critical",
        ).length,
      },
      filters: { status: url.searchParams.get("status"), type: url.searchParams.get("type"), projectId, q: query },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
