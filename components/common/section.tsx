import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui";

export interface SectionProps {
  title: string;
  description?: ReactNode;
  /** A link or button that sits at the right of the header. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Removes the inner padding — for tables and lists that bleed to the edge. */
  flush?: boolean;
}

/** A titled panel: the standard way a screen groups a set of records. */
export function Section({
  title,
  description,
  action,
  children,
  className,
  flush = false,
}: SectionProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 p-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {flush ? children : <CardContent>{children}</CardContent>}
    </Card>
  );
}
