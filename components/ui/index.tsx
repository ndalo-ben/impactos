/**
 * ImpactOS UI kit — the primitives every screen is built from.
 *
 * Import from "@/components/ui" (never reach into the individual files), so a
 * primitive can be restyled without touching call sites.
 */

export { Button, buttonVariants } from "./button";
export type { ButtonProps, ButtonSize, ButtonVariant } from "./button";

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardStat,
  CardTitle,
} from "./card";

export { Badge } from "./badge";
export type { BadgeProps } from "./badge";

export { Field, FieldError, FieldHint, Input, Label, Select, Textarea } from "./form";
export type { FieldProps } from "./form";

export { InlineAlert, Progress, Separator, Skeleton, Spinner } from "./feedback";
export type { InlineAlertProps } from "./feedback";
