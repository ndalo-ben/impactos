import { generateReport, REPORT_TYPES } from "@/lib/ai/report";
import { asString, json, readJson, requireOneOf, toErrorResponse } from "@/lib/api/http";
import { getStore } from "@/lib/data";

/**
 * /api/reports
 *
 *   GET  — the reports generated so far (newest first).
 *   POST — generate one from the workspace: { "type": "donor_update",
 *          "title"?, "period"?, "projectId"? }. The narrative is drafted by
 *          pre.dev AI when it is connected, and assembled deterministically
 *          otherwise; either way the trust summary comes from the store.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(): Promise<Response> {
  try {
    const store = getStore();
    const reports = store.listReports();
    return json({
      reports,
      total: reports.length,
      types: REPORT_TYPES,
      counts: {
        drafts: reports.filter((report) => report.status === "draft").length,
        final: reports.filter((report) => report.status === "final").length,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJson<{
      type?: unknown;
      title?: unknown;
      period?: unknown;
      projectId?: unknown;
    }>(request);

    const type = requireOneOf(body.type, REPORT_TYPES, "type");
    const projectId = asString(body.projectId);
    const store = getStore();
    if (projectId && !store.getProject(projectId)) {
      return json({ error: { code: "unknown_project", message: "That project does not exist." } }, { status: 400 });
    }

    const outcome = await generateReport({
      type,
      title: asString(body.title) ?? undefined,
      period: asString(body.period) ?? undefined,
      projectId,
    });

    return json(
      { report: outcome.report, source: outcome.source, fallbackReason: outcome.fallbackReason },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
