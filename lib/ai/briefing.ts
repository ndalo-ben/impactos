/**
 * ImpactOS — a compact, factual briefing of the whole workspace.
 *
 * This is the ONLY context handed to a model for Ask and for report drafting,
 * so both features answer from the same real data (metrics, projects, findings,
 * documents and extracted figures) and never from the model's imagination.
 *
 * SERVER-ONLY.
 */

import type { Document, Finding } from "@/lib/types";
import type { Store } from "@/lib/repository";

export interface Briefing {
  text: string;
  findings: Finding[];
  documents: Document[];
}

export interface BriefingOptions {
  projectId?: string | null;
  maxDocuments?: number;
  maxFacts?: number;
}

export function workspaceBriefing(store: Store, options: BriefingOptions = {}): Briefing {
  const organization = store.getOrganization();
  const metrics = store.getMetrics();
  const findings = store.listFindings(
    options.projectId ? { projectId: options.projectId } : undefined,
  );
  const documents = store
    .listDocuments()
    .filter((doc) => !options.projectId || doc.projectId === options.projectId);

  const lines: string[] = [];

  lines.push(`ORGANISATION: ${organization.name} — ${organization.sector}, ${organization.country}`);
  lines.push(`REPORTING PERIOD: ${organization.reportingPeriod}`);
  lines.push(
    `HEADLINE NUMBERS: ${metrics.projects} projects · ${metrics.beneficiaries.toLocaleString("en-US")} beneficiaries registered (previous period ${metrics.beneficiariesPrevious.toLocaleString("en-US")}, ${metrics.beneficiariesDeltaPct >= 0 ? "+" : ""}${metrics.beneficiariesDeltaPct}%) · ${metrics.activitiesCompleted} of ${metrics.activities} activities completed · ${metrics.documentsAnalyzed} of ${metrics.documents} documents analysed · ${metrics.openFindings} open findings (${metrics.criticalFindings} critical) · ${metrics.verifiedClaims} corroborated claims`,
  );

  const projects = store.listProjects();
  if (projects.length > 0) {
    lines.push("", "PROJECTS:");
    for (const project of projects) {
      lines.push(
        `- ${project.name} (${project.code}): ${project.status}, ${project.progress}% complete, ${project.beneficiaryCount} beneficiaries, KES ${project.spentKes.toLocaleString("en-US")} spent of KES ${project.budgetKes.toLocaleString("en-US")}`,
      );
    }
  }

  if (findings.length > 0) {
    lines.push("", "FINDINGS (issues and corroborations):");
    for (const finding of findings) {
      lines.push(
        `- [id ${finding.id}] ${finding.severity} / ${finding.type} / ${finding.status} — ${finding.title}: ${finding.summary}${
          finding.metrics.length
            ? ` Figures: ${finding.metrics.map((metric) => `${metric.label} = ${metric.value}`).join(", ")}.`
            : ""
        }${finding.assessment ? ` Assessment: ${finding.assessment}` : ""}${
          finding.recommendedAction ? ` Action: ${finding.recommendedAction}` : ""
        }`,
      );
    }
  }

  if (documents.length > 0) {
    lines.push("", "DOCUMENTS:");
    for (const doc of documents.slice(0, options.maxDocuments ?? 24)) {
      lines.push(
        `- [id ${doc.id}] ${doc.displayName} (${doc.type.toUpperCase()}, ${doc.status}${
          doc.analyzedAt ? `, analysed ${doc.analyzedAt.slice(0, 10)}` : ""
        })${doc.summary ? `: ${doc.summary}` : ""}`,
      );
    }
  }

  const facts = store.listFacts(options.projectId ? { projectId: options.projectId } : undefined);
  if (facts.length > 0) {
    lines.push("", "EXTRACTED FIGURES (verbatim from the documents):");
    for (const fact of facts.slice(0, options.maxFacts ?? 40)) {
      const unit = fact.unit && !fact.value.includes(fact.unit) ? ` ${fact.unit}` : "";
      lines.push(
        `- ${fact.label}: ${fact.value}${unit} (${fact.locator || "document"}, confidence ${fact.confidence})`,
      );
    }
  }

  return { text: lines.join("\n"), findings, documents };
}
