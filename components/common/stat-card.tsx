import type { ComponentType } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui";
import type { Tone } from "@/lib/tone";

const ICON_SURFACE: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  primary: "border-primary/25 bg-primary/10 text-primary-text",
  accent: "border-accent/30 bg-accent/10 text-accent-text",
  success: "border-success/30 bg-success/10 text-success-text",
  warning: "border-warning/35 bg-warning/15 text-warning-text",
  danger: "border-danger/30 bg-danger/10 text-danger-text",
  info: "border-info/30 bg-info/10 text-info-text",
  outline: "border-border bg-card text-foreground",
};

const DELTA_TONE: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  primary: "text-primary-text",
  accent: "text-accent-text",
  success: "text-success-text",
  warning: "text-warning-text",
  danger: "text-danger-text",
  info: "text-info-text",
  outline: "text-foreground",
};

export interface StatCardDelta {
  label: string;
  direction: "up" | "down" | "flat";
  tone?: Tone;
}

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: Tone;
  delta?: StatCardDelta;
  className?: string;
}

/** One headline number, with the evidence-shaped context under it. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  delta,
  className,
}: StatCardProps) {
  const DeltaIcon =
    delta?.direction === "up" ? TrendingUp : delta?.direction === "down" ? TrendingDown : Minus;
  const deltaTone = DELTA_TONE[delta?.tone ?? (delta?.direction === "up" ? "success" : "neutral")];

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md border [&_svg]:size-3.5",
              ICON_SURFACE[tone],
            )}
            aria-hidden="true"
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums" data-numeric>
        {value}
      </p>
      <div className="mt-1.5 flex flex-col gap-0.5">
        {delta ? (
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium", deltaTone)}>
            <DeltaIcon className="size-3.5" aria-hidden="true" />
            {delta.label}
          </span>
        ) : null}
        {hint ? <span className="text-xs leading-relaxed text-muted-foreground">{hint}</span> : null}
      </div>
    </Card>
  );
}
