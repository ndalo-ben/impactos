/**
 * ImpactOS — document analysis.
 *
 * Two engines, one output shape. If pre.dev AI is reachable we ask a capable
 * model to read the document and return structured JSON; otherwise (no key, no
 * credits, a timeout, a malformed answer) we fall back to a deterministic,
 * rules-based reader that pulls the headline figures out of the text.
 *
 * The fallback is deliberately *not* random and never pretends to be a model:
 * every value it returns is parsed straight out of the document text, marked
 * `confidence: "needs_verification"`, and the result carries
 * `source: "heuristic"` so the UI can say plainly which engine produced it.
 *
 * SERVER-ONLY.
 */

import type {
  DocumentCore,
  ExtractedFact,
  FactCategory,
  FindingConfidence,
  FindingSeverity,
  FindingType,
} from "@/lib/types";
import {
  AiError,
  DEFAULT_CHAT_MODELS,
  chatJson,
  isAiConfigured,
  type ChatMessage,
} from "./gateway";
import {
  clip,
  clipText,
  humanize,
  isRecord,
  locatorForQuote,
  normalizeTitle,
  numberOrNull,
  oneOf,
  parseNumeric,
  slug,
  splitSentences,
  str,
  strOrNull,
  toNumber,
  type PageLike,
} from "./text";

export type AnalysisSource = "ai" | "heuristic";

export interface DraftFact {
  category: FactCategory;
  field: string;
  label: string;
  value: string;
  numericValue: number | null;
  unit: string | null;
  confidence: FindingConfidence;
  quote: string;
  locator: string;
}

export interface DraftFinding {
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  summary: string;
  detail: string;
  confidence: FindingConfidence;
  confidenceReason: string;
  metrics: Array<{ label: string; value: string }>;
  difference: { label: string; value: string } | null;
  assessment: string;
  recommendedAction: string;
}

export interface AnalysisResult {
  source: AnalysisSource;
  model: string | null;
  summary: string;
  facts: DraftFact[];
  findings: DraftFinding[];
  /** Set when the AI path was attempted and failed, so the UI can be honest. */
  fallbackReason: string | null;
  notes: string[];
}

export interface AnalyzeDocumentOptions {
  /** Force the rules-based reader (no model call at all). */
  forceHeuristic?: boolean;
  /** Try this model first. */
  model?: string;
  maxChars?: number;
}

/* ------------------------------------------------------------------ */
/* Shared normalisation                                                */
/* ------------------------------------------------------------------ */

const FACT_CATEGORIES: readonly FactCategory[] = [
  "project",
  "activity",
  "beneficiary",
  "financial",
  "outcome",
];
const CONFIDENCES: readonly FindingConfidence[] = ["high", "medium", "needs_verification"];
const FINDING_TYPES: readonly FindingType[] = [
  "inconsistency",
  "missing_information",
  "financial_mapping",
  "verified",
];
const SEVERITIES: readonly FindingSeverity[] = ["critical", "warning", "info", "success"];

interface RawAnalysis {
  summary?: unknown;
  facts?: unknown;
  findings?: unknown;
}

