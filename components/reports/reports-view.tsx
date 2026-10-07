"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, FileText, Sparkles } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout";
import { Badge, Button, Card, Field, InlineAlert, Input, Select } from "@/components/ui";
import { apiPost, errorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { reportTypeLabel } from "@/lib/tone";
import type { Project, Report, ReportType } from "@/lib/types";

const TYPES: ReportType[] = ["donor_update", "executive_summary", "project_report", "monthly_operations"];

/** Generate a report from the workspace, and read the ones already produced. */
export function ReportsView({
  reports,
  projects,
  reportingPeriod,
  aiConfigured,
  counts,
}: {
  reports: Report[];
  projects: Project[];
  reportingPeriod: string;
  aiConfigured: boolean;
  counts: { drafts: number; final: number };
}) {
  const [items, setItems] = useState(reports);
  const [type, setType] = useState<ReportType>("donor_update");
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState(reportingPeriod);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await apiPost<{
        report: Report;
        source: "ai" | "template";
        fallbackReason: string | null;
      }>("/api/reports", {
        type,
        title: title.trim() || undefined,
        period: period.trim() || undefined,
        projectId: projectId || undefined,
      });
      setItems((current) => [result.report, ...current.filter((item) => item.id !== result.report.id)]);
      setNotice(
        result.source === "ai"
          ? "Drafted with pre.dev AI from your workspace records."
          : "Assembled from your workspace records." + (result.fallbackReason ? " " + result.fallbackReason : ""),
      );
      setTitle("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Output"
        title="Reports"
        description="Turn the workspace into a donor update, an executive summary or a project report — written from your evidence, never from thin air."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral" size="md">
              {counts.drafts} drafts
            </Badge>
            <Badge tone={aiConfigured ? "success" : "warning"} size="md" dot>
              {aiConfigured ? "AI drafting on" : "Template drafting"}
            </Badge>
          </div>
        }
      />

      <Card className="p-5">
        <form onSubmit={generate} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Report type" htmlFor="report-type">
              <Select
                id="report-type"
                value={type}
                onChange={(event) => setType(event.target.value as ReportType)}
              >
                {TYPES.map((option) => (
                  <option key={option} value={option}>
                    {reportTypeLabel(option)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project" htmlFor="report-project" hint="Optional — limit the report to one project">
              <Select
                id="report-project"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">Whole organisation</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Title" htmlFor="report-title" hint="Optional">
              <Input
                id="report-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={reportTypeLabel(type) + " — " + reportingPeriod}
              />
            </Field>
            <Field label="Period" htmlFor="report-period">
              <Input
                id="report-period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={busy}>
              <Sparkles aria-hidden="true" />
              Generate report
            </Button>
            <p className="text-xs text-muted-foreground">
              The trust summary is always computed from your records, never by the model.
            </p>
          </div>
        </form>
        {notice ? (
          <p className="mt-3 text-sm text-success-text" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <InlineAlert tone="danger" title="The report could not be generated" className="mt-3">
            {error}
          </InlineAlert>
        ) : null}
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No reports yet"
          description="Generate a donor update or an executive summary and it will be assembled from the findings, projects and figures in this workspace."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((report) => (
            <li key={report.id}>
              <Card className="p-5">
                <Link href={"/reports/" + report.id} className="group block">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="outline">{reportTypeLabel(report.type)}</Badge>
                        <Badge tone={report.status === "final" ? "success" : "neutral"}>
                          {report.status === "final" ? "Final" : "Draft"}
                        </Badge>
                      </div>
                      <h2 className="mt-2 text-base font-semibold tracking-tight group-hover:text-primary-text">
                        {report.title}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {report.period} · generated {formatDateTime(report.createdAt)} · {report.sections.length} sections
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge tone="success">{report.trust.verified} corroborated</Badge>
                      <Badge tone={report.trust.needsReview > 0 ? "warning" : "neutral"}>
                        {report.trust.needsReview} to review
                      </Badge>
                    </div>
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileText className="size-3.5" aria-hidden="true" />
        Reports are drafts until you review and send them.
      </p>
    </div>
  );
}
