import { notFound } from "next/navigation";
import { getRecord } from "@/lib/queries";
import { ValidationDetailClient } from "@/components/validation/validation-detail-client";

export const dynamic = "force-dynamic";

export default async function ValidationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRecord(decodeURIComponent(id));
  if (!data) notFound();
  return <ValidationDetailClient record={data.record} />;
}
