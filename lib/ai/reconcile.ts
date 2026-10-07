/**
 * ImpactOS — cross-document reconciliation.
 *
 * A single document can be internally consistent and still disagree with the
 * rest of the workspace. This module compares the figures a freshly analysed
 * document contributes against the figures every *other* document already
 * contributed, and raises the product's central finding: the same measure,
 * reported differently in two places. Where two documents agree, it raises a
 * `verified` finding instead, so corroboration is visible too.
 *
 * It is a deterministic rule over *extracted* figures — no model is involved —
 * so it is reproducible, and every finding it raises quotes two real documents.
 *
 * SERVER-ONLY.
 */

import type {
  DocumentCore,
  EvidenceRecord,
  ExtractedFact,
  FindingConfidence,
  FindingRecord,
  FindingSeverity,
} from "@/lib/types";
import { clip, slug } from "./text";

interface FactFamily {
  key: string;
  label: string;
  unit: string | null;
  severity: FindingSeverity;
  fields: string[];
}

const FAMILIES: FactFamily[] = [
  {
    key: "beneficiaries",
    label: "Beneficiary headcount",
    unit: "beneficiaries",
    severity: "critical",
    fields: ["beneficiaries_reached", "beneficiaries_registered", "beneficiary_count", "beneficiaries"],
  },
  {
    key: "expenditure",
    label: "Programme expenditure",
    unit: "KES",
    severity: "critical",
    fields: ["expenditure", "spend", "spent", "budget_spent"],
  },
  {
    key: "participants",
    label: "Participant count",
    unit: "participants",
    severity: "warning",
    fields: ["participants", "attendees"],
  },
  {
    key: "activities",
    label: "Activity count",
    unit: "activities",
    severity: "warning",
    fields: ["activities_count", "activities_completed"],
  },
  {
    key: "completion",
    label: "Reported completion",
    unit: "%",
    severity: "warning",
    fields: ["completion_pct", "completion_percent"],
  },
];

/** Families where an agreement between two documents is worth recording. */
const CORROBORATED = new Set(["beneficiaries", "expenditure", "participants"]);

/** Below this relative gap the two figures are treated as the same number. */
const TOLERANCE = 0.005;

export function familyForField(field: string): FactFamily | null {
  const normalised = field.trim().toLowerCase();
  return FAMILIES.find((family) => family.fields.includes(normalised)) ?? null;
}

export interface CrossFinding {
  finding: FindingRecord;
  evidence: EvidenceRecord[];
}

export function crossFindingId(familyKey: string, documentA: string, documentB: string): string {
  const [first, second] = [slug(documentA, 18), slug(documentB, 18)].sort();
  return `finding_cross_${slug(familyKey, 20)}_${first}_${second}`;
}

function formatValue(value: number, unit: string | null): string {
  const formatted = Number.isInteger(value) ? value.toLocaleString("en-US") : String(value);
  if (unit === "%") return `${formatted}%`;
  return unit ? `${formatted} ${unit}` : formatted;
}

const ASSESSMENTS: Record<string, string> = {
  beneficiaries:
    "Both figures are quoted from their documents, so this is a reporting difference rather than a reading error. The usual causes are different reporting cut-off dates, one document counting participants rather than unique beneficiaries, or a register that was updated after the narrative was written.",
  expenditure:
    "The two documents account for the same programme cost differently. This normally means one figure excludes a category (per diems, transport, in-kind contributions) or covers a different period, so one document under- or over-states spend.",
  participants:
    "The same activity or period is counted differently in the two documents — typically one counts sessions attended and the other counts unique people.",
  activities:
    "The two documents disagree on how many activities were delivered, which usually means one source counts planned sessions and the other only completed ones.",
  completion:
    "The completion percentages were reported at different points in time or against different baselines.",
};

interface Candidate {
  family: FactFamily;
  own: ExtractedFact;
  other: ExtractedFact;
  gap: number;
}

export interface ReconcileInput {
  document: Pick<DocumentCore, "id" | "displayName">;
  /** Facts extracted from the document that was just analysed. */
  facts: ExtractedFact[];
  /** Facts already contributed by every other document in the workspace. */
  workspace: ExtractedFact[];
  /** Resolve a document id to its display name (for evidence labels). */
  nameFor?: (documentId: string) => string | null;
  now?: string;
}

export function reconcileFacts(input: ReconcileInput): CrossFinding[] {
  const { document: doc, facts, workspace } = input;
  const now = input.now ?? new Date().toISOString();
  const nameFor = input.nameFor ?? (() => null);

  const aggregate = (
    source: ExtractedFact[],
    skipOwnDocument: boolean,
  ): Map<string, ExtractedFact[]> => {
    const buckets = new Map<string, ExtractedFact[]>();
    for (const fact of source) {
      if (fact.numericValue === null) continue;
      if (skipOwnDocument && fact.documentId === doc.id) continue;
      const family = familyForField(fact.field);
      if (!family) continue;
      const bucket = buckets.get(family.key) ?? [];
      bucket.push(fact);
      buckets.set(family.key, bucket);
    }
    return buckets;
  };

  const own = aggregate(facts, false);
  if (own.size === 0) return [];
  const theirs = aggregate(workspace, true);

  const findings: CrossFinding[] = [];

  for (const [key, ownFacts] of own) {
    const otherFacts = theirs.get(key);
    if (!otherFacts || otherFacts.length === 0) continue;

    const family = ownFacts[0] ? familyForField(ownFacts[0].field) : null;
    if (!family) continue;

    let disagreement: Candidate | null = null;
    let agreement: Candidate | null = null;

    for (const mine of ownFacts) {
      for (const other of otherFacts) {
        const a = mine.numericValue as number;
        const b = other.numericValue as number;
        const gap = Math.abs(a - b);
        const relative = gap / Math.max(Math.abs(a), Math.abs(b), 1);
        if (relative <= TOLERANCE) {
          agreement = agreement ?? { family, own: mine, other, gap };
        } else if (!disagreement || gap > disagreement.gap) {
          disagreement = { family, own: mine, other, gap };
        }
      }
    }

    const candidate = disagreement ?? (agreement && CORROBORATED.has(key) ? agreement : null);
    if (!candidate) continue;

    const otherName = nameFor(candidate.other.documentId) ?? "another document";
    const context = { doc, otherName, family: candidate.family, now };
    findings.push(
      disagreement
        ? discrepancyFinding(candidate, context)
        : corroborationFinding(candidate, context),
    );
  }

  return findings;
}

