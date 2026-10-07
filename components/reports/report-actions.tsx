"use client";

import Link from "next/link";
import { Download, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui";
import { CopyButton } from "@/components/common";

/**
 * Actions for a generated report: save a PDF, copy the text, or go back and
 * edit the inputs. "Download PDF" uses the browser's own print-to-PDF so the
 * exported document is exactly the previewed one — no server-side renderer.
 */
export function ReportActions({ text }: { text: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-print="hide">
      <Button type="button" variant="primary" size="sm" onClick={() => window.print()}>
        <Download aria-hidden="true" />
        Download PDF
      </Button>
      <CopyButton value={text} label="Copy" />
      <Link
        href="/reports"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
        aria-label="Edit this report's inputs"
      >
        <Pencil aria-hidden="true" />
        Edit
      </Link>
    </div>
  );
}
