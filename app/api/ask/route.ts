import { answerWorkspaceQuestion } from "@/lib/ai/ask";
import type { ChatMessage } from "@/lib/ai/gateway";
import { json, readJson, requireString, toErrorResponse } from "@/lib/api/http";

/**
 * POST /api/ask
 *
 * Ask a question about this workspace. The answer is grounded in a briefing
 * built from the repository (metrics, projects, findings, documents, extracted
 * figures) and cites the findings/documents it used.
 *
 * Body: { "question": string, "history"?: [{ role, content }] }
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function normaliseHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const out: ChatMessage[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const item = entry as { role?: unknown; content?: unknown };
    const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
    const content = typeof item.content === "string" ? item.content.trim().slice(0, 1500) : "";
    if (!role || !content) continue;
    out.push({ role, content });
  }
  return out.slice(-6);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJson<{ question?: unknown; history?: unknown }>(request);
    const question = requireString(body.question, "question");
    const answer = await answerWorkspaceQuestion(question, normaliseHistory(body.history));
    return json(answer);
  } catch (error) {
    return toErrorResponse(error);
  }
}
