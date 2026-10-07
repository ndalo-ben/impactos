/**
 * ImpactOS — grounded question answering over the workspace.
 *
 * The model is given one thing: a factual briefing built from the repository
 * (metrics, projects, findings, documents, extracted figures). It is told to
 * answer only from that, and to say so when the workspace does not contain the
 * answer. Citations are resolved back to real finding and document ids by
 * matching the answer text, so the UI can link what the model said back to the
 * record that supports it.
 *
 * SERVER-ONLY.
 */

import type { Document, Finding } from "@/lib/types";
import { getStore } from "@/lib/repository";
import { chat, type ChatMessage } from "./gateway";
import { workspaceBriefing } from "./briefing";

export interface AskCitation {
  id: string;
  label: string;
  kind: "finding" | "document";
}

export interface AskAnswer {
  answer: string;
  model: string;
  /** Citations are resolved from the workspace, never produced by the model. */
  citations: AskCitation[];
}

const SYSTEM_PROMPT = [
  "You are ImpactOS, the analyst inside a nonprofit programme-intelligence workspace.",
  "You answer questions about the organisation using ONLY the WORKSPACE DATA given to you.",
  "",
  "Rules:",
  "- Never invent a figure, a project, a document or a finding. If the answer is not in the data, say that in one sentence and stop.",
  "- Quote figures exactly as they appear in the data, with their units.",
  "- Name the documents and findings your answer relies on, by name.",
  "- Be direct and practical: 2-5 sentences, or a short list. No preamble.",
].join("\n");

function citationsFor(
  answer: string,
  findings: Finding[],
  documents: Document[],
): AskCitation[] {
  const haystack = answer.toLowerCase();
  const out: AskCitation[] = [];

  for (const finding of findings) {
    if (finding.title.length > 6 && haystack.includes(finding.title.toLowerCase())) {
      out.push({ id: finding.id, label: finding.title, kind: "finding" });
    }
  }
  for (const document of documents) {
    if (document.displayName.length > 4 && haystack.includes(document.displayName.toLowerCase())) {
      out.push({ id: document.id, label: document.displayName, kind: "document" });
    }
  }

  return out.slice(0, 6);
}

/**
 * Answer a question about the workspace. Throws `AiError` (mapped to a clear
 * HTTP status by the route) when pre.dev AI is unreachable — this feature has
 * no honest fallback, so it never pretends to have answered.
 */
export async function answerWorkspaceQuestion(
  question: string,
  history: ChatMessage[] = [],
): Promise<AskAnswer> {
  const store = getStore();
  const briefing = workspaceBriefing(store);

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-6),
    {
      role: "user",
      content: `WORKSPACE DATA\n${briefing.text}\n\nQUESTION: ${question}`,
    },
  ];

  const { content, model } = await chat({ messages, maxTokens: 1200, temperature: 0.2 });
  const answer = content.trim();

  return {
    answer,
    model,
    citations: citationsFor(answer, briefing.findings, briefing.documents),
  };
}
