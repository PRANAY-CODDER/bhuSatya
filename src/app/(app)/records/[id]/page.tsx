import { notFound } from "next/navigation";
import { getRecord } from "@/lib/queries";
import { RecordDetailClient } from "@/components/records/record-detail-client";

export const dynamic = "force-dynamic";

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRecord(decodeURIComponent(id));
  if (!data) notFound();
  return <RecordDetailClient record={data.record} audits={data.audits} />;
}
