/**
 * ImpactOS — the repository layer.
 *
 * One synchronous `Store` API over two interchangeable persistence backends
 * (SQLite primary, JSON fallback). Reads are served from an in-memory snapshot
 * that is rehydrated from the backend on first use, so the UI never has to
 * await a database call — and the two backends behave identically.
 *
 * SERVER-ONLY. Never import this from a client component; reach it through a
 * route handler or a server component.
 */

import type {
  Activity,
  Beneficiary,
  DashboardMetrics,
  Document,
  DocumentCore,
  EvidenceRecord,
  ExtractedFact,
  Finding,
  FindingRecord,
  FindingSeverity,
  FindingStatus,
  FindingType,
  Organization,
  Project,
  Report,
  SeedData,
  StoreKind,
} from "../types";
import { buildSeed } from "../seed";
import {
  computeMetrics,
  decorateDocuments,
  decorateFindings,
  decorateProjects,
} from "./decorate";
import { createPersistence, type DataFile, type Persistence } from "./persistence";

/** Everything one document's analysis produced, applied in a single write. */
export interface AnalysisBundle {
  documentId: string;
  facts: ExtractedFact[];
  findings: FindingRecord[];
  evidence: EvidenceRecord[];
  /** Findings produced by a previous analysis of this document — removed first. */
  replaceFindingIds?: string[];
}

export interface Store {
  readonly kind: StoreKind;
  /** Where the data is stored, for diagnostics. */
  readonly location: string;

  getOrganization(): Organization;
  getMetrics(): DashboardMetrics;

  listDocuments(): Document[];
  getDocument(id: string): Document | null;
  insertDocument(document: DocumentCore): Document;
  updateDocument(id: string, patch: Partial<DocumentCore>): Document | null;
  deleteDocument(id: string): boolean;

  listProjects(): Project[];
  getProject(id: string): Project | null;

  listActivities(projectId?: string): Activity[];
  listBeneficiaries(projectId?: string): Beneficiary[];
  countBeneficiaries(projectId?: string): number;

  listFacts(filter?: { documentId?: string; projectId?: string }): ExtractedFact[];

  listFindings(filter?: {
    status?: FindingStatus;
    type?: FindingType;
    severity?: FindingSeverity;
    projectId?: string;
  }): Finding[];
  getFinding(id: string): Finding | null;
  updateFindingStatus(id: string, status: FindingStatus): Finding | null;

  listEvidence(filter?: { findingId?: string; documentId?: string }): EvidenceRecord[];
  /** Insert or replace a finding, optionally with its evidence rows. */
  insertFinding(finding: FindingRecord, evidence?: EvidenceRecord[]): Finding;
  insertEvidence(rows: EvidenceRecord[]): void;
  /** Remove a finding and every evidence row that points at it. */
  deleteFinding(id: string): boolean;
  /** Replace one document's derived analysis (facts, findings, evidence) atomically. */
  applyAnalysis(bundle: AnalysisBundle): void;

  listReports(): Report[];
  getReport(id: string): Report | null;
  insertReport(report: Report): Report;

  isSeeded(): boolean;
  seed(data: SeedData, options?: { force?: boolean }): void;
  reset(): void;
}

const BLANK_ORGANIZATION: Organization = {
  id: "org_unknown",
  name: "Your organization",
  sector: "",
  country: "",
  reportingPeriod: "",
  greeting: "Welcome",
};

export function emptyData(): DataFile {
  return {
    version: 1,
    organization: null,
    previousBeneficiaries: 0,
    documents: [],
    projects: [],
    activities: [],
    beneficiaries: [],
    facts: [],
    findings: [],
    evidence: [],
    reports: [],
  };
}

class BaseStore implements Store {
  readonly kind: StoreKind;
  readonly location: string;

  private data: DataFile;
  private readonly persistence: Persistence;

  constructor(persistence: Persistence) {
    this.persistence = persistence;
    this.kind = persistence.kind;
    this.location = persistence.location;
    this.data = persistence.load() ?? emptyData();
  }

  /* -- seeding ---------------------------------------------------- */

  isSeeded(): boolean {
    return this.data.documents.length > 0 || this.data.projects.length > 0;
  }

  seed(data: SeedData, options?: { force?: boolean }): void {
    if (!options?.force && this.isSeeded()) return;
    this.data = {
      version: 1,
      organization: { ...data.organization },
      previousBeneficiaries: data.previousBeneficiaries,
      documents: data.documents.map((d) => ({ ...d })),
      projects: data.projects.map((p) => ({ ...p })),
      activities: data.activities.map((a) => ({ ...a })),
      beneficiaries: data.beneficiaries.map((b) => ({ ...b })),
      facts: data.facts.map((f) => ({ ...f })),
      findings: data.findings.map((f) => ({ ...f, metrics: f.metrics.map((m) => ({ ...m })) })),
      evidence: data.evidence.map((e) => ({ ...e })),
      reports: data.reports.map((r) => ({ ...r })),
    };
    this.persist();
  }

