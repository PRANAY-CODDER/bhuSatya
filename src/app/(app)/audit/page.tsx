import { getAuditTrail } from "@/lib/queries";
import { AuditClient } from "@/components/audit/audit-client";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const rows = await getAuditTrail(80);
  return <AuditClient initialRows={rows} />;
}
