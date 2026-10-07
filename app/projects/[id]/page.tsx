import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout";
import { Badge, Card, Progress } from "@/components/ui";
import { Section } from "@/components/common";
import { getStore } from "@/lib/data";
import { countLabel, formatDate, formatKes, formatPercent } from "@/lib/format";
import {
  activityStatusLabel,
  activityStatusTone,
  beneficiaryStatusLabel,
  beneficiaryStatusTone,
  projectStatusLabel,
  projectStatusTone,
} from "@/lib/tone";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = getStore().getProject(id);
  return { title: project ? project.name : "Project" };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const store = getStore();
  const project = store.getProject(id);
  if (!project) notFound();

  const activities = store.listActivities(id);
  const beneficiaries = store.listBeneficiaries(id);
  const documents = store.listDocuments().filter((document) => document.projectId === id);
  const findings = store
    .listFindings()
    .filter((finding) => finding.projectId === id)
    .slice(0, 4);
  const utilisation =
    project.budgetKes > 0 ? Math.round((project.spentKes / project.budgetKes) * 100) : 0;
  const byCohort = new Map<string, number>();
  for (const beneficiary of beneficiaries) {
    byCohort.set(beneficiary.cohort, (byCohort.get(beneficiary.cohort) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/projects"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All projects
      </Link>

      <PageHeader
        eyebrow={project.code}
        title={project.name}
        description={project.summary}
        actions={
          <Badge tone={projectStatusTone(project.status)} dot size="md">
            {projectStatusLabel(project.status)}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Reach</p>
          <p className="mt-2 flex items-center gap-2 text-lg font-semibold tabular-nums" data-numeric>
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
            {project.beneficiaryCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {countLabel(beneficiaries.filter((b) => b.status === "active").length, "active participant")}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Delivery</p>
          <p className="mt-2 text-lg font-semibold tabular-nums" data-numeric>
            {project.completedActivityCount} / {project.activityCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">activities complete</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Spent</p>
          <p className="mt-2 text-lg font-semibold tabular-nums" data-numeric>
            {formatKes(project.spentKes)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            of {formatKes(project.budgetKes)} ({formatPercent(utilisation)})
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Lead & window</p>
          <p className="mt-2 text-sm font-medium">{project.lead}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatDate(project.startDate)} – {formatDate(project.endDate)}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">Delivery progress</span>
          <span className="font-semibold tabular-nums" data-numeric>
            {formatPercent(project.progress)}
          </span>
        </div>
        <Progress value={project.progress} label={project.name + " progress"} className="mt-2" />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" />
          {project.location}
        </p>
      </Card>

      <Section title="Activities" description="What was planned, what happened, and what came out of it." flush>
        {activities.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No activities recorded" description="This project has no activities yet." />
          </div>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {activities.map((activity) => (
              <li key={activity.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 p-5">
                <div className="min-w-0 max-w-2xl">
                  <p className="text-sm font-medium tracking-tight">{activity.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(activity.plannedDate)}
                    {activity.completedDate ? " · completed " + formatDate(activity.completedDate) : ""}
                    {" · " + activity.location}
                    {activity.participants > 0 ? " · " + activity.participants + " participants" : ""}
                  </p>
                  {activity.outcome ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {activity.outcome}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-warning-text">
                      No outcome was recorded for this activity.
                    </p>
                  )}
                  {activity.note ? (
                    <p className="mt-1 text-xs text-muted-foreground italic">{activity.note}</p>
                  ) : null}
                </div>
                <Badge tone={activityStatusTone(activity.status)} dot>
                  {activityStatusLabel(activity.status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Beneficiaries" description={countLabel(beneficiaries.length, "person", "people") + " on this project."}> 
          {byCohort.size === 0 ? (
            <p className="text-sm text-muted-foreground">No beneficiaries are registered yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {[...byCohort.entries()].map(([cohort, count]) => (
                <li key={cohort} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{cohort}</span>
                  <span className="font-medium tabular-nums" data-numeric>
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {["active", "graduated", "exited"].map((status) => {
              const count = beneficiaries.filter((b) => b.status === status).length;
              return (
                <Badge key={status} tone={beneficiaryStatusTone(status as "active")}>
                  {beneficiaryStatusLabel(status as "active")}: {count}
                </Badge>
              );
            })}
          </div>
        </Section>

        <Section title="Evidence & findings" description="Documents filed against this project, and what they raised.">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents are filed against this project.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {documents.map((document) => (
                <li key={document.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link href={"/documents/" + document.id} className="group block">
                    <p className="truncate text-sm font-medium group-hover:text-primary-text">
                      {document.displayName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {document.factsCount} figures · {document.findingsCount} linked findings
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {findings.length > 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Recent findings
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {findings.map((finding) => (
                  <li key={finding.id}>
                    <Link
                      href={"/insights?finding=" + encodeURIComponent(finding.id)}
                      className="text-sm text-primary-text hover:underline"
                    >
                      {finding.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>
      </div>
    </div>
  );
}