  reset(): void {
    this.data = emptyData();
    this.persistence.reset();
  }

  /* -- organization ---------------------------------------------- */

  getOrganization(): Organization {
    return this.data.organization ?? BLANK_ORGANIZATION;
  }

  getMetrics(): DashboardMetrics {
    return computeMetrics({
      projects: this.data.projects,
      activities: this.data.activities,
      beneficiaries: this.data.beneficiaries,
      documents: this.data.documents,
      findings: this.data.findings,
      previousBeneficiaries: this.data.previousBeneficiaries,
    });
  }

  /* -- documents -------------------------------------------------- */

  listDocuments(): Document[] {
    return decorateDocuments(
      this.data.documents,
      this.data.findings,
      this.data.evidence,
      this.data.facts,
    );
  }

  getDocument(id: string): Document | null {
    return this.listDocuments().find((doc) => doc.id === id) ?? null;
  }

  insertDocument(document: DocumentCore): Document {
    this.data.documents = [
      { ...document },
      ...this.data.documents.filter((d) => d.id !== document.id),
    ];
    this.persist();
    return this.getDocument(document.id) as Document;
  }

  updateDocument(id: string, patch: Partial<DocumentCore>): Document | null {
    const index = this.data.documents.findIndex((doc) => doc.id === id);
    if (index === -1) return null;
    this.data.documents[index] = { ...this.data.documents[index], ...patch, id };
    this.persist();
    return this.getDocument(id);
  }

  deleteDocument(id: string): boolean {
    const before = this.data.documents.length;
    this.data.documents = this.data.documents.filter((doc) => doc.id !== id);
    if (this.data.documents.length === before) return false;

    // Everything derived from the document goes with it: its facts, and every
    // evidence row that quoted it. A finding whose last piece of evidence has
    // just been removed is no longer grounded, so it goes too.
    this.data.facts = this.data.facts.filter((fact) => fact.documentId !== id);
    const affected = new Set(
      this.data.evidence.filter((row) => row.documentId === id).map((row) => row.findingId),
    );
    this.data.evidence = this.data.evidence.filter((row) => row.documentId !== id);
    if (affected.size > 0) {
      const grounded = new Set(this.data.evidence.map((row) => row.findingId));
      this.data.findings = this.data.findings.filter(
        (finding) => !affected.has(finding.id) || grounded.has(finding.id),
      );
    }

    this.persist();
    return true;
  }

  /* -- projects --------------------------------------------------- */

  listProjects(): Project[] {
    return decorateProjects(this.data.projects, this.data.activities, this.data.beneficiaries);
  }

  getProject(id: string): Project | null {
    return this.listProjects().find((project) => project.id === id) ?? null;
  }

  /* -- organisation map ------------------------------------------ */

  listActivities(projectId?: string): Activity[] {
    const rows = projectId
      ? this.data.activities.filter((a) => a.projectId === projectId)
      : this.data.activities;
    return [...rows].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  }

  listBeneficiaries(projectId?: string): Beneficiary[] {
    return projectId
      ? this.data.beneficiaries.filter((b) => b.projectId === projectId)
      : [...this.data.beneficiaries];
  }

  countBeneficiaries(projectId?: string): number {
    return projectId
      ? this.data.beneficiaries.filter((b) => b.projectId === projectId).length
      : this.data.beneficiaries.length;
  }

  /* -- facts ------------------------------------------------------ */

  listFacts(filter?: { documentId?: string; projectId?: string }): ExtractedFact[] {
    return this.data.facts.filter((fact) => {
      if (filter?.documentId && fact.documentId !== filter.documentId) return false;
      if (filter?.projectId && fact.projectId !== filter.projectId) return false;
      return true;
    });
  }

  /* -- findings --------------------------------------------------- */

  listFindings(filter?: {
    status?: FindingStatus;
    type?: FindingType;
    severity?: FindingSeverity;
    projectId?: string;
  }): Finding[] {
    const findings = decorateFindings(
      this.data.findings,
      this.data.evidence,
      this.data.documents,
      this.data.projects,
    );
    return findings.filter((finding) => {
      if (filter?.status && finding.status !== filter.status) return false;
      if (filter?.type && finding.type !== filter.type) return false;
      if (filter?.severity && finding.severity !== filter.severity) return false;
      if (filter?.projectId && finding.projectId !== filter.projectId) return false;
      return true;
    });
  }

  getFinding(id: string): Finding | null {
    return this.listFindings().find((finding) => finding.id === id) ?? null;
  }

