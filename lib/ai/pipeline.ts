/**
 * ImpactOS — the analysis pipeline: bytes in, persisted intelligence out.
 *
 * Upload → extract text → analyse (a model, or the rules-based reader) →
 * convert the drafts into stored records → reconcile the new figures against
 * the rest of the workspace → write everything through the repository in ONE
 * call, so a document is never half-analysed.
 *
 * SERVER-ONLY.
 */

import type {
  Document,
  DocumentCore,
  EvidenceRecord,
  ExtractedFact,
  Finding,
  FindingRecord,
} from "@/lib/types";
import { getStore, type Store } from "@/lib/repository";
import { readSource, writeSource } from "@/lib/documents/storage";
import { ApiError } from "@/lib/api/http";
import {
  analyzeDocument,
  documentAnalysisPatch,
  findingIdFor,
  toFactRecords,
  type AnalysisResult,
  type AnalyzeDocumentOptions,
  type DraftFinding,
} from "./analyze";
import { detectDocumentType, extractText, ExtractionError, MAX_ANALYSIS_CHARS } from "./extract";
import { reconcileFacts } from "./reconcile";
import { clip, parseNumeric, slug } from "./text";

/** How much extracted text we keep on disk per document. */
const MAX_SOURCE_CHARS = 200_000;

export class PipelineError extends ApiError {
  constructor(code: string, message: string, status = 400) {
    super(code, message, status);
    this.name = "PipelineError";
  }
}

export type AnalyseOptions = AnalyzeDocumentOptions;

export interface AnalysisOutcome {
  document: Document;
  /** Null when the upload was stored without analysing it. */
  analysis: AnalysisResult | null;
  facts: ExtractedFact[];
  findings: Finding[];
}

/* ------------------------------------------------------------------ */
/* Ids                                                                 */
/* ------------------------------------------------------------------ */

function documentIdFor(fileName: string, now: string): string {
  const base = slug(fileName.replace(/\.[a-z0-9]+$/i, ""), 24);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `doc_${base}_${suffix}`;
}

function displayNameFor(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
  return base || fileName;
}

/** Every finding id this document's *own* analysis produces. */
export function findingIdPrefix(documentId: string): string {
  return `finding_${slug(documentId, 24)}_`;
}

/**
 * Findings a previous analysis of this document produced, so a re-run replaces
 * them instead of piling up duplicates. Seeded or hand-made findings never
 * match, so they are left alone.
 */
export function derivedFindingIds(store: Store, documentId: string): string[] {
  const prefix = findingIdPrefix(documentId);
  const grounded = new Set(store.listEvidence({ documentId }).map((row) => row.findingId));
  return store
    .listFindings()
    .filter(
      (finding) =>
        finding.id.startsWith(prefix) ||
        (finding.id.startsWith("finding_cross_") && grounded.has(finding.id)),
    )
    .map((finding) => finding.id);
}

/* ------------------------------------------------------------------ */
/* Drafts → stored records                                             */
/* ------------------------------------------------------------------ */

function toFindingRecords(
  documentId: string,
  projectId: string | null,
  drafts: DraftFinding[],
  now: string,
): FindingRecord[] {
  const records = new Map<string, FindingRecord>();
  for (const draft of drafts) {
    const id = findingIdFor(documentId, draft.title);
    records.set(id, {
      id,
      type: draft.type,
      severity: draft.severity,
      title: draft.title,
      summary: draft.summary,
      detail: draft.detail,
      confidence: draft.confidence,
      confidenceReason: draft.confidenceReason,
      status: "open",
      createdAt: now,
      projectId,
      metrics: draft.metrics.map((metric) => ({ ...metric })),
      difference: draft.difference ? { ...draft.difference } : null,
      assessment: draft.assessment,
      recommendedAction: draft.recommendedAction,
    });
  }
  return [...records.values()];
}

