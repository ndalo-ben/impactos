import { analyseUpload, serializeOutcome } from "@/lib/ai/pipeline";
import {
  apiError,
  asBoolean,
  asFile,
  asString,
  badRequest,
  json,
  oneOfOrNull,
  toErrorResponse,
} from "@/lib/api/http";
import { getStore } from "@/lib/data";
import type { DocumentStatus } from "@/lib/types";

/**
 * /api/documents
 *
 *   GET  — list documents (optionally filtered by status / project / text)
 *   POST — upload one file as multipart/form-data (`file`, optional
 *          `projectId`, `analyze=false` to store without analysing,
 *          `force=true` to skip the model and use the rules-based reader).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const STATUSES: readonly DocumentStatus[] = ["uploaded", "processing", "analyzed", "failed"];

export async function GET(request: Request): Promise<Response> {
  try {
    const store = getStore();
    const url = new URL(request.url);
    const status = oneOfOrNull<DocumentStatus>(url.searchParams.get("status"), STATUSES);
    const projectId = asString(url.searchParams.get("projectId"));
    const query = asString(url.searchParams.get("q"))?.toLowerCase() ?? null;
    const limit = Number(url.searchParams.get("limit") ?? 0);

    let documents = store.listDocuments();
    if (status) documents = documents.filter((document) => document.status === status);
    if (projectId) documents = documents.filter((document) => document.projectId === projectId);
    if (query) {
      documents = documents.filter((document) =>
        `${document.displayName} ${document.fileName} ${document.summary ?? ""}`
          .toLowerCase()
          .includes(query),
      );
    }

    const total = documents.length;
    if (Number.isFinite(limit) && limit > 0) documents = documents.slice(0, limit);

    return json({ documents, total, filters: { status, projectId, q: query } });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return badRequest(
        "Upload the document as multipart/form-data with the file in the `file` field.",
      );
    }

    const form = await request.formData();
    const file = asFile(form.get("file"));
    if (!file) return badRequest("Attach the document in the `file` field.");
    if (file.size === 0) return badRequest("That file is empty.");
    if (file.size > MAX_UPLOAD_BYTES) {
      return apiError(
        413,
        "file_too_large",
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 25 MB.`,
      );
    }

    const store = getStore();
    const projectId = asString(form.get("projectId"));
    if (projectId && !store.getProject(projectId)) {
      return badRequest("That project does not exist.", "unknown_project");
    }

    const outcome = await analyseUpload({
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name,
      mimeType: file.type,
      projectId,
      analyze: asBoolean(form.get("analyze")) !== false,
      options: {
        forceHeuristic:
          asBoolean(form.get("force")) === true || asString(form.get("engine")) === "heuristic",
      },
    });

    return json(serializeOutcome(outcome), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
