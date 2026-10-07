/**
 * ImpactOS — report generation.
 *
 * A report is assembled from the workspace itself: the metrics, the projects,
 * the findings (with their severity and recommended action) and the documents
 * behind them. When pre.dev AI is connected the narrative sections are drafted
 * by a model from that same briefing; otherwise — and whenever the model fails
 * — the deterministic assembler produces the report instead, so the feature
 * always works and always says which engine wrote it.
 *
 * The trust summary is ALWAYS computed from the store, never from the model.
 *
 * SERVER-ONLY.
 */

import type { Document, Finding, Report, ReportSection, ReportType, TrustSummary } from "@/lib/types";
import { getStore, type Store } from "@/lib/repository";
import { chatJson, isAiConfigured, type ChatMessage } from "./gateway";
import { workspaceBriefing } from "./briefing";

export const REPORT_TYPES: readonly ReportType[] = [
  "donor_update",
  "executive_summary",
  "project_report",
  "monthly_operations",
];

const REPORT_LABELS: Record<ReportType, string> = {
  donor_update: "Donor update",
  executive_summary: "Executive summary",
  project_report: "Project report",
  monthly_operations: "Monthly operations report",
};

export interface ReportInput {
  type: ReportType;
  title?: string;
  period?: string;
  projectId?: string | null;
}

export interface ReportOutcome {
  report: Report;
  /** Which engine actually produced the narrative sections. */
  source: "ai" | "template";
  fallbackReason: string | null;
}

const SYSTEM_PROMPT = [
  "You are ImpactOS, drafting a report for a nonprofit programme team.",
  "Write only from the CONTEXT provided. Never invent a figure, a project or a document.",
  'Return strict JSON: {"sections":[{"heading":string,"body":string,"citations":string[]}]}',
  "Write 3-5 sections. `citations` may only contain ids that appear in the CONTEXT.",
  "Each body is 2-4 sentences of plain prose a programme manager could send to a donor.",
].join("\n");

function trustFor(store: Store, findings: Finding[]): TrustSummary {
  const documents = store.listDocuments();
  return {
    enabled: true,
    verified: findings.filter((finding) => finding.type === "verified").length,
    needsReview: findings.filter((finding) => finding.status === "open" && finding.type !== "verified")
      .length,
    unsupported: documents.filter((document) => document.status !== "analyzed").length,
  };
}

function templateSections(
  store: Store,
  context: { type: ReportType; findings: Finding[]; documents: Document[] },
): ReportSection[] {
  const organization = store.getOrganization();
  const metrics = store.getMetrics();
  const open = context.findings.filter(
    (finding) => finding.status === "open" && finding.type !== "verified",
  );
  const verified = context.findings.filter((finding) => finding.type === "verified");
  const projects = store.listProjects();

  const sections: ReportSection[] = [
    {
      heading: context.type === "monthly_operations" ? "Operations this period" : "Overview",
      body: [
        `${organization.name} is reporting on ${organization.reportingPeriod}. Across ${metrics.projects} projects, ${metrics.beneficiaries.toLocaleString("en-US")} beneficiaries are registered (${metrics.beneficiariesPrevious.toLocaleString("en-US")} in the previous period, ${metrics.beneficiariesDeltaPct >= 0 ? "+" : ""}${metrics.beneficiariesDeltaPct}%), with ${metrics.activitiesCompleted} of ${metrics.activities} planned activities completed.`,
        `${metrics.documentsAnalyzed} of ${metrics.documents} documents have been analysed, and ImpactOS is tracking ${open.length} open issue${open.length === 1 ? "" : "s"} alongside ${verified.length} corroborated claim${verified.length === 1 ? "" : "s"}.`,
      ].join(" "),
      citations: [],
    },
  ];

  if (verified.length > 0) {
    sections.push({
      heading: "Results confirmed by more than one source",
      body: verified.map((finding) => `${finding.title} — ${finding.summary}`).join(" "),
      citations: verified.map((finding) => finding.id),
    });
  }

  sections.push({
    heading: "Issues requiring attention",
    body:
      open.length > 0
        ? open
            .map(
              (finding) =>
                `${finding.title} (${finding.severity}, confidence ${finding.confidence}): ${finding.summary}${
                  finding.recommendedAction ? ` Recommended action: ${finding.recommendedAction}` : ""
                }`,
            )
            .join("\n\n")
        : "No unresolved issues are open in this workspace.",
    citations: open.map((finding) => finding.id),
  });

  const financials = projects.map(
    (project) =>
      `${project.name}: KES ${project.spentKes.toLocaleString("en-US")} spent of KES ${project.budgetKes.toLocaleString("en-US")} (${
        project.budgetKes > 0 ? Math.round((project.spentKes / project.budgetKes) * 100) : 0
      }% utilised), ${project.progress}% complete.`,
  );
  sections.push({
    heading: "Financial position",
    body: financials.join(" ") || "No budget lines are recorded for this scope.",
    citations: [],
  });

  sections.push({
    heading: "Documents behind this report",
    body:
      context.documents
        .map(
          (document) =>
            `${document.displayName} (${document.type.toUpperCase()}, ${document.status}${
              document.factsCount ? `, ${document.factsCount} figures extracted` : ""
            })`,
        )
        .join("; ") || "No documents are in scope for this report.",
    citations: context.documents.map((document) => document.id),
  });

  return sections;
}

