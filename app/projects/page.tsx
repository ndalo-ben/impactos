import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Badge, Card, Progress, buttonVariants } from "@/components/ui";
import { getStore } from "@/lib/data";
import { countLabel, formatDate, formatKes, formatKesCompact, formatPercent } from "@/lib/format";
import { projectStatusLabel, projectStatusTone } from "@/lib/tone";

export const metadata: Metadata = { title: "Projects" };
/* The programme board is a read-only view over the live workspace. */
export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  const store = getStore();
  const projects = store.listProjects();
  const organization = store.getOrganization();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description={
          "The programmes " + organization.name + " delivers, with their reach, delivery and budget position."
        }
      />

      {projects.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Once projects exist, their reach, delivery and budget appear here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {projects.map((project) => {
            const utilisation =
              project.budgetKes > 0 ? Math.round((project.spentKes / project.budgetKes) * 100) : 0;
            return (
              <Card key={project.id} className="flex flex-col p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {project.code}
                    </p>
                    <h2 className="mt-1 text-base font-semibold tracking-tight">{project.name}</h2>
                  </div>
                  <Badge tone={projectStatusTone(project.status)} dot>
                    {projectStatusLabel(project.status)}
                  </Badge>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {project.description}
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Reach</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                      <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {countLabel(project.beneficiaryCount, "beneficiary", "beneficiaries")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Activities</dt>
                    <dd className="mt-0.5 font-medium tabular-nums" data-numeric>
                      {project.completedActivityCount} of {project.activityCount} complete
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Budget used</dt>
                    <dd className="mt-0.5 font-medium tabular-nums" data-numeric>
                      {formatKes(project.spentKes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Budget held</dt>
                    <dd className="mt-0.5 font-medium tabular-nums" data-numeric>
                      {formatKesCompact(project.budgetKes)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>Delivery progress</span>
                    <span className="font-medium tabular-nums" data-numeric>
                      {formatPercent(project.progress)}
                    </span>
                  </div>
                  <Progress value={project.progress} label={project.name + " progress"} className="mt-1.5" />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {formatPercent(utilisation)} of budget used
                  </p>
                </div>

                <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {project.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {formatDate(project.startDate)} – {formatDate(project.endDate)}
                  </span>
                </p>

                <div className="mt-5 border-t border-border pt-4">
                  <Link
                    href={"/projects/" + project.id}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Open project
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