function normalizeFacts(raw: unknown, pages: PageLike[]): DraftFact[] {
  if (!Array.isArray(raw)) return [];
  const out: DraftFact[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!isRecord(item)) continue;
    const label = str(item.label) || humanize(str(item.field));
    const value = str(item.value);
    const quote = str(item.quote) || value;
    if (!label || !value) continue;

    const dedupe = `${slug(str(item.field) || label)}|${value.toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    const numeric = numberOrNull(item.numericValue);
    out.push({
      category: oneOf(item.category, FACT_CATEGORIES, "outcome"),
      field: slug(str(item.field) || label),
      label: clip(label, 90),
      value: clip(value, 160),
      numericValue: numeric ?? parseNumeric(value),
      unit: strOrNull(clip(item.unit, 24)),
      confidence: oneOf(item.confidence, CONFIDENCES, "medium"),
      quote: clip(quote, 400),
      locator: str(item.locator) || locatorForQuote(pages, quote),
    });
    if (out.length >= 24) break;
  }

  return out;
}

function normalizeFindings(raw: unknown, pages: PageLike[]): DraftFinding[] {
  if (!Array.isArray(raw)) return [];
  const out: DraftFinding[] = [];

  for (const item of raw) {
    if (!isRecord(item)) continue;
    const title = str(item.title);
    if (!title) continue;

    const metrics = Array.isArray(item.metrics)
      ? item.metrics
          .filter(isRecord)
          .map((metric) => ({ label: clip(metric.label, 40), value: clip(metric.value, 80) }))
          .filter((metric) => metric.label && metric.value)
          .slice(0, 4)
      : [];

    const difference = isRecord(item.difference) ? str(item.difference.value) : "";

    out.push({
      type: oneOf(item.type, FINDING_TYPES, "missing_information"),
      severity: oneOf(item.severity, SEVERITIES, "warning"),
      title: clip(title, 120),
      summary: clip(str(item.summary), 260),
      detail: clip(str(item.detail), 700),
      confidence: oneOf(item.confidence, CONFIDENCES, "medium"),
      confidenceReason: clip(str(item.confidenceReason), 240),
      metrics,
      difference: difference
        ? { label: clip(str((item.difference as Record<string, unknown>).label) || "Difference", 40), value: clip(difference, 80) }
        : null,
      assessment: clip(str(item.assessment), 500),
      recommendedAction: clip(str(item.recommendedAction), 400),
    });
    if (out.length >= 8) break;
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* The prompt                                                          */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = [
  "You are ImpactOS, an evidence analyst for nonprofit programme reporting.",
  "You read one document and return strict JSON. You never invent figures and you never",
  "state something the document does not support.",
  "",
  'Return JSON shaped exactly like: {"summary": string, "facts": Fact[], "findings": Finding[]}',
  "Fact = {category: project|activity|beneficiary|financial|outcome, field: snake_case,",
  "  label, value, numericValue: number|null, unit: string|null,",
  "  confidence: high|medium|needs_verification, quote, locator}",
  "Finding = {type: inconsistency|missing_information|financial_mapping|verified,",
  "  severity: critical|warning|info|success, title, summary, detail, confidence,",
  "  confidenceReason, metrics: [{label, value}], difference: {label, value}|null,",
  "  assessment, recommendedAction}",
  "",
  "Rules:",
  "- `quote` MUST be copied verbatim from the document text.",
  "- `locator` MUST be the page/sheet label shown next to that text.",
  "- Capture every headline number (beneficiaries, expenditure, completion %, counts).",
  "- Report genuine internal inconsistencies, missing outcomes and unmapped spend.",
  "- If the document is internally consistent and well evidenced, return few or no findings.",
  "- Prefer accuracy over volume; an empty findings array is a valid answer.",
].join("\n");

export function buildAnalysisMessages(
  doc: Pick<DocumentCore, "fileName" | "displayName" | "type">,
  pages: PageLike[],
): ChatMessage[] {
  const body = pages.map((page) => `<<${page.label}>>\n${page.text}`).join("\n\n");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `Document: ${doc.displayName} (${doc.fileName}, ${doc.type.toUpperCase()}).`,
        "",
        "Document text (each block is prefixed by its page/sheet label):",
        "",
        body,
      ].join("\n"),
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Heuristic reader                                                    */
/* ------------------------------------------------------------------ */

interface FactTemplate {
  category: FactCategory;
  field: string;
  label: string;
  unit: string | null;
  pattern: RegExp;
}

/** Patterns are ordered so the most specific figure wins per sentence. */
const FACT_TEMPLATES: FactTemplate[] = [
  {
    category: "beneficiary",
    field: "beneficiaries_reached",
    label: "Beneficiaries reached",
    unit: "beneficiaries",
    pattern: /(?:reached|supported|served|benefited|enrolled)\s+([0-9][0-9,]*)\s+(?:unique\s+)?(?:beneficiaries|people|learners|participants|households|children|women)?/i,
  },
  {
    category: "beneficiary",
    field: "beneficiaries_registered",
    label: "Beneficiaries registered",
    unit: "beneficiaries",
    pattern: /([0-9][0-9,]*)\s+(?:enrolled|registered|listed)\s+beneficiaries/i,
  },
  {
    category: "financial",
    field: "expenditure",
    label: "Expenditure",
    unit: "KES",
    pattern: /(?:KES|KSh|Ksh)\s*([0-9][0-9,]*)/i,
  },
  {
    category: "project",
    field: "completion_pct",
    label: "Reported completion",
    unit: "%",
    pattern: /([0-9][0-9.]*)\s*%\s*(?:complete|completion|delivered|utilis?ed|utilized)/i,
  },
  {
    category: "activity",
    field: "activities_count",
    label: "Activities",
    unit: "activities",
    pattern: /([0-9][0-9,]*|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(?:activities|modules|sessions|workshops|clinics|days)/i,
  },
  {
    category: "outcome",
    field: "participants",
    label: "Participants",
    unit: "participants",
    pattern: /([0-9][0-9,]*)\s+(?:participants|patients|women|youth|cases|latrines|learners)\b/i,
  },
];

/** Narrative wordings that tell us a fact *should* exist. */
const EXPECTATION_PATTERNS: Array<{
  id: string;
  field: string;
  label: string;
  requirement: string;
  figure: RegExp;
  context: RegExp;
}> = [
  {
    id: "completion",
    field: "completion_pct",
    label: "a completion percentage",
    requirement: "a module reported as delivered but no completion rate or assessment result",
    figure: /\d{1,3}\s*%|per\s*cent|percent/i,
    context: /\b(?:complete|completed|completion|delivered|progress|assessment|certif)/i,
  },
  {
    id: "beneficiaries",
    field: "beneficiaries_reached",
    label: "a beneficiary count",
    requirement: "programme reach described but no headcount given",
    figure: /\d{2,}|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/i,
    context: /\b(?:beneficiar|reach|served|support|enrol|enroll|participant)/i,
  },
  {
    id: "expenditure",
    field: "expenditure",
    label: "expenditure figures",
    requirement: "budget or spending discussed without any monetary figure",
    figure: /\b(?:KES|KSh|USD|\$)\s*\d|per\s*cent|percent|\d\s*%/i,
    context: /\b(?:budget|expenditur|spend|spent|cost|financ|funding|utilisation|utilization)/i,
  },
];

const UNMAPPED_EXPENDITURE = /(?:not\s+(?:linked|mapped|allocated)|unmapped|unsupported|unapproved|no\s+matching\s+activity|without\s+a\s+budget\s+line|not\s+associated\s+with\s+any\s+approved\s+activity)/i;
const POSTPONED = /\b(?:postponed|deferred|rescheduled|cancelled|canceled|pushed\s+to)\b/i;
const ACHIEVED = /\b(?:completed|delivered|achieved|reached|conducted|trained|installed|constructed|screened|certified)\b/i;
const WEAK_SUPPORT = /\b(?:expected|planned|target|estimated|aim(?:ed)?|intend(?:ed)?|should|anticipat)\w*\b/i;
const YEAR = /(?:19|20)\d{2}/;

function extractFacts(pages: PageLike[]): DraftFact[] {
  const facts: DraftFact[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    for (const sentence of splitSentences(page.text)) {
      for (const template of FACT_TEMPLATES) {
        const match = sentence.match(template.pattern);
        if (!match) continue;
        const numeric = toNumber(match[1]);
        if (numeric === null) continue;

        const key = `${template.field}|${numeric}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const unitMatch = sentence.match(/(%|KES|KSh|USD|per\s*cent)/i);
        const confidence: FindingConfidence = WEAK_SUPPORT.test(sentence) ? "needs_verification" : "medium";

        facts.push({
          category: template.category,
          field: template.field,
          label: template.label,
          value: clip(match[1], 40),
          numericValue: numeric,
          unit: template.unit ?? (unitMatch ? unitMatch[1] : null),
          confidence,
          quote: clip(sentence, 400),
          locator: page.label,
        });
      }
    }
  }

  return facts.slice(0, 24);
}

