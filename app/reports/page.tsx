import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/reports-view";
import { aiStatus } from "@/lib/ai/gateway";
import { getStore } from "@/lib/data";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const store = getStore();
  const status = aiStatus();
  const reports = store.listReports();

  return (
    <ReportsView
      reports={reports}
      projects={store.listProjects()}
      reportingPeriod={store.getOrganization().reportingPeriod}
      aiConfigured={status.configured}
      counts={{
        drafts: reports.filter((report) => report.status === "draft").length,
        final: reports.filter((report) => report.status === "final").length,
      }}
    />
  );
}
