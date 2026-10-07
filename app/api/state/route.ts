import { aiStatus } from "@/lib/ai/gateway";
import { json, toErrorResponse } from "@/lib/api/http";
import { getStore } from "@/lib/data";

/**
 * GET /api/state — everything the app shell needs in one call: who the
 * organisation is, the headline metrics, the projects, documents, findings,
 * reports and activities, plus whether pre.dev AI is connected.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const store = getStore();
    return json({
      organization: store.getOrganization(),
      metrics: store.getMetrics(),
      projects: store.listProjects(),
      documents: store.listDocuments(),
      findings: store.listFindings(),
      reports: store.listReports(),
      activities: store.listActivities(),
      ai: aiStatus(),
      store: { kind: store.kind, location: store.location },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
