/**
 * ImpactOS — domain types.
 *
 * These are the shapes the whole product speaks: documents that come in,
 * the structured facts extracted from them, the findings (insights) raised
 * across documents, the evidence behind each finding, and the reports that
 * turn intelligence into an output.
 *
 * Two flavours of a few types exist on purpose:
 *   - `XxxCore` / `XxxRecord` — what is *stored* (no derived fields).
 *   - `Xxx`                   — what the repository *returns* (derived fields
 *                               hydrated: counts, project names, evidence).
 * The repository layer is the only place that turns one into the other.
 */

export type ISODate = string;

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export type DocumentType = "pdf" | "docx" | "xlsx" | "csv";
export type DocumentStatus = "uploaded" | "processing" | "analyzed" | "failed";

export interface DocumentCore {
  id: string;
  /** Original file name, e.g. "Q2 Project Report.pdf". */
  fileName: string;
  /** Human label used in the UI, e.g. "Q2 Project Report". */
  displayName: string;
  type: DocumentType;
  status: DocumentStatus;
  sizeBytes: number;
  uploadedAt: ISODate;
  analyzedAt: ISODate | null;
  /** Pages for PDF/DOCX, null for spreadsheets/CSV. */
  pageCount: number | null;
  summary: string | null;
  projectId: string | null;
  /** Populated only when `status === "failed"`. */
  error: string | null;
}

export interface Document extends DocumentCore {
  /** Open issues raised from this document (verified claims are not counted). */
  findingsCount: number;
  /** Structured facts extracted from this document. */
  factsCount: number;
}

/* ------------------------------------------------------------------ */
/* Organization map                                                    */
/* ------------------------------------------------------------------ */

export type ProjectStatus = "on_track" | "needs_attention" | "at_risk" | "completed";
export type ActivityStatus = "completed" | "in_progress" | "postponed" | "planned";
export type BeneficiaryStatus = "active" | "exited" | "graduated";
export type Gender = "female" | "male" | "other";

export interface Organization {
  id: string;
  name: string;
  sector: string;
  country: string;
  /** e.g. "Q2 2026 (April – June)". */
  reportingPeriod: string;
  /** Dashboard greeting, e.g. "Good morning, HopeBridge". */
  greeting: string;
}

export interface ProjectCore {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  /** Reported completion, 0–100. */
  progress: number;
  description: string;
  location: string;
  startDate: ISODate;
  endDate: ISODate;
  lead: string;
  budgetKes: number;
  spentKes: number;
  summary: string;
}

export interface Project extends ProjectCore {
  beneficiaryCount: number;
  activityCount: number;
  completedActivityCount: number;
}

export interface Activity {
  id: string;
  projectId: string;
  name: string;
  status: ActivityStatus;
  plannedDate: ISODate;
  completedDate: ISODate | null;
  description: string;
  participants: number;
  /** Measurable outcome, or null when none was recorded. */
  outcome: string | null;
  location: string;
  /** Free-text note, e.g. why an activity was postponed. */
  note: string | null;
}

export interface Beneficiary {
  id: string;
  projectId: string;
  name: string;
  cohort: string;
  age: number;
  gender: Gender;
  location: string;
  registeredAt: ISODate;
  status: BeneficiaryStatus;
}

/* ------------------------------------------------------------------ */
/* Extracted facts                                                     */
/* ------------------------------------------------------------------ */

export type FactCategory = "project" | "activity" | "beneficiary" | "financial" | "outcome";

export interface ExtractedFact {
  id: string;
  documentId: string;
  projectId: string | null;
  category: FactCategory;
  /** Machine-ish key, e.g. "beneficiaries_reached". */
  field: string;
  /** Display label, e.g. "Beneficiaries reached (Q2)". */
  label: string;
  /** Always stored as text so it can be quoted verbatim. */
  value: string;
  numericValue: number | null;
  unit: string | null;
  confidence: FindingConfidence;
  /** Verbatim quote from the source document. */
  quote: string;
  /** Where in the document, e.g. "p.3 §Executive summary". */
  locator: string;
  extractedAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* Findings + evidence                                                 */
/* ------------------------------------------------------------------ */

export type FindingType = "inconsistency" | "missing_information" | "financial_mapping" | "verified";
export type FindingSeverity = "critical" | "warning" | "info" | "success";
export type FindingConfidence = "high" | "medium" | "needs_verification";
export type FindingStatus = "open" | "reviewed" | "dismissed";

export interface FindingMetric {
  label: string;
  value: string;
}

/** A stored evidence row — the document is referenced by id only. */
export interface EvidenceRecord {
  id: string;
  findingId: string;
  /** "a" = the first side of the comparison, "b" = the second. */
  side: "a" | "b";
  label: string;
  value: string;
  unit: string | null;
  documentId: string;
  quote: string;
  locator: string;
}

/** What the UI receives: the evidence row plus its source document. */
export interface EvidenceReference extends EvidenceRecord {
  documentName: string;
  documentType: DocumentType;
}

export interface FindingRecord {
  id: string;
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  summary: string;
  detail: string;
  confidence: FindingConfidence;
  confidenceReason: string;
  status: FindingStatus;
  createdAt: ISODate;
  projectId: string | null;
  /** The compared figures, e.g. Reported 120 / Registered 127. */
  metrics: FindingMetric[];
  /** The delta between the two sides, when there is one. */
  difference: FindingMetric | null;
  /** Plain-language AI assessment of why this happened. */
  assessment: string;
  recommendedAction: string;
}

export interface Finding extends FindingRecord {
  projectName: string | null;
  evidence: EvidenceReference[];
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export type ReportType = "donor_update" | "executive_summary" | "project_report" | "monthly_operations";
export type ReportStatus = "draft" | "final";

export interface TrustSummary {
  enabled: boolean;
  verified: number;
  needsReview: number;
  unsupported: number;
}

export interface ReportSection {
  heading: string;
  body: string;
  /** Ids of the findings/documents backing this section. */
  citations: string[];
}

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  period: string;
  createdAt: ISODate;
  status: ReportStatus;
  trust: TrustSummary;
  sections: ReportSection[];
  sources: string[];
}

/* ------------------------------------------------------------------ */
/* Dashboard metrics                                                   */
/* ------------------------------------------------------------------ */

export interface DashboardMetrics {
  projects: number;
  beneficiaries: number;
  beneficiariesPrevious: number;
  beneficiariesDeltaPct: number;
  activities: number;
  activitiesCompleted: number;
  documents: number;
  documentsAnalyzed: number;
  openFindings: number;
  criticalFindings: number;
  verifiedClaims: number;
}

/* ------------------------------------------------------------------ */
/* Seed + storage                                                      */
/* ------------------------------------------------------------------ */

export type StoreKind = "sqlite" | "json";

/** The complete dataset a fresh ImpactOS workspace starts from. */
export interface SeedData {
  organization: Organization;
  previousBeneficiaries: number;
  documents: DocumentCore[];
  projects: ProjectCore[];
  activities: Activity[];
  beneficiaries: Beneficiary[];
  facts: ExtractedFact[];
  findings: FindingRecord[];
  evidence: EvidenceRecord[];
  reports: Report[];
}
