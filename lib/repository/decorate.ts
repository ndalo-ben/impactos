/**
 * ImpactOS — derived-field helpers.
 *
 * Stored records are deliberately "flat": a document does not know how many
 * findings point at it, and a finding does not know the name of its project or
 * the file name of its evidence. Both stores share these pure functions so the
 * shape the UI receives is identical whichever backend is active.
 */

import type {
  Activity,
  Beneficiary,
  DashboardMetrics,
  Document,
  DocumentCore,
  EvidenceRecord,
  EvidenceReference,
  ExtractedFact,
  Finding,
  FindingRecord,
  Project,
  ProjectCore,
} from "../types";

/** Attach findingsCount / factsCount to each document. */
export function decorateDocuments(
  documents: DocumentCore[],
  findings: FindingRecord[],
  evidence: EvidenceRecord[],
  facts: ExtractedFact[],
): Document[] {
  const findingById = new Map(findings.map((f) => [f.id, f]));

  // A document counts once per *finding* even if it is cited twice — and a
  // verified claim is not an "open issue", so it is not counted.
  const pairs = new Set<string>();
  for (const row of evidence) {
    const finding = findingById.get(row.findingId);
    if (!finding || finding.type === "verified") continue;
    pairs.add(`${row.findingId}\u0000${row.documentId}`);
  }

  const findingsCount = new Map<string, number>();
  for (const pair of pairs) {
    const documentId = pair.split("\u0000")[1];
    findingsCount.set(documentId, (findingsCount.get(documentId) ?? 0) + 1);
  }

  const factsCount = new Map<string, number>();
  for (const fact of facts) {
    factsCount.set(fact.documentId, (factsCount.get(fact.documentId) ?? 0) + 1);
  }

  return documents
    .map((doc) => ({
      ...doc,
      findingsCount: findingsCount.get(doc.id) ?? 0,
      factsCount: factsCount.get(doc.id) ?? 0,
    }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** Attach the project name and the hydrated evidence rows to each finding. */
export function decorateFindings(
  findings: FindingRecord[],
  evidence: EvidenceRecord[],
  documents: DocumentCore[],
  projects: ProjectCore[],
): Finding[] {
  const documentById = new Map(documents.map((d) => [d.id, d]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const severityRank: Record<FindingRecord["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
    success: 3,
  };

  return findings
    .map((finding) => ({
      ...finding,
      projectName: finding.projectId ? projectById.get(finding.projectId)?.name ?? null : null,
      evidence: evidence
        .filter((row) => row.findingId === finding.id)
        .sort((a, b) => a.side.localeCompare(b.side))
        .map<EvidenceReference>((row) => {
          const doc = documentById.get(row.documentId);
          return {
            ...row,
            documentName: doc?.displayName ?? "Unknown document",
            documentType: doc?.type ?? "pdf",
          };
        }),
    }))
    .sort(
      (a, b) =>
        severityRank[a.severity] - severityRank[b.severity] ||
        b.createdAt.localeCompare(a.createdAt),
    );
}

/** Attach per-project roll-ups. */
export function decorateProjects(
  projects: ProjectCore[],
  activities: Activity[],
  beneficiaries: Beneficiary[],
): Project[] {
  return projects.map((project) => {
    const projectActivities = activities.filter((a) => a.projectId === project.id);
    return {
      ...project,
      activityCount: projectActivities.length,
      completedActivityCount: projectActivities.filter((a) => a.status === "completed").length,
      beneficiaryCount: beneficiaries.filter((b) => b.projectId === project.id).length,
    };
  });
}

export interface MetricsInput {
  projects: ProjectCore[];
  activities: Activity[];
  beneficiaries: Beneficiary[];
  documents: DocumentCore[];
  findings: FindingRecord[];
  previousBeneficiaries: number;
}

export function computeMetrics(input: MetricsInput): DashboardMetrics {
  const beneficiaries = input.beneficiaries.length;
  const previous = input.previousBeneficiaries;
  const beneficiariesDeltaPct =
    previous > 0 ? Math.round(((beneficiaries - previous) / previous) * 100) : 0;

  return {
    projects: input.projects.length,
    beneficiaries,
    beneficiariesPrevious: previous,
    beneficiariesDeltaPct,
    activities: input.activities.length,
    activitiesCompleted: input.activities.filter((a) => a.status === "completed").length,
    documents: input.documents.length,
    documentsAnalyzed: input.documents.filter((d) => d.status === "analyzed").length,
    openFindings: input.findings.filter((f) => f.status === "open").length,
    criticalFindings: input.findings.filter(
      (f) => f.status === "open" && f.severity === "critical",
    ).length,
    verifiedClaims: input.findings.filter((f) => f.type === "verified").length,
  };
}
