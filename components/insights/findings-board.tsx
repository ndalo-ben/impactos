"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Inbox, Search, Sparkles, TriangleAlert, X } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout";
import { Badge, Button, Card, InlineAlert, Input, Select } from "@/components/ui";
import { EvidenceList } from "@/components/common";
import { apiPatch, errorMessage } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import {
  confidenceLabel,
  confidenceTone,
  findingStatusLabel,
  findingStatusTone,
  findingTypeLabel,
  findingTypeTone,
  severityLabel,
  severityTone,
} from "@/lib/tone";
import type { Finding, FindingSeverity, FindingStatus, FindingType, Project } from "@/lib/types";

const STATUS_FILTERS: (FindingStatus | "all")[] = ["all", "open", "reviewed", "dismissed"];
const SEVERITIES: FindingSeverity[] = ["critical", "warning", "info", "success"];
const TYPES: FindingType[] = ["inconsistency", "missing_information", "financial_mapping", "verified"];

interface Counts {
  total: number;
  open: number;
  reviewed: number;
  dismissed: number;
  criticalOpen: number;
}

/**
 * The review queue. Findings are read from the server; the filters, the
 * expansion and the review decision happen here, against the real API.
 */
export function FindingsBoard({
  findings,
  counts,
  projects,
  initialFindingId,
}: {
  findings: Finding[];
  counts: Counts;
  projects: Project[];
  initialFindingId?: string | null;
}) {
  const [items, setItems] = useState(findings);
  const [status, setStatus] = useState<FindingStatus | "all">("all");
  const [severity, setSeverity] = useState<FindingSeverity | "">("");
  const [type, setType] = useState<FindingType | "">("");
  const [projectId, setProjectId] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(initialFindingId ?? null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Counts>(counts);
  const deepLinked = useRef(false);

  useEffect(() => {
    if (!initialFindingId || deepLinked.current) return;
    deepLinked.current = true;
    const timer = window.setTimeout(() => {
      document
        .getElementById("finding-" + initialFindingId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [initialFindingId]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((finding) => {
      if (status !== "all" && finding.status !== status) return false;
      if (severity && finding.severity !== severity) return false;
      if (type && finding.type !== type) return false;
      if (projectId && finding.projectId !== projectId) return false;
      if (needle) {
        const haystack = (
          finding.title +
          " " +
          finding.summary +
          " " +
          finding.detail +
          " " +
          finding.assessment
        ).toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [items, status, severity, type, projectId, query]);

  function recount(next: Finding[]): Counts {
    return {
      total: next.length,
      open: next.filter((finding) => finding.status === "open").length,
      reviewed: next.filter((finding) => finding.status === "reviewed").length,
      dismissed: next.filter((finding) => finding.status === "dismissed").length,
      criticalOpen: next.filter(
        (finding) => finding.status === "open" && finding.severity === "critical",
      ).length,
    };
  }

  async function review(id: string, next: FindingStatus) {
    setBusyId(id);
    setError(null);
    try {
      const result = await apiPatch<{ finding: Finding }>("/api/findings/" + id, { status: next });
      setItems((current) => {
        const updated = current.map((finding) => (finding.id === id ? { ...finding, ...result.finding } : finding));
        setTab(recount(updated));
        return updated;
      });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Insights"
        title="Insights"
        description="Where documents disagree, where information is missing, and what has been corroborated. Every finding shows the sentences it rests on."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning" size="md">
              {tab.open} open
            </Badge>
            {tab.criticalOpen > 0 ? (
              <Badge tone="danger" size="md" dot>
                {tab.criticalOpen} critical
              </Badge>
            ) : null}
            <Badge tone="success" size="md">
              {tab.reviewed} reviewed
            </Badge>
          </div>
        }
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((option) => {
            const active = status === option;
            const label = option === "all" ? "All" : findingStatusLabel(option);
            const count =
              option === "all" ? tab.total : option === "open" ? tab.open : option === "reviewed" ? tab.reviewed : tab.dismissed;
            return (
              <Button
                key={option}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatus(option)}
                aria-pressed={active}
              >
                {label}
                <span className="tabular-nums opacity-70" data-numeric>
                  {count}
                </span>
              </Button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search findings…"
              aria-label="Search findings"
              className="pl-9"
            />
          </div>
          <Select
            value={severity}
            onChange={(event) => setSeverity(event.target.value as FindingSeverity | "")}
            aria-label="Filter by severity"
          >
            <option value="">All severities</option>
            {SEVERITIES.map((option) => (
              <option key={option} value={option}>
                {severityLabel(option)}
              </option>
            ))}
          </Select>
          <Select
            value={type}
            onChange={(event) => setType(event.target.value as FindingType | "")}
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            {TYPES.map((option) => (
              <option key={option} value={option}>
                {findingTypeLabel(option)}
              </option>
            ))}
          </Select>
          <Select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            aria-label="Filter by project"
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {error ? (
        <InlineAlert tone="danger" title="That did not work">
          {error}
        </InlineAlert>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing to review here"
          description="No findings match these filters. Clear them, or upload more evidence for ImpactOS to cross-check."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((finding) => {
            const expanded = open === finding.id;
            return (
              <li key={finding.id} id={"finding-" + finding.id}>
                <Card className="overflow-hidden">
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={severityTone(finding.severity)} dot>
                          {severityLabel(finding.severity)}
                        </Badge>
                        <Badge tone={findingTypeTone(finding.type)}>{findingTypeLabel(finding.type)}</Badge>
                        <Badge tone={findingStatusTone(finding.status)}>{findingStatusLabel(finding.status)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {finding.projectName ?? "Organisation-wide"} · {formatDate(finding.createdAt)}
                        </span>
                      </div>
                      <Badge tone={confidenceTone(finding.confidence)}>{confidenceLabel(finding.confidence)}</Badge>
                    </div>

                    <h2 className="mt-3 text-base font-semibold tracking-tight text-balance">
                      {finding.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                      {finding.summary}
                    </p>

                    {finding.metrics.length > 0 ? (
                      <div className="mt-4 flex flex-wrap items-stretch gap-3">
                        {finding.metrics.map((metric) => (
                          <div
                            key={metric.label}
                            className="rounded-lg border border-border bg-muted/40 px-4 py-2.5"
                          >
                            <p className="text-xs text-muted-foreground">{metric.label}</p>
                            <p className="mt-0.5 text-base font-semibold tabular-nums" data-numeric>
                              {metric.value}
                            </p>
                          </div>
                        ))}
                        {finding.difference ? (
                          <div className="rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5">
                            <p className="text-xs text-muted-foreground">{finding.difference.label}</p>
                            <p className="mt-0.5 text-base font-semibold tabular-nums text-danger-text" data-numeric>
                              {finding.difference.value}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpen(expanded ? null : finding.id)}
                        aria-expanded={expanded}
                      >
                        <ChevronDown
                          className={expanded ? "rotate-180 transition-transform" : "transition-transform"}
                          aria-hidden="true"
                        />
                        {expanded ? "Hide detail" : "Why this was raised"}
                      </Button>
                      <span className="ml-auto flex flex-wrap items-center gap-2">
                        {finding.status !== "reviewed" ? (
                          <Button
                            variant="success"
                            size="sm"
                            loading={busyId === finding.id}
                            onClick={() => review(finding.id, "reviewed")}
                          >
                            <Check aria-hidden="true" />
                            Mark reviewed
                          </Button>
                        ) : null}
                        {finding.status !== "dismissed" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={busyId === finding.id}
                            onClick={() => review(finding.id, "dismissed")}
                          >
                            <X aria-hidden="true" />
                            Dismiss
                          </Button>
                        ) : null}
                        {finding.status !== "open" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busyId === finding.id}
                            onClick={() => review(finding.id, "open")}
                          >
                            Reopen
                          </Button>
                        ) : null}
                      </span>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="border-t border-border bg-muted/20 p-5">
                      <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        Assessment
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-pretty">{finding.assessment}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground italic">
                        Why confidence is {confidenceLabel(finding.confidence).toLowerCase()}: {finding.confidenceReason}
                      </p>

                      {finding.detail ? (
                        <>
                          <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Detail
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-pretty">
                            {finding.detail}
                          </p>
                        </>
                      ) : null}

                      <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Evidence
                      </p>
                      <EvidenceList evidence={finding.evidence} className="mt-2" />

                      {finding.recommendedAction ? (
                        <div className="mt-4 flex gap-2 rounded-lg border border-border bg-card p-3.5">
                          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden="true" />
                          <p className="text-sm leading-relaxed">
                            <span className="font-medium">Recommended action: </span>
                            {finding.recommendedAction}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
