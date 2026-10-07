import { deleteSource, sourceExists } from "@/lib/documents/storage";
import { json, notFound, toErrorResponse } from "@/lib/api/http";
import { getStore } from "@/lib/data";

/**
 * /api/documents/[id]
 *
 *   GET    — one document with the facts extracted from it and every finding
 *            that quotes it.
 *   DELETE — remove the document together with its extracted text, its facts
 *            and the findings that depended on it.
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
    const document = store.getDocument(id);
    if (!document) return notFound("That document does not exist.");

    return json({
      document,
      facts: store.listFacts({ documentId: id }),
      findings: store
        .listFindings()
        .filter((finding) => finding.evidence.some((row) => row.documentId === id)),
      sourceAvailable: sourceExists(id),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context): Promise<Response> {
  try {
    const { id } = await context.params;
    const store = getStore();
    const document = store.getDocument(id);
    if (!document) return notFound("That document does not exist.");

    deleteSource(id);
    const deleted = store.deleteDocument(id);

    return json({
      deleted,
      id,
      documents: store.listDocuments().length,
      findings: store.listFindings().length,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
