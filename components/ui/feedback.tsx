import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/tone";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex items-center gap-2", className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function Separator({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}

export function Progress({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label ?? "Progress"}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: percent + "%" }}
      />
    </div>
  );
}

const ALERT_TONES: Partial<Record<Tone, { wrap: string; icon: ReactNode }>> = {
  neutral: { wrap: "border-border bg-muted/60 text-foreground", icon: <Info /> },
  info: { wrap: "border-info/30 bg-info/8 text-foreground", icon: <Info /> },
  success: { wrap: "border-success/30 bg-success/8 text-foreground", icon: <CheckCircle2 /> },
  warning: { wrap: "border-warning/35 bg-warning/10 text-foreground", icon: <AlertTriangle /> },
  danger: { wrap: "border-danger/30 bg-danger/8 text-foreground", icon: <AlertTriangle /> },
};

export interface InlineAlertProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** A calm, in-flow explanation — never a modal, never a shout. */
export function InlineAlert({ tone = "info", title, children, actions, className }: InlineAlertProps) {
  const config = ALERT_TONES[tone] ?? ALERT_TONES.info!;
  return (
    <div role="status" className={cn("flex gap-3 rounded-lg border px-4 py-3", config.wrap, className)}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-4" aria-hidden="true">
        {config.icon}
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-medium tracking-tight">{title}</p> : null}
        {children ? <div className="text-sm leading-relaxed text-muted-foreground">{children}</div> : null}
        {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
