import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAuditById } from "@/lib/report";
import type { AuditResult } from "@/components/audit";
import ReportView from "@/components/ReportView";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = (await getAuditById(params.id)) as AuditResult | null;
  if (!result) return { title: "PhotoScore" };
  return {
    title: `${result.store.name} scored ${result.score.grade} | PhotoScore`,
    description: result.score.summary,
  };
}

export default async function ReportPage({ params }: Props) {
  const result = (await getAuditById(params.id)) as AuditResult | null;
  if (!result) notFound();
  return <ReportView result={result} />;
}
