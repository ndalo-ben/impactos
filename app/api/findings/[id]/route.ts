import {
  asString,
  badRequest,
  json,
  notFound,
  readJson,
  toErrorResponse,
} from "@/lib/api/http";
import { getStore } from "@/lib/data";
import type { FindingStatus } from "@/lib/types";

/**
 * /api/findings/[id]
 *
 *   GET    — one finding with its evidence and the documents behind it.
 *   PATCH  — review it: { "status": "open" | "reviewed" | "dismissed" }.
 *   DELETE — remove it (and its evidence) from the workspace.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: readonly FindingStatus[] = ["open", "reviewed", "dismissed"];

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: Context): Promise<Response> {
  try {
    const { id } = await context.params;
    const finding = getStore().getFinding(id);
    if (!finding) return notFound("That finding does not exist.");
    return json({ finding });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    const { id } = await context.params;
    const body = await readJson<{ status?: unknown }>(request);
    const status = asString(body.status)?.toLowerCase();

    if (!status || !(STATUSES as readonly string[]).includes(status)) {
      return badRequest("`status` must be one of: open, reviewed, dismissed.");
    }

    const updated = getStore().updateFindingStatus(id, status as FindingStatus);
    if (!updated) return notFound("That finding does not exist.");

    return json({ finding: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context): Promise<Response> {
  try {
    const { id } = await context.params;
    const deleted = getStore().deleteFinding(id);
    if (!deleted) return notFound("That finding does not exist.");
    return json({ deleted, id, findings: getStore().listFindings().length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
