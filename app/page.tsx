import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  MessageSquare,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Badge, Progress, buttonVariants } from "@/components/ui";
import { Section, StatCard } from "@/components/common";
import { getStore } from "@/lib/data";
import { countLabel, formatDate, formatKesCompact, formatNumber, formatPercent } from "@/lib/format";
import {
  documentStatusLabel,
  documentStatusTone,
  findingStatusLabel,
  findingStatusTone,
  projectStatusLabel,
  projectStatusTone,
  severityLabel,
  severityTone,
} from "@/lib/tone";

/** The dashboard always reflects the live workspace. */
export const dynamic = "force-dynamic";

export default function OverviewPage() {
  const store = getStore();
  const organization = store.getOrganization();
  const metrics = store.getMetrics();
  const projects = store.listProjects();
  const recentDocuments = store.listDocuments().slice(0, 5);
  const openFindings = store.listFindings({ status: "open" });
  const attention = openFindings.filter((finding) => finding.type !== "verified").slice(0, 4);
  const upcoming = store.listActivities().filter((activity) => activity.status !== "completed").slice(0, 4);
  const activityPercent =
    metrics.activities > 0 ? (metrics.activitiesCompleted / metrics.activities) * 100 : 0;
  const analysedPercent =
    metrics.documents > 0 ? (metrics.documentsAnalyzed / metrics.documents) * 100 : 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Overview"
        title={organization.greeting}
        description={`Where ${organization.name} stands for ${organization.reportingPeriod}. Every figure here is traceable to a source record.`}
        actions={
          <>
            <Link href="/documents" className={buttonVariants({ variant: "secondary" })}>
              <FileText aria-hidden="true" />
              Add evidence
            </Link>
            <Link href="/reports" className={buttonVariants({ variant: "primary" })}>
              <ClipboardList aria-hidden="true" />
              Draft a report
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Beneficiaries reached"
          value={formatNumber(metrics.beneficiaries)}
          icon={Users}
          tone="primary"
          delta={{
            label:
              (metrics.beneficiariesDeltaPct >= 0 ? "+" : "") +
              formatPercent(metrics.beneficiariesDeltaPct) +
              " vs " +
              formatNumber(metrics.beneficiariesPrevious) +
              " last period",
            direction: metrics.beneficiariesDeltaPct > 0 ? "up" : metrics.beneficiariesDeltaPct < 0 ? "down" : "flat",
            tone: metrics.beneficiariesDeltaPct >= 0 ? "success" : "danger",
          }}
          hint={"Across " + countLabel(metrics.projects, "project")}
        />
        <StatCard
          label="Activities completed"
          value={formatNumber(metrics.activitiesCompleted) + " / " + formatNumber(metrics.activities)}
          icon={Target}
          tone="accent"
          hint={formatPercent(activityPercent) + " of the planned programme delivered"}
        />
        <StatCard
          label="Documents analysed"
          value={formatNumber(metrics.documentsAnalyzed) + " / " + formatNumber(metrics.documents)}
          icon={FileText}
          tone="info"
          hint={formatPercent(analysedPercent) + " of the evidence library read end to end"}
        />
        <StatCard
          label="Open findings"
          value={formatNumber(metrics.openFindings)}
          icon={TriangleAlert}
          tone={metrics.criticalFindings > 0 ? "danger" : "warning"}
          hint={
            metrics.criticalFindings > 0
              ? formatNumber(metrics.criticalFindings) + " critical, needs a decision"
              : "Nothing critical is unresolved"
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Section
            title="Needs your attention"
            description="Open findings where the evidence does not yet line up."
            action={
              <Link href="/insights" className="inline-flex items-center gap-1 text-xs font-medium text-primary-text hover:underline">
                All insights
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          >
            {attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing is open right now — every figure in the workspace is corroborated.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {attention.map((finding) => (
                  <li key={finding.id} className="py-3 first:pt-0 last:pb-0">
                    <Link href={"/insights?finding=" + encodeURIComponent(finding.id)} className="group block">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={severityTone(finding.severity)} dot>
                          {severityLabel(finding.severity)}
                        </Badge>
                        <Badge tone={findingStatusTone(finding.status)}>{findingStatusLabel(finding.status)}</Badge>
                        {finding.projectName ? (
                          <span className="text-xs text-muted-foreground">{finding.projectName}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Organisation-wide</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-medium tracking-tight group-hover:text-primary-text">
                        {finding.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {finding.summary}
                      </p>
                      {finding.difference ? (
                        <p className="mt-1.5 text-xs font-medium tabular-nums" data-numeric>
                          {finding.difference.label}: {finding.difference.value}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Programmes"
            description="Delivery and reach, project by project."
            action={
              <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-medium text-primary-text hover:underline">
                All projects
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          >
            <ul className="flex flex-col gap-5">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link href={"/projects/" + project.id} className="group block">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <span className="text-sm font-medium tracking-tight group-hover:text-primary-text">
                        {project.name}
                      </span>
                      <Badge tone={projectStatusTone(project.status)} dot>
                        {projectStatusLabel(project.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {countLabel(project.beneficiaryCount, "beneficiary", "beneficiaries")} ·{" "}
                      {project.completedActivityCount}/{project.activityCount} activities ·{" "}
                      {formatKesCompact(project.spentKes)} of {formatKesCompact(project.budgetKes)}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={project.progress} label={project.name + " progress"} className="flex-1" />
                      <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums" data-numeric>
                        {formatPercent(project.progress)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          <Section
            title="Latest evidence"
            action={
              <Link href="/documents" className="inline-flex items-center gap-1 text-xs font-medium text-primary-text hover:underline">
                Library
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          >
            <ul className="flex flex-col divide-y divide-border">
              {recentDocuments.map((document) => (
                <li key={document.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link href={"/documents/" + document.id} className="group block">
                    <p className="truncate text-sm font-medium tracking-tight group-hover:text-primary-text">
                      {document.displayName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge tone={documentStatusTone(document.status)}>
                        {documentStatusLabel(document.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(document.uploadedAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Coming up" description="Activities that are not finished yet.">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every planned activity is complete.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {upcoming.map((activity) => (
                  <li key={activity.id} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium tracking-tight">{activity.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(activity.plannedDate)} · {activity.location}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Ask ImpactOS" description="Grounded answers, with the records behind them.">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ask why the beneficiary count moved, what a donor update should say, or which figures disagree —
              every answer cites the findings and documents it used.
            </p>
            <Link href="/ask" className={buttonVariants({ variant: "primary", size: "sm" }) + " mt-4"}>
              <MessageSquare aria-hidden="true" />
              Ask a question
            </Link>
          </Section>
        </div>
      </div>
    </div>
  );
}
