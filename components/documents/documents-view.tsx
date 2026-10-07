"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  FileType,
  Inbox,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout";
import { Badge, Button, Card, Field, InlineAlert, Input, Select } from "@/components/ui";
import { apiDelete, apiGet, apiPost, apiUpload, errorMessage } from "@/lib/api/client";
import { formatBytes, formatDate } from "@/lib/format";
import { documentStatusLabel, documentStatusTone } from "@/lib/tone";
import type { Document, DocumentStatus, Project } from "@/lib/types";

const STATUS_TABS: (DocumentStatus | "all")[] = ["all", "analyzed", "uploaded", "processing", "failed"];

function DocumentIcon({ type }: { type: Document["type"] }) {
  const Icon = type === "xlsx" || type === "csv" ? FileSpreadsheet : type === "docx" ? FileType : FileText;
  return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

/** The evidence library: upload, read, re-analyse and remove source documents. */
export function DocumentsView({
  documents,
  projects,
}: {
  documents: Document[];
  projects: Project[];
}) {
  const [items, setItems] = useState(documents);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DocumentStatus | "all">("all");
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProject, setUploadProject] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((document) => {
      if (status !== "all" && document.status !== status) return false;
      if (projectId && document.projectId !== projectId) return false;
      if (needle) {
        const haystack = (document.displayName + " " + document.fileName + " " + (document.summary ?? "")).toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [items, query, status, projectId]);

  async function refresh() {
    const data = await apiGet<{ documents: Document[] }>("/api/documents");
    setItems(data.documents);
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF, Word, Excel or CSV file first.");
      return;
    }
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.set("file", file);
      if (uploadProject) form.set("projectId", uploadProject);
      const result = await apiUpload<{ analysis?: { source?: string; fallbackReason?: string | null } | null }>(
        "/api/documents",
        form,
      );
      await refresh();
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setNotice(
        result.analysis?.source === "ai"
          ? "Uploaded and analysed with pre.dev AI."
          : "Uploaded and read by the rules-based extractor." +
              (result.analysis?.fallbackReason ? " " + result.analysis.fallbackReason : ""),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setUploading(false);
    }
  }

  async function reanalyze(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiPost("/api/documents/" + id + "/analyze", {});
      await refresh();
      setNotice("Re-analysis complete.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this document and the findings that depended on it?")) return;
    setBusyId(id);
    setError(null);
    try {
      await apiDelete("/api/documents/" + id);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Evidence"
        title="Documents"
        description="Every figure ImpactOS reports is read from a document here. Upload the reports, registers and spreadsheets behind your numbers."
      />

      <Card className="p-5">
        <form onSubmit={upload} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <Field label="Document" htmlFor="document-file" hint="PDF, DOCX, XLSX or CSV · up to 25 MB">
              <Input
                id="document-file"
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.xlsx,.csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="h-9 file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium"
              />
            </Field>
            <Field label="Project" htmlFor="document-project" hint="Optional — files it under a programme">
              <Select
                id="document-project"
                value={uploadProject}
                onChange={(event) => setUploadProject(event.target.value)}
              >
                <option value="">Not filed</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={uploading}>
              <Upload aria-hidden="true" />
              Upload & analyse
            </Button>
            <p className="text-xs text-muted-foreground">
              ImpactOS extracts the text, reads the figures and checks them against every other document.
            </p>
          </div>
        </form>
        {notice ? (
          <p className="mt-3 text-sm text-success-text" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <InlineAlert tone="danger" title="That did not work" className="mt-3">
            {error}
          </InlineAlert>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr] ">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents…"
              aria-label="Search documents"
              className="pl-9"
            />
          </div>
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
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as DocumentStatus | "all")}
            aria-label="Filter by status"
          >
            {STATUS_TABS.map((tab) => (
              <option key={tab} value={tab}>
                {tab === "all" ? "All statuses" : documentStatusLabel(tab)}
              </option>
            ))}
          </Select>
        </div>

        {visible.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={Inbox}
              title={items.length === 0 ? "No evidence yet" : "No documents match those filters"}
              description={
                items.length === 0
                  ? "Upload a report, register or budget line to give ImpactOS something to read."
                  : "Try a different status, project or search term."
              }
            />
          </div>
        ) : (
          <ul className="mt-5 flex flex-col divide-y divide-border border-t border-border">
            {visible.map((document) => (
              <li key={document.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 py-4">
                <div className="flex min-w-0 flex-1 gap-3">
                  <DocumentIcon type={document.type} />
                  <div className="min-w-0">
                    <Link
                      href={"/documents/" + document.id}
                      className="block truncate text-sm font-medium tracking-tight hover:text-primary-text"
                    >
                      {document.displayName}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Badge tone={documentStatusTone(document.status)}>{documentStatusLabel(document.status)}</Badge>
                      <span>{document.type.toUpperCase()}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatBytes(document.sizeBytes)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(document.uploadedAt)}</span>
                      {document.factsCount > 0 ? <span>· {document.factsCount} figures</span> : null}
                      {document.findingsCount > 0 ? (
                        <span className="text-warning-text">· {document.findingsCount} findings</span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busyId === document.id}
                    onClick={() => reanalyze(document.id)}
                  >
                    <RefreshCw aria-hidden="true" />
                    Re-analyse
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(document.id)}>
                    <Trash2 aria-hidden="true" />
                    <span className="sr-only">Delete {document.displayName}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
