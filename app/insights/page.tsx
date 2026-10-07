import type { Metadata } from "next";
import { FindingsBoard } from "@/components/insights/findings-board";
import { getStore } from "@/lib/data";

export const metadata: Metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ finding?: string | string[] }>;
}

export default async function InsightsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params.finding) ? params.finding[0] : params.finding;

  const store = getStore();
  const findings = store.listFindings();
  const counts = {
    total: findings.length,
    open: findings.filter((finding) => finding.status === "open").length,
    reviewed: findings.filter((finding) => finding.status === "reviewed").length,
    dismissed: findings.filter((finding) => finding.status === "dismissed").length,
    criticalOpen: findings.filter(
      (finding) => finding.status === "open" && finding.severity === "critical",
    ).length,
  };

  return (
    <FindingsBoard
      findings={findings}
      counts={counts}
      projects={store.listProjects()}
      initialFindingId={typeof requested === "string" ? requested : null}
    />
  );
}
