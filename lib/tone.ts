/**
 * ImpactOS — design-system semantics.
 *
 * One place that answers "what colour and word does this domain state get?".
 * Pure data + type-only imports, so it is safe in both server and client
 * components. Keep every screen honest by rendering status through these maps
 * instead of inventing ad-hoc colours.
 */

import type {
  ActivityStatus,
  BeneficiaryStatus,
  DocumentStatus,
  FindingConfidence,
  FindingSeverity,
  FindingStatus,
  FindingType,
  ProjectStatus,
  ReportType,
} from "./types";

/** The shared colour vocabulary (mirrors the Badge tones in the UI kit). */
export type Tone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

/* ------------------------------------------------------------------ */
/* Findings                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_TONE: Record<FindingSeverity, Tone> = {
  critical: "danger",
  warning: "warning",
  info: "info",
  success: "success",
};

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
  success: "Verified",
};

export function severityTone(severity: FindingSeverity): Tone {
  return SEVERITY_TONE[severity] ?? "neutral";
}

export function severityLabel(severity: FindingSeverity): string {
  return SEVERITY_LABEL[severity] ?? "Unknown";
}

const FINDING_TYPE_TONE: Record<FindingType, Tone> = {
  inconsistency: "danger",
  financial_mapping: "warning",
  missing_information: "warning",
  verified: "success",
};

const FINDING_TYPE_LABEL: Record<FindingType, string> = {
  inconsistency: "Inconsistency",
  financial_mapping: "Financial mapping",
  missing_information: "Missing information",
  verified: "Verified claim",
};

export function findingTypeTone(type: FindingType): Tone {
  return FINDING_TYPE_TONE[type] ?? "neutral";
}

export function findingTypeLabel(type: FindingType): string {
  return FINDING_TYPE_LABEL[type] ?? "Finding";
}

const FINDING_STATUS_TONE: Record<FindingStatus, Tone> = {
  open: "warning",
  reviewed: "success",
  dismissed: "neutral",
};

const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  open: "Open",
  reviewed: "Reviewed",
  dismissed: "Dismissed",
};

export function findingStatusTone(status: FindingStatus): Tone {
  return FINDING_STATUS_TONE[status] ?? "neutral";
}

export function findingStatusLabel(status: FindingStatus): string {
  return FINDING_STATUS_LABEL[status] ?? "Unknown";
}

const CONFIDENCE_TONE: Record<FindingConfidence, Tone> = {
  high: "success",
  medium: "warning",
  needs_verification: "neutral",
};

const CONFIDENCE_LABEL: Record<FindingConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  needs_verification: "Needs verification",
};

export function confidenceTone(confidence: FindingConfidence): Tone {
  return CONFIDENCE_TONE[confidence] ?? "neutral";
}

export function confidenceLabel(confidence: FindingConfidence): string {
  return CONFIDENCE_LABEL[confidence] ?? "Unknown";
}

/* ------------------------------------------------------------------ */
/* Documents, projects, activity                                       */
/* ------------------------------------------------------------------ */

const DOCUMENT_STATUS_TONE: Record<DocumentStatus, Tone> = {
  uploaded: "neutral",
  processing: "info",
  analyzed: "success",
  failed: "danger",
};

const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  analyzed: "Analyzed",
  failed: "Failed",
};

export function documentStatusTone(status: DocumentStatus): Tone {
  return DOCUMENT_STATUS_TONE[status] ?? "neutral";
}

export function documentStatusLabel(status: DocumentStatus): string {
  return DOCUMENT_STATUS_LABEL[status] ?? "Unknown";
}

const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  on_track: "success",
  needs_attention: "warning",
  at_risk: "danger",
  completed: "accent",
};

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  on_track: "On track",
  needs_attention: "Needs attention",
  at_risk: "At risk",
  completed: "Completed",
};

export function projectStatusTone(status: ProjectStatus): Tone {
  return PROJECT_STATUS_TONE[status] ?? "neutral";
}

export function projectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_LABEL[status] ?? "Unknown";
}

const ACTIVITY_STATUS_TONE: Record<ActivityStatus, Tone> = {
  completed: "success",
  in_progress: "info",
  postponed: "warning",
  planned: "neutral",
};

const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  completed: "Completed",
  in_progress: "In progress",
  postponed: "Postponed",
  planned: "Planned",
};

export function activityStatusTone(status: ActivityStatus): Tone {
  return ACTIVITY_STATUS_TONE[status] ?? "neutral";
}

export function activityStatusLabel(status: ActivityStatus): string {
  return ACTIVITY_STATUS_LABEL[status] ?? "Unknown";
}

const BENEFICIARY_STATUS_TONE: Record<BeneficiaryStatus, Tone> = {
  active: "success",
  exited: "neutral",
  graduated: "primary",
};

const BENEFICIARY_STATUS_LABEL: Record<BeneficiaryStatus, string> = {
  active: "Active",
  exited: "Exited",
  graduated: "Graduated",
};

export function beneficiaryStatusTone(status: BeneficiaryStatus): Tone {
  return BENEFICIARY_STATUS_TONE[status] ?? "neutral";
}

export function beneficiaryStatusLabel(status: BeneficiaryStatus): string {
  return BENEFICIARY_STATUS_LABEL[status] ?? "Unknown";
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  donor_update: "Donor update",
  executive_summary: "Executive summary",
  project_report: "Project report",
  monthly_operations: "Monthly operations",
};

export function reportTypeLabel(type: ReportType): string {
  return REPORT_TYPE_LABEL[type] ?? "Report";
}
