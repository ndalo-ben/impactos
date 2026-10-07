import type { Metadata } from "next";
import { AskConsole } from "@/components/ask/ask-console";
import { aiStatus } from "@/lib/ai/gateway";
import { getStore } from "@/lib/data";

export const metadata: Metadata = { title: "Ask ImpactOS" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function AskPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params.q) ? params.q[0] : params.q;
  const organization = getStore().getOrganization();
  const status = aiStatus();

  return (
    <AskConsole
      organizationName={organization.name}
      reportingPeriod={organization.reportingPeriod}
      ai={{ configured: status.configured, message: status.message }}
      initialQuestion={typeof requested === "string" ? requested : null}
    />
  );
}
