import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { aiStatus } from "@/lib/ai/gateway";
import { getStore } from "@/lib/repository";
import "./globals.css";
/**
 * The application shell for every product screen (dashboard, documents,
 * insights, projects, ask, reports). It reads the workspace's real identity
 * server-side and degrades quietly if the store is unavailable, so a data
 * problem never takes the whole frame down.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  let organizationName: string | undefined;
  let reportingPeriod: string | undefined;
  let openFindings: number | undefined;

  try {
    const store = getStore();
    const organization = store.getOrganization();
    organizationName = organization.name;
    reportingPeriod = organization.reportingPeriod;
    openFindings = store.getMetrics().openFindings;
  } catch {
    /* the shell still renders with neutral defaults */
  }

  const status = aiStatus();

  return (
    <html>
      <body>
    <AppShell
      organizationName={organizationName}
      reportingPeriod={reportingPeriod}
      openFindings={openFindings}
      ai={{ configured: status.configured, message: status.message }}
    >
      {children}
    </AppShell></body>
    </html>
  );
}