  updateFindingStatus(id: string, status: FindingStatus): Finding | null {
    const index = this.data.findings.findIndex((finding) => finding.id === id);
    if (index === -1) return null;
    this.data.findings[index] = { ...this.data.findings[index], status };
    this.persist();
    return this.getFinding(id);
  }

  /* -- artifacts produced by analysis ------------------------------ */

  listEvidence(filter?: { findingId?: string; documentId?: string }): EvidenceRecord[] {
    return this.data.evidence.filter((row) => {
      if (filter?.findingId && row.findingId !== filter.findingId) return false;
      if (filter?.documentId && row.documentId !== filter.documentId) return false;
      return true;
    });
  }

  insertEvidence(rows: EvidenceRecord[]): void {
    if (rows.length === 0) return;
    const byId = new Map(this.data.evidence.map((row) => [row.id, row]));
    for (const row of rows) byId.set(row.id, { ...row });
    this.data.evidence = [...byId.values()];
    this.persist();
  }

  insertFinding(finding: FindingRecord, evidence: EvidenceRecord[] = []): Finding {
    const record = cloneFinding(finding);
    this.data.findings = [
      record,
      ...this.data.findings.filter((existing) => existing.id !== record.id),
    ];
    if (evidence.length > 0) {
      this.data.evidence = [
        ...evidence.map((row) => ({ ...row })),
        ...this.data.evidence.filter((row) => row.findingId !== record.id),
      ];
    }
    this.persist();
    return this.getFinding(record.id) as Finding;
  }

  deleteFinding(id: string): boolean {
    const before = this.data.findings.length;
    this.data.findings = this.data.findings.filter((finding) => finding.id !== id);
    if (this.data.findings.length === before) return false;
    this.data.evidence = this.data.evidence.filter((row) => row.findingId !== id);
    this.persist();
    return true;
  }

  applyAnalysis(bundle: AnalysisBundle): void {
    const { documentId, facts, findings, evidence } = bundle;

    // 1. Drop the previous analysis of this document, so re-running is idempotent.
    const replaced = new Set(bundle.replaceFindingIds ?? []);
    if (replaced.size > 0) {
      this.data.findings = this.data.findings.filter((finding) => !replaced.has(finding.id));
      this.data.evidence = this.data.evidence.filter((row) => !replaced.has(row.findingId));
    }

    // 2. Facts: this document's old rows out, the new ones in.
    this.data.facts = [
      ...facts.map((fact) => ({ ...fact })),
      ...this.data.facts.filter((fact) => fact.documentId !== documentId),
    ];

    // 3. Findings + evidence: upsert by id, so a re-analysis updates in place.
    const incoming = new Set(findings.map((finding) => finding.id));
    this.data.findings = [
      ...findings.map(cloneFinding),
      ...this.data.findings.filter((finding) => !incoming.has(finding.id)),
    ];
    this.data.evidence = [
      ...evidence.map((row) => ({ ...row })),
      ...this.data.evidence.filter((row) => !incoming.has(row.findingId)),
    ];

    this.persist();
  }

  /* -- reports ---------------------------------------------------- */

  listReports(): Report[] {
    return [...this.data.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getReport(id: string): Report | null {
    return this.data.reports.find((report) => report.id === id) ?? null;
  }

  insertReport(report: Report): Report {
    this.data.reports = [report, ...this.data.reports.filter((r) => r.id !== report.id)];
    this.persist();
    return report;
  }

  /* -- internals -------------------------------------------------- */

  private persist(): void {
    this.persistence.save(this.data);
  }
}

function cloneFinding(finding: FindingRecord): FindingRecord {
  return {
    ...finding,
    metrics: finding.metrics.map((metric) => ({ ...metric })),
    difference: finding.difference ? { ...finding.difference } : null,
  };
}

/* ------------------------------------------------------------------ */
/* Module-level singleton                                              */
/* ------------------------------------------------------------------ */

const globalStore = globalThis as unknown as { __impactosStore?: Store };

export function createStore(): Store {
  return new BaseStore(createPersistence());
}

/**
 * The app-wide store. Created (and seeded) on first use and memoised on
 * `globalThis` so Next.js hot-reloads do not open a second connection.
 */
export function getStore(): Store {
  if (!globalStore.__impactosStore) {
    const store = createStore();
    ensureSeeded(store);
    globalStore.__impactosStore = store;
  }
  return globalStore.__impactosStore;
}

/** Seed the store with the demo workspace the first time it is opened. */
export function ensureSeeded(store: Store = getStore()): void {
  if (!store.isSeeded()) store.seed(buildSeed());
}

/** Drop everything and re-seed. Useful in development. */
export function resetStore(): Store {
  const store = getStore();
  store.reset();
  store.seed(buildSeed(), { force: true });
  return store;
}

export { createPersistence };
