import { getSessionUser } from "@/lib/auth";
import { getAuditTrail, getNotifications, queryRecords } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const [records, audit, notifications] = await Promise.all([
    queryRecords({ page: 1, pageSize: 100 }),
    getAuditTrail(500),
    getNotifications(),
  ]);
  const backup = { version: 1, createdAt: new Date().toISOString(), createdBy: user.email, records: records.rows, audit, notifications };
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=bhulekh-backup-${new Date().toISOString().slice(0, 10)}.json`,
    },
  });
}
