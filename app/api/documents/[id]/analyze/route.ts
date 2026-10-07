import {
  analyseDocumentById,
  replaceDocumentSource,
  serializeOutcome,
} from "@/lib/ai/pipeline";
import {
  asBoolean,
  asFile,
  asString,
  json,
  notFound,
  readJson,
  toErrorResponse,
} from "@/lib/api/http";
import { getStore } from "@/lib/data";

/**
 * POST /api/documents/[id]/analyze
 *
 * Re-runs the analysis for a stored document. The extracted text kept on the
 * server is used, so no re-upload is needed; if a replacement file IS supplied
 * (multipart `file`) its text replaces the stored one first.
 *
 * Body (JSON): { "force": true }  → skip the model, use the rules-based reader
 *              { "engine": "heuristic" }
 *              { "model": "google/gemini-3.8-flash" } → try this model first
 * Multipart : file (optional), force, model
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: Context): Promise<Response> {
  try {
    const { id } = await context.params;
    const store = getStore();
    if (!store.getDocument(id)) return notFound("That document does not exist.");

    const contentType = request.headers.get("content-type") ?? "";
    let forceHeuristic = false;
    let model: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      forceHeuristic =
        asBoolean(form.get("force")) === true || asString(form.get("engine")) === "heuristic";
      model = asString(form.get("model")) ?? undefined;

      const file = asFile(form.get("file"));
      if (file && file.size > 0) {
        await replaceDocumentSource(id, {
          bytes: new Uint8Array(await file.arrayBuffer()),
          fileName: file.name,
          mimeType: file.type,
        });
      }
    } else {
      const body = await readJson<{ force?: unknown; engine?: unknown; model?: unknown }>(request);
      forceHeuristic =
        asBoolean(body.force) === true || asString(body.engine)?.toLowerCase() === "heuristic";
      model = asString(body.model) ?? undefined;
    }

    const outcome = await analyseDocumentById(id, { forceHeuristic, model });
    return json(serializeOutcome(outcome));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** GET — which engine would run, and whether the source text is still stored. */
export async function GET(_request: Request, context: Context): Promise<Response> {
  try {
    const { id } = await context.params;
    const store = getStore();
    const document = store.getDocument(id);
    if (!document) return notFound("That document does not exist.");

    const { aiStatus } = await import("@/lib/ai/gateway");
    const { sourceExists } = await import("@/lib/documents/storage");

    return json({
      document,
      ai: aiStatus(),
      sourceAvailable: sourceExists(id),
      canAnalyze: sourceExists(id),
      error: sourceExists(id)
        ? null
        : "The extracted text is no longer stored for this document — upload the file again to re-analyse it.",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

