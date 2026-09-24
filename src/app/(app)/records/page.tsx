import { queryRecords } from "@/lib/queries";
import { RecordsClient } from "@/components/records/records-client";

export const dynamic = "force-dynamic";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const result = await queryRecords({
    status: sp.status?.split(",").filter(Boolean),
    minConf: sp.minConf ? Number(sp.minConf) : undefined,
    maxConf: sp.maxConf ? Number(sp.maxConf) : undefined,
    pageSize: 12,
  });
  return (
    <RecordsClient
      initialRows={result.rows}
      initialTotal={result.total}
      districts={result.districts}
      initialStatus={sp.status ?? ""}
      initialMinConf={sp.minConf ?? ""}
      initialMaxConf={sp.maxConf ?? ""}
      openNew={sp.new === "1"}
    />
  );
}