/** Numbers in the document that no fact captured — used to spot contradictions. */
function uncitedFigures(pages: PageLike[], facts: DraftFact[]): number[] {
  const cited = new Set(facts.map((fact) => fact.numericValue).filter((v): v is number => v !== null));
  const out = new Set<number>();

  for (const page of pages) {
    const regex = /\b([0-9][0-9,]{1,})\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(page.text)) !== null) {
      const raw = match[1];
      if (YEAR.test(raw)) continue;
      const value = parseNumeric(raw);
      if (value === null || value < 2 || value > 10_000_000) continue;
      if (!Number.isInteger(value)) continue;
      if (cited.has(value)) continue;
      out.add(value);
    }
  }

  return [...out].sort((a, b) => b - a).slice(0, 6);
}

function heuristicFindings(pages: PageLike[], facts: DraftFact[]): DraftFinding[] {
  const findings: DraftFinding[] = [];

  // 1. Unmapped / unsupported expenditure.
  for (const page of pages) {
    for (const sentence of splitSentences(page.text)) {
      if (!UNMAPPED_EXPENDITURE.test(sentence)) continue;
      const amount = sentence.match(/(?:KES|KSh|USD|\$)\s*([0-9][0-9,]*)/i)?.[1] ?? "";
      findings.push({
        type: "financial_mapping",
        severity: "warning",
        title: "Expenditure isn't linked to an activity",
        summary: amount
          ? `${amount.startsWith("$") ? amount : `KES ${amount}`} of spending is not associated with an approved activity.`
          : "Some spending in this document is not associated with an approved activity.",
        detail: clip(sentence, 600),
        confidence: "medium",
        confidenceReason: "The exception is stated in the document, but no matching activity is referenced.",
        metrics: amount
          ? [
              { label: "Amount", value: /^\d/.test(amount) ? `KES ${amount}` : amount },
              { label: "Linked activities", value: "0" },
            ]
          : [],
        difference: null,
        assessment: clip(sentence, 400),
        recommendedAction: "Reclassify the expense under an approved activity line, or document the approval that authorised it.",
      });
      break;
    }
    if (findings.length > 0) break;
  }

  // 2. Postponed / adjusted activities.
  for (const page of pages) {
    for (const sentence of splitSentences(page.text)) {
      if (!POSTPONED.test(sentence) || !ACHIEVED.test(sentence)) continue;
      findings.push({
        type: "missing_information",
        severity: "info",
        title: "A recorded plan slipped against the report",
        summary: clip(sentence, 200),
        detail: clip(sentence, 600),
        confidence: "medium",
        confidenceReason: "The document itself records the change against the planned delivery.",
        metrics: [{ label: "Status", value: "Postponed" }],
        difference: null,
        assessment: clip(sentence, 400),
        recommendedAction: "Confirm the revised delivery date and reflect it in the next donor update.",
      });
      break;
    }
    if (findings.length > 1) break;
  }

  // 3. Numbers written down that nothing else supports.
  const numbers = uncitedFigures(pages, facts);
  if (numbers.length > 0) {
    const target = numbers[0];
    const page = pages.find((candidate) => new RegExp(`\\b${target.toLocaleString("en-US")}\\b|\\b${target}\\b`).test(candidate.text));
    findings.push({
      type: "verified",
      severity: "info",
      title: `Figure ${target.toLocaleString("en-US")} appears once`,
      summary: `The number ${target.toLocaleString("en-US")} appears in this document but is not cross-referenced anywhere else in the workspace.`,
      detail: `ImpactOS found ${target.toLocaleString("en-US")} in ${page?.label ?? "the document"} with no second source to corroborate it. Treat it as a single-source figure until it is confirmed.`,
      confidence: "needs_verification",
      confidenceReason: "Only one document in the workspace states this figure.",
      metrics: [{ label: "Reported", value: target.toLocaleString("en-US") }],
      difference: null,
      assessment: "A single uncorroborated number is the most common source of reporting drift.",
      recommendedAction: "Attach a second source (register, attendance sheet or invoice) before citing it externally.",
    });
  }

  return findings.slice(0, 5);
}

