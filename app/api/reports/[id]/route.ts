import { json, notFound, toErrorResponse } from "@/lib/api/http";
import { getStore } from "@/lib/data";

/**
 * GET /api/reports/[id] — one generated report, with its sections, citations
 * and trust summary.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: Context): Promise<Response> {
  try {
    const { id } = await context.params;
    const store = getStore();
    const report = store.getReport(id);
    if (!report) return notFound("That report does not exist.");

    const documents = store.listDocuments();
    const findings = store.listFindings();

    return json({
      report,
      // Resolve the citations the report carries so a viewer can follow them.
      sources: report.sources
        .map((sourceId) => documents.find((document) => document.id === sourceId))
        .filter((document): document is NonNullable<typeof document> => Boolean(document)),
      citedFindings: findings.filter((finding) =>
        report.sections.some((section) => section.citations.includes(finding.id)),
      ),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