async function narrativeSections(
  briefing: string,
  known: Set<string>,
): Promise<ReportSection[]> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `CONTEXT\n${briefing}` },
  ];
  const { value } = await chatJson<{ sections?: unknown }>({
    messages,
    maxTokens: 2048,
    temperature: 0.2,
  });

  if (!Array.isArray(value?.sections)) return [];

  const out: ReportSection[] = [];
  for (const raw of value.sections) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as { heading?: unknown; body?: unknown; citations?: unknown };
    const heading = typeof item.heading === "string" ? item.heading.trim().slice(0, 90) : "";
    const body = typeof item.body === "string" ? item.body.trim().slice(0, 1600) : "";
    if (!heading || !body) continue;
    const citations = Array.isArray(item.citations)
      ? item.citations
          .filter((citation): citation is string => typeof citation === "string" && known.has(citation))
          .slice(0, 12)
      : [];
    out.push({ heading, body, citations });
  }
  return out.slice(0, 6);
}

export async function generateReport(input: ReportInput): Promise<ReportOutcome> {
  const store = getStore();
  const organization = store.getOrganization();
  const briefing = workspaceBriefing(store, { projectId: input.projectId ?? null });
  const template = templateSections(store, {
    type: input.type,
    findings: briefing.findings,
    documents: briefing.documents,
  });

  let sections = template;
  let source: "ai" | "template" = "template";
  let fallbackReason: string | null = isAiConfigured()
    ? null
    : "pre.dev AI is not connected in this workspace — the report was assembled from the workspace data.";

  if (isAiConfigured()) {
    try {
      const known = new Set([
        ...briefing.findings.map((finding) => finding.id),
        ...briefing.documents.map((document) => document.id),
      ]);
      const drafted = await narrativeSections(briefing.text, known);
      if (drafted.length > 0) {
        sections = drafted;
        source = "ai";
        fallbackReason = null;
      } else {
        fallbackReason =
          "The AI model returned no usable sections — the report was assembled from the workspace data.";
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      fallbackReason = `AI drafting failed (${message}) — the report was assembled from the workspace data.`;
    }
  }

  const report: Report = {
    id: `report_${input.type}_${Date.now().toString(36)}`,
    type: input.type,
    title: input.title?.trim() || `${REPORT_LABELS[input.type]} — ${organization.reportingPeriod}`,
    period: input.period?.trim() || organization.reportingPeriod,
    createdAt: new Date().toISOString(),
    status: "draft",
    trust: trustFor(store, briefing.findings),
    sections,
    sources: [
      ...new Set([
        ...briefing.documents.map((document) => document.id),
        ...briefing.findings.flatMap((finding) =>
          finding.evidence.map((evidence) => evidence.documentId),
        ),
      ]),
    ],
  };

  store.insertReport(report);
  return { report, source, fallbackReason };
}