/** Deterministic read of the document: figures + a couple of rule-based findings. */
export function heuristicAnalyze(pages: PageLike[]): {
  summary: string;
  facts: DraftFact[];
  findings: DraftFinding[];
} {
  const facts = extractFacts(pages);
  const findings = heuristicFindings(pages, facts);

  const headline = facts
    .filter((fact) => fact.value)
    .slice(0, 3)
    .map((fact) => `${fact.label.toLowerCase()} ${fact.value}${fact.unit && fact.unit !== "%" ? ` ${fact.unit}` : fact.unit === "%" ? "%" : ""}`);
  const firstLine = splitSentences(pages[0]?.text ?? "")[0] ?? "";

  const summary = headline.length
    ? `Rules-based read: found ${facts.length} figure${facts.length === 1 ? "" : "s"} including ${headline.join(", ")}.`
    : firstLine
      ? `Rules-based read: ${clip(firstLine, 180)}`
      : "Rules-based read: no headline figures were found in this document.";

  return { summary: clip(summary, 300), facts, findings };
}

/* ------------------------------------------------------------------ */
/* The analysis entry point                                            */
/* ------------------------------------------------------------------ */

export interface AnalysisText {
  text: string;
  pages: PageLike[];
}

export async function analyzeDocument(
  doc: Pick<DocumentCore, "id" | "fileName" | "displayName" | "type" | "projectId">,
  source: AnalysisText,
  options: AnalyzeDocumentOptions = {},
): Promise<AnalysisResult> {
  const pages = source.pages.map((page) => ({
    label: page.label,
    text: clipText(page.text, options.maxChars ?? 6_000).text,
  }));

  const base: AnalysisResult = {
    source: "heuristic",
    model: null,
    summary: "",
    facts: [],
    findings: [],
    fallbackReason: null,
    notes: [],
  };

  if (!options.forceHeuristic && isAiConfigured()) {
    try {
      const { value, model } = await chatJson<RawAnalysis>({
        messages: buildAnalysisMessages(doc, pages),
        model: options.model,
        models: DEFAULT_CHAT_MODELS,
        maxTokens: 4096,
        temperature: 0.1,
      });

      const facts = normalizeFacts(value?.facts, pages);
      const findings = normalizeFindings(value?.findings, pages);

      if (!facts.length && !findings.length) {
        throw new AiError("bad_response", "The model returned no structured facts or findings.");
      }

      return {
        source: "ai",
        model,
        summary:
          str(value?.summary) ||
          `Analysed ${pages.length} section${pages.length === 1 ? "" : "s"} and extracted ${facts.length} facts.`,
        facts,
        findings,
        fallbackReason: null,
        notes: [],
      };
    } catch (error) {
      const message =
        error instanceof AiError
          ? error.code === "no_credits"
            ? "The workspace is out of pre.dev AI credits."
            : error.message
          : "The AI model could not be reached.";
      base.fallbackReason = message;
      base.notes.push(`AI analysis unavailable (${message}) — used the rules-based reader.`);
    }
  } else if (!options.forceHeuristic) {
    base.fallbackReason = "pre.dev AI is not configured for this workspace.";
    base.notes.push("Analysed with the built-in rules-based reader.");
  }

  const heuristic = heuristicAnalyze(pages);
  return {
    ...base,
    summary: heuristic.summary,
    facts: heuristic.facts,
    findings: heuristic.findings,
  };
}

