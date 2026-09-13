import { queryRecords } from "@/lib/queries";
import { MapClient } from "@/components/map/map-client";

export const dynamic = "force-dynamic";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { rows } = await queryRecords({ pageSize: 100, sort: "createdAt", order: "desc" });
  return <MapClient records={rows} focusNo={sp.focus ?? null} />;
}