function matchFact(facts: ExtractedFact[], value: string, label: string): ExtractedFact | null {
  const target = parseNumeric(value);
  if (target !== null) {
    const numeric = facts.find((fact) => fact.numericValue === target);
    if (numeric) return numeric;
  }
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  const exact = facts.find((fact) => fact.value.trim().toLowerCase() === needle);
  if (exact) return exact;
  const labelKey = label.trim().toLowerCase();
  return (
    facts.find((fact) => fact.label.trim().toLowerCase() === labelKey) ??
    facts.find((fact) => fact.value.toLowerCase().includes(needle)) ??
    null
  );
}

/**
 * Ground a finding in the document it came from: each compared figure becomes
 * an evidence row quoting the sentence it was read from. A finding whose
 * figures cannot be found in the extracted facts gets no invented evidence.
 */
function evidenceForFinding(
  finding: FindingRecord,
  documentId: string,
  facts: ExtractedFact[],
): EvidenceRecord[] {
  const sides: Array<EvidenceRecord["side"]> = ["a", "b"];
  const out: EvidenceRecord[] = [];
  const used = new Set<string>();

  finding.metrics.slice(0, 2).forEach((metric, index) => {
    const fact = matchFact(facts, metric.value, metric.label);
    if (!fact || used.has(fact.id)) return;
    used.add(fact.id);
    out.push({
      id: `ev_${finding.id}_${sides[index]}`,
      findingId: finding.id,
      side: sides[index],
      label: fact.label,
      value: fact.value,
      unit: fact.unit,
      documentId,
      quote: fact.quote,
      locator: fact.locator,
    });
  });

  return out;
}

/* ------------------------------------------------------------------ */
/* Persisting one analysis                                             */
/* ------------------------------------------------------------------ */

function persistAnalysis(store: Store, document: Document, analysis: AnalysisResult): AnalysisOutcome {
  const now = new Date().toISOString();
  const facts = toFactRecords(document.id, document.projectId, analysis.facts, now);
  const findings = toFindingRecords(document.id, document.projectId, analysis.findings, now);

  const evidence: EvidenceRecord[] = [];
  for (const finding of findings) {
    evidence.push(...evidenceForFinding(finding, document.id, facts));
  }

  // Cross-document checks run against everything *else* in the workspace.
  const workspace = store.listFacts().filter((fact) => fact.documentId !== document.id);
  const crosses = reconcileFacts({
    document,
    facts,
    workspace,
    now,
    nameFor: (id) => store.getDocument(id)?.displayName ?? null,
  });
  for (const cross of crosses) {
    findings.push(cross.finding);
    evidence.push(...cross.evidence);
  }

  store.applyAnalysis({
    documentId: document.id,
    facts,
    findings,
    evidence,
    replaceFindingIds: derivedFindingIds(store, document.id),
  });
  store.updateDocument(document.id, documentAnalysisPatch(analysis, now));

  return {
    document: store.getDocument(document.id) as Document,
    analysis,
    facts: store.listFacts({ documentId: document.id }),
    findings: findings
      .map((finding) => store.getFinding(finding.id))
      .filter((finding): finding is Finding => finding !== null),
  };
}

/* ------------------------------------------------------------------ */
/* Entry points                                                        */
/* ------------------------------------------------------------------ */

