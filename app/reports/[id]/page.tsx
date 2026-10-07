import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, FileText, FileType, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Section } from "@/components/common";
import { ReportActions } from "@/components/reports/report-actions";
import { getStore } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { reportTypeLabel, severityTone, severityLabel } from "@/lib/tone";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const report = getStore().getReport(id);
  return { title: report ? report.title : "Report" };
}

function documentIcon(type: string) {
  if (type === "xlsx" || type === "csv") return FileSpreadsheet;
  if (type === "docx") return FileType;
  return FileText;
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const store = getStore();
  const report = store.getReport(id);
  if (!report) notFound();

  const organization = store.getOrganization();
  const documents = store.listDocuments();
  const findings = store.listFindings();
  const sources = report.sources
    .map((sourceId) => documents.find((document) => document.id === sourceId))
    .filter((document): document is NonNullable<typeof document> => Boolean(document));
  const citedFindings = findings.filter((finding) =>
    report.sections.some((section) => section.citations.includes(finding.id)),
  );
  const plainText = [report.title, report.period, ""]
    .concat(report.sections.map((section) => section.heading + "\n" + section.body))
    .join("\n\n");

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/reports"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        data-print="hide"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All reports
      </Link>

      <PageHeader
        eyebrow="Report"
        title={report.title}
        description={
          reportTypeLabel(report.type) + " · " + report.period + " · generated " + formatDateTime(report.createdAt)
        }
        actions={<ReportActions text={plainText} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Corroborated claims
          </p>
          <p className="mt-2 text-lg font-semibold tabular-nums" data-numeric>
            {report.trust.verified}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Backed by more than one document</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Needs review</p>
          <p className="mt-2 text-lg font-semibold tabular-nums" data-numeric>
            {report.trust.needsReview}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Open issues still unresolved</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Unanalysed sources</p>
          <p className="mt-2 text-lg font-semibold tabular-nums" data-numeric>
            {report.trust.unsupported}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Documents with no extracted figures</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="size-4 text-success-text" aria-hidden="true" />
            Trust summary
            <Badge tone="success" dot>
              Trust Mode enabled
            </Badge>
            <span className="text-xs font-normal text-muted-foreground">
              {report.trust.verified} corroborated · {report.trust.needsReview} to review ·{" "}
              {report.trust.unsupported} unanalysed
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          ImpactOS computed these counts from the workspace itself, not from the drafting model — so the
          confidence statement in this report always matches the evidence behind it.
        </CardContent>
      </Card>

      <article className="flex flex-col gap-4" data-print="keep">
        <header className="rounded-xl border border-border bg-card px-6 py-5" data-print="keep">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-primary-text uppercase">
                {organization.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {reportTypeLabel(report.type)} · {report.period} · prepared with ImpactOS
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success" dot>
                Trust Mode enabled
              </Badge>
              <span className="text-xs text-muted-foreground">
                {report.trust.verified} corroborated · {report.trust.needsReview} to review ·{" "}
                {report.trust.unsupported} unanalysed
              </span>
            </div>
          </div>
        </header>

        {report.sections.map((section, index) => (
          <Card key={section.heading + index} className="p-6">
            <h2 className="text-base font-semibold tracking-tight">{section.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-pretty">{section.body}</p>
            {section.citations.length > 0 ? (
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                Drawn from {section.citations.length} source record
                {section.citations.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </Card>
        ))}
      </article>

      <Section title="Sources behind this report" flush>
        {sources.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No documents are linked to this report.</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {sources.map((document) => {
              const Icon = documentIcon(document.type);
              return (
                <li key={document.id} className="p-5">
                  <Link href={"/documents/" + document.id} className="group flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium tracking-tight group-hover:text-primary-text">
                        {document.displayName}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {document.type.toUpperCase()} · {document.factsCount} figures extracted
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {citedFindings.length > 0 ? (
        <Section title="Findings cited" flush>
          <ul className="divide-y divide-border border-t border-border">
            {citedFindings.map((finding) => (
              <li key={finding.id} className="p-5">
                <Link href={"/insights?finding=" + encodeURIComponent(finding.id)} className="group block">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={severityTone(finding.severity)} dot>
                      {severityLabel(finding.severity)}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm font-medium tracking-tight group-hover:text-primary-text">
                    {finding.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{finding.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
