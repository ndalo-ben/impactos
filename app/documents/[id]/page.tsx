import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, FileText, FileType, Quote } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Badge, Card, CardContent, CardHeader, CardTitle, buttonVariants } from "@/components/ui";
import { Section } from "@/components/common";
import { DocumentActions } from "@/components/documents/document-actions";
import { getStore } from "@/lib/data";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import {
  confidenceLabel,
  confidenceTone,
  documentStatusLabel,
  documentStatusTone,
  severityLabel,
  severityTone,
} from "@/lib/tone";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const document = getStore().getDocument(id);
  return { title: document ? document.displayName : "Document" };
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const store = getStore();
  const document = store.getDocument(id);
  if (!document) notFound();

  const facts = store.listFacts({ documentId: id });
  const findings = store
    .listFindings()
    .filter((finding) => finding.evidence.some((row) => row.documentId === id));
  const DocumentIcon =
    document.type === "xlsx" || document.type === "csv"
      ? FileSpreadsheet
      : document.type === "docx"
        ? FileType
        : FileText;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/documents"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All documents
      </Link>

      <PageHeader
        eyebrow="Evidence"
        title={document.displayName}
        description={document.summary ?? "This document has not been summarised yet."}
        actions={<DocumentActions documentId={document.id} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">File</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium">
            <DocumentIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            {document.fileName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {document.type.toUpperCase()} · {formatBytes(document.sizeBytes)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</p>
          <p className="mt-2">
            <Badge tone={documentStatusTone(document.status)} dot size="md">
              {documentStatusLabel(document.status)}
            </Badge>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {document.analyzedAt ? "Analysed " + formatDateTime(document.analyzedAt) : "Not analysed yet"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Figures extracted</p>
          <p className="mt-2 text-lg font-semibold tabular-nums" data-numeric>
            {facts.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {document.pageCount ? document.pageCount + " pages" : "Spreadsheet"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Linked findings</p>
          <p className="mt-2 text-lg font-semibold tabular-nums" data-numeric>
            {findings.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Uploaded {formatDate(document.uploadedAt)}
          </p>
        </Card>
      </div>

      {document.error ? (
        <Card className="border-danger/30 bg-danger/5 p-5">
          <p className="text-sm font-medium text-danger-text">Analysis failed</p>
          <p className="mt-1 text-sm text-muted-foreground">{document.error}</p>
        </Card>
      ) : null}

      <Section
        title="Figures quoted from this document"
        description="Each figure keeps the verbatim sentence it was read from."
        flush
      >
        {facts.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            No figures were extracted from this document.
          </p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {facts.map((fact) => (
              <li key={fact.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium tracking-tight">{fact.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fact.field} · {fact.category} · {fact.locator}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums" data-numeric>
                      {fact.value}
                      {fact.unit && !fact.value.toLowerCase().includes(fact.unit.toLowerCase())
                        ? " " + fact.unit
                        : ""}
                    </span>
                    <Badge tone={confidenceTone(fact.confidence)}>{confidenceLabel(fact.confidence)}</Badge>
                  </div>
                </div>
                <blockquote className="mt-2 flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <Quote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                  <span className="text-pretty italic">{fact.quote}</span>
                </blockquote>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Findings that quote this document" flush>
        {findings.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            Nothing in this document is contested right now.
          </p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {findings.map((finding) => (
              <li key={finding.id} className="p-5">
                <Link href={"/insights?finding=" + encodeURIComponent(finding.id)} className="group block">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={severityTone(finding.severity)} dot>
                      {severityLabel(finding.severity)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{finding.type.replace(/_/g, " ")}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium tracking-tight group-hover:text-primary-text">
                    {finding.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{finding.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Card>
        <CardHeader>
          <CardTitle>Not the right evidence?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Add the missing document and ImpactOS will re-check every figure it disagrees with.
          </p>
          <Link href="/documents" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Upload a document
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
