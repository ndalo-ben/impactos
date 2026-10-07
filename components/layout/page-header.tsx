import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  title: string;
  /** Small label above the title, e.g. "Insights". */
  eyebrow?: string;
  description?: ReactNode;
  /** Buttons / links on the right — a primary action plus quiet ones. */
  actions?: ReactNode;
  /** Filters or tabs that sit under the title block. */
  children?: ReactNode;
  className?: string;
}

/** The in-page title block. One per screen, above the content. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-2xl">
          {eyebrow ? (
            <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
