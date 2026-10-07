import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** A lucide icon component (or any component that renders at size-5). */
  icon?: ComponentType<{ className?: string }>;
  /** Primary call to action — a Button or Link. */
  action?: ReactNode;
  /** A quieter second line of actions. */
  secondaryAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** What a screen shows before it has anything to show — never a blank panel. */
export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  secondaryAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-10 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      ) : null}
      <p className="mt-3 text-sm font-semibold tracking-tight text-balance">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
      {action || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
      {children}
    </div>
  );
}
