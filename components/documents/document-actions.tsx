"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button, Field, InlineAlert } from "@/components/ui";
import { apiDelete, apiPost, errorMessage } from "@/lib/api/client";

/** Re-run analysis, or remove the document and everything derived from it. */
export function DocumentActions({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"analyze" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reanalyze() {
    setBusy("analyze");
    setError(null);
    setNotice(null);
    try {
      const result = await apiPost<{ analysis?: { source?: string; fallbackReason?: string | null } | null }>(
        "/api/documents/" + documentId + "/analyze",
        {},
      );
      const analysis = result.analysis;
      setNotice(
        analysis
          ? analysis.source === "ai"
            ? "Re-analysed with pre.dev AI."
            : "Re-analysed with the rules-based reader." + (analysis.fallbackReason ? " " + analysis.fallbackReason : "")
          : "The document was re-read, but no analysis was produced.",
      );
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this document, its extracted figures and the findings that depended on it?")) return;
    setBusy("delete");
    setError(null);
    try {
      await apiDelete("/api/documents/" + documentId);
      router.push("/documents");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" loading={busy === "analyze"} onClick={reanalyze}>
          <RefreshCw aria-hidden="true" />
          Re-analyse
        </Button>
        <Button variant="danger" loading={busy === "delete"} onClick={remove}>
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </div>
      {notice ? (
        <p className="max-w-md text-right text-xs text-success-text" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <InlineAlert tone="danger" title="That did not work" className="max-w-md text-left">
          {error}
        </InlineAlert>
      ) : null}
    </div>
  );
}
