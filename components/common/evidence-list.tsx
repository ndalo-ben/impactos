import { FileSpreadsheet, FileText, FileType, Quote } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui";
import type { EvidenceReference } from "@/lib/types";

function DocumentIcon({ type }: { type: EvidenceReference["documentType"] }) {
  const Icon = type === "xlsx" || type === "csv" ? FileSpreadsheet : type === "docx" ? FileType : FileText;
  return <Icon className="size-3.5" aria-hidden="true" />;
}

/**
 * The two (or more) verbatim quotes a finding rests on. Every claim in
 * ImpactOS is only as good as the text underneath it, so this block always
 * shows the quote, where it came from, and which document holds it.
 */
export function EvidenceList({
  evidence,
  className,
}: {
  evidence: EvidenceReference[];
  className?: string;
}) {
  if (evidence.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No source text is attached to this finding yet.
      </p>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {evidence.map((row) => (
        <li key={row.id} className="rounded-lg border border-border bg-muted/30 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={row.side === "a" ? "outline" : "neutral"}>
              {row.side === "a" ? "Source A" : "Source B"}
            </Badge>
            <span className="text-xs font-semibold tracking-tight">{row.label}</span>
            <span className="text-xs font-semibold tabular-nums" data-numeric>
              {row.value}
              {row.unit ? " " + row.unit : ""}
            </span>
          </div>
          <blockquote className="mt-2 flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <Quote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
            <span className="text-pretty italic">{row.quote}</span>
          </blockquote>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <DocumentIcon type={row.documentType} />
            <span className="font-medium text-foreground">{row.documentName}</span>
            <span aria-hidden="true">·</span>
            <span>{row.locator}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