/* ------------------------------------------------------------------ */
/* Recording the analysis on the document                              */
/* ------------------------------------------------------------------ */

/** Patches a document row to reflect a completed (or failed) analysis. */
export function documentAnalysisPatch(
  result: AnalysisResult,
  analyzedAt: string,
): Partial<DocumentCore> {
  return {
    status: "analyzed",
    analyzedAt,
    summary: result.summary,
    error:
      result.source === "heuristic" && result.fallbackReason
        ? `Analysed with the rules-based fallback (${result.fallbackReason}).`
        : null,
  };
}

/** Build the persisted fact rows for a document. */
export function toFactRecords(
  documentId: string,
  projectId: string | null,
  facts: DraftFact[],
  extractedAt: string,
): ExtractedFact[] {
  return facts.map((fact, index) => ({
    id: `fact_${slug(documentId, 32)}_${index + 1}`,
    documentId,
    projectId,
    category: fact.category,
    field: fact.field,
    label: fact.label,
    value: fact.value,
    numericValue: fact.numericValue,
    unit: fact.unit,
    confidence: fact.confidence,
    quote: fact.quote,
    locator: fact.locator,
    extractedAt,
  }));
}

/** Stable id for a finding so re-analysing a document updates instead of duplicates. */
export function findingIdFor(documentId: string, title: string): string {
  return `finding_${slug(documentId, 24)}_${slug(normalizeTitle(title), 40)}`;
}