/** Re-run analysis on a document already in the workspace. */
export async function analyseDocumentById(
  documentId: string,
  options: AnalyseOptions = {},
): Promise<AnalysisOutcome> {
  const store = getStore();
  const document = store.getDocument(documentId);
  if (!document) throw new PipelineError("not_found", "That document no longer exists.", 404);

  const source = readSource(documentId);
  if (!source) {
    throw new PipelineError(
      "missing_source",
      "The extracted text for this document is no longer on the server. Upload the file again to analyse it.",
      409,
    );
  }

  store.updateDocument(documentId, { status: "processing", error: null });
  try {
    const analysis = await analyzeDocument(
      document,
      { text: source.text, pages: source.pages },
      options,
    );
    return persistAnalysis(store, document, analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The analysis failed.";
    store.updateDocument(documentId, { status: "failed", error: message });
    throw error;
  }
}

export interface UploadInput {
  bytes: Uint8Array;
  fileName: string;
  mimeType?: string | null;
  projectId?: string | null;
  /** Analyse as soon as the file is stored (default true). */
  analyze?: boolean;
  options?: AnalyseOptions;
}

/** Extract + store an uploaded file, and (by default) analyse it immediately. */
export async function analyseUpload(input: UploadInput): Promise<AnalysisOutcome> {
  const store = getStore();
  const fileName = input.fileName.trim() || "document";
  const type = detectDocumentType(fileName, input.mimeType);
  if (!type) {
    throw new PipelineError(
      "unsupported_file_type",
      "ImpactOS reads PDF, Word (.docx), Excel (.xlsx) and CSV files. That file type is not supported.",
      415,
    );
  }

  const now = new Date().toISOString();
  const id = documentIdFor(fileName, now);
  const projectId = input.projectId ?? null;
  const base: DocumentCore = {
    id,
    fileName,
    displayName: displayNameFor(fileName),
    type,
    status: "uploaded",
    sizeBytes: input.bytes.byteLength,
    uploadedAt: now,
    analyzedAt: null,
    pageCount: null,
    summary: null,
    projectId,
    error: null,
  };

  let extracted;
  try {
    extracted = await extractText(input.bytes, type);
  } catch (error) {
    // The file is still recorded, so the UI can show the upload and its reason.
    const message = error instanceof Error ? error.message : "Could not read this file.";
    store.insertDocument({ ...base, status: "failed", error: message });
    throw error instanceof ExtractionError
      ? error
      : new PipelineError("unreadable_file", message, 422);
  }

  store.insertDocument({ ...base, pageCount: extracted.pageCount });
  writeSource({
    documentId: id,
    text: clip(extracted.text, MAX_SOURCE_CHARS),
    pages: extracted.pages.map((page) => ({
      label: page.label,
      text: clip(page.text, MAX_ANALYSIS_CHARS),
    })),
    pageCount: extracted.pageCount,
    sheetNames: extracted.sheetNames,
    chars: extracted.chars,
    savedAt: now,
  });

  if (input.analyze === false) {
    return { document: store.getDocument(id) as Document, analysis: null, facts: [], findings: [] };
  }

  return analyseDocumentById(id, input.options);
}

/**
 * Replace the stored text of an existing document (used when a file is
 * re-supplied to the analyse endpoint) and return the refreshed row.
 */
export async function replaceDocumentSource(
  documentId: string,
  input: { bytes: Uint8Array; fileName: string; mimeType?: string | null },
): Promise<Document> {
  const store = getStore();
  const document = store.getDocument(documentId);
  if (!document) throw new PipelineError("not_found", "That document no longer exists.", 404);

  const type = detectDocumentType(input.fileName, input.mimeType) ?? document.type;
  const extracted = await extractText(input.bytes, type);
  const now = new Date().toISOString();

  store.updateDocument(documentId, {
    fileName: input.fileName,
    displayName: displayNameFor(input.fileName),
    type,
    sizeBytes: input.bytes.byteLength,
    pageCount: extracted.pageCount,
    error: null,
  });
  writeSource({
    documentId,
    text: clip(extracted.text, MAX_SOURCE_CHARS),
    pages: extracted.pages.map((page) => ({
      label: page.label,
      text: clip(page.text, MAX_ANALYSIS_CHARS),
    })),
    pageCount: extracted.pageCount,
    sheetNames: extracted.sheetNames,
    chars: extracted.chars,
    savedAt: now,
  });

  return store.getDocument(documentId) as Document;
}

/* ------------------------------------------------------------------ */
/* Response shape                                                      */
/* ------------------------------------------------------------------ */

/** The JSON body both upload and analyse share. */
export function serializeOutcome(outcome: AnalysisOutcome): Record<string, unknown> {
  return {
    document: outcome.document,
    analysis: outcome.analysis
      ? {
          source: outcome.analysis.source,
          model: outcome.analysis.model,
          summary: outcome.analysis.summary,
          fallbackReason: outcome.analysis.fallbackReason,
          notes: outcome.analysis.notes,
          factsCount: outcome.analysis.facts.length,
          findingsCount: outcome.analysis.findings.length,
        }
      : null,
    facts: outcome.facts,
    findings: outcome.findings,
  };
}
