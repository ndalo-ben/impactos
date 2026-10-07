import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-card hover:bg-primary/90",
  secondary: "border border-border bg-card text-foreground shadow-card hover:bg-muted/60",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted/60",
  ghost: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  danger: "bg-danger text-danger-foreground shadow-card hover:bg-danger/90",
  success: "bg-success text-success-foreground shadow-card hover:bg-success/90",
  link: "text-primary underline-offset-4 hover:underline",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[0.8125rem] [&_svg]:size-3.5",
  md: "h-9 px-3.5 text-sm [&_svg]:size-4",
  lg: "h-10 px-4 text-sm [&_svg]:size-4",
  icon: "size-9 [&_svg]:size-4",
};

export function buttonVariants(options?: { variant?: ButtonVariant; size?: ButtonSize }): string {
  const variant = options?.variant ?? "primary";
  const size = options?.size ?? "md";
  return cn(BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size]);
}

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction while an action is in flight. */
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