interface FindingContext {
  doc: Pick<DocumentCore, "id" | "displayName">;
  otherName: string;
  family: FactFamily;
  now: string;
}

function discrepancyFinding(candidate: Candidate, context: FindingContext): CrossFinding {
  const { family, own, other, gap } = candidate;
  const { doc, otherName, now } = context;
  const ownValue = own.numericValue as number;
  const otherValue = other.numericValue as number;
  const relativePct = Math.round((gap / Math.max(Math.abs(ownValue), Math.abs(otherValue), 1)) * 100);

  // A large gap in a headline measure is critical; anything else is a warning.
  const severity: FindingSeverity =
    family.severity === "critical" && relativePct >= 2 ? "critical" : "warning";
  const confidence: FindingConfidence =
    own.confidence === "needs_verification" || other.confidence === "needs_verification"
      ? "needs_verification"
      : "high";

  const id = crossFindingId(family.key, doc.id, other.documentId);

  return {
    finding: {
      id,
      type: "inconsistency",
      severity,
      title: `${family.label} differs between documents`,
      summary: `${doc.displayName} reports ${formatValue(ownValue, family.unit)} while ${otherName} reports ${formatValue(otherValue, family.unit)} — a gap of ${formatValue(gap, family.unit)} (${relativePct}%).`,
      detail: `${doc.displayName} (${own.locator || "no locator"}): “${clip(own.quote, 240)}” ${otherName} (${other.locator || "no locator"}): “${clip(other.quote, 240)}”`,
      confidence,
      confidenceReason:
        "Both figures are quoted verbatim from separate documents; the documents do not record why they differ.",
      status: "open",
      createdAt: now,
      projectId: own.projectId ?? other.projectId,
      metrics: [
        { label: doc.displayName, value: formatValue(ownValue, family.unit) },
        { label: otherName, value: formatValue(otherValue, family.unit) },
      ],
      difference: { label: "Difference", value: formatValue(gap, family.unit) },
      assessment: ASSESSMENTS[family.key] ?? ASSESSMENTS.participants,
      recommendedAction:
        "Confirm which figure is authoritative for the reporting period, then correct or annotate the other document before either is cited to a donor.",
    },
    evidence: [
      {
        id: `ev_${id}_a`,
        findingId: id,
        side: "a",
        label: own.label,
        value: formatValue(ownValue, family.unit),
        unit: family.unit,
        documentId: doc.id,
        quote: own.quote,
        locator: own.locator,
      },
      {
        id: `ev_${id}_b`,
        findingId: id,
        side: "b",
        label: other.label,
        value: formatValue(otherValue, family.unit),
        unit: family.unit,
        documentId: other.documentId,
        quote: other.quote,
        locator: other.locator,
      },
    ],
  };
}

function corroborationFinding(candidate: Candidate, context: FindingContext): CrossFinding {
  const { family, own, other } = candidate;
  const { doc, otherName, now } = context;
  const value = own.numericValue as number;
  const id = crossFindingId(family.key, doc.id, other.documentId);

  return {
    finding: {
      id,
      type: "verified",
      severity: "success",
      title: `${family.label} confirmed by two documents`,
      summary: `${doc.displayName} and ${otherName} both report ${formatValue(value, family.unit)}.`,
      detail: `${doc.displayName} (${own.locator || "no locator"}): “${clip(own.quote, 240)}” ${otherName} (${other.locator || "no locator"}): “${clip(other.quote, 240)}”`,
      confidence: "high",
      confidenceReason: "The same figure appears independently in two separate documents.",
      status: "open",
      createdAt: now,
      projectId: own.projectId ?? other.projectId,
      metrics: [
        { label: doc.displayName, value: formatValue(value, family.unit) },
        { label: otherName, value: formatValue(value, family.unit) },
      ],
      difference: null,
      assessment:
        "Two independent documents record the same figure, which is the strongest evidence ImpactOS can offer without an external audit.",
      recommendedAction: "Cite this figure with both source documents attached.",
    },
    evidence: [
      {
        id: `ev_${id}_a`,
        findingId: id,
        side: "a",
        label: own.label,
        value: formatValue(value, family.unit),
        unit: family.unit,
        documentId: doc.id,
        quote: own.quote,
        locator: own.locator,
      },
      {
        id: `ev_${id}_b`,
        findingId: id,
        side: "b",
        label: other.label,
        value: formatValue(value, family.unit),
        unit: family.unit,
        documentId: other.documentId,
        quote: other.quote,
        locator: other.locator,
      },
    ],
  };
}
