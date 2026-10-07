import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/tone";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  primary: "border-primary/25 bg-primary/10 text-primary-text",
  accent: "border-accent/30 bg-accent/10 text-accent-text",
  success: "border-success/30 bg-success/10 text-success-text",
  warning: "border-warning/35 bg-warning/15 text-warning-text",
  danger: "border-danger/30 bg-danger/10 text-danger-text",
  info: "border-info/30 bg-info/10 text-info-text",
  outline: "border-border bg-transparent text-foreground",
};

const DOT_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  outline: "bg-foreground",
};

export interface BadgeProps extends Omit<ComponentProps<"span">, "color"> {
  tone?: Tone;
  size?: "sm" | "md";
  /** Leading status dot — pairs with the tone colour. */
  dot?: boolean;
  icon?: ReactNode;
}

export function Badge({
  className,
  tone = "neutral",
  size = "sm",
  dot = false,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-xs",
        TONE_CLASSES[tone],
        "[&_svg]:size-3",
        className,
      )}
      {...props}
    >
      {dot ? (
        <span className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASSES[tone])} aria-hidden="true" />
      ) : null}
      {icon}
      {children}
    </span>
  );
}
