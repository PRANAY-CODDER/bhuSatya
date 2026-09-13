import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { landRecords, type LandRecord } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { logAudit, pushNotification, toDTO } from "@/lib/queries";
import { isLocalAuthMode } from "@/lib/auth";
import { localRecord, removeLocalRecord } from "@/lib/local-data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { ids, action } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length || typeof action !== "string") {
    return Response.json({ error: "ids[] and action required" }, { status: 400 });
  }
  const rows: LandRecord[] = isLocalAuthMode ? ids.map((id: string) => localRecord(id)).filter(Boolean) as LandRecord[] : await db.select().from(landRecords).where(inArray(landRecords.id, ids));
  if (!rows.length) return Response.json({ error: "No matching records" }, { status: 404 });

  if (action === "delete") {
    if (isLocalAuthMode) ids.forEach((id: string) => removeLocalRecord(id));
    else await db.delete(landRecords).where(inArray(landRecords.id, ids));
    await logAudit({ actor: user.name, action: `Bulk delete — ${rows.length} records`, category: "system", details: rows.map((r) => r.recordNo).join(", ") });
    return Response.json({ ok: true, deleted: rows.length });
  }

  const map: Record<string, string> = { verify: "verified", flag: "flagged", review: "review", approve: "verified", reject: "rejected" };
  const status = map[action];
  if (!status) return Response.json({ error: "Unknown action" }, { status: 400 });

  const updated: LandRecord[] = isLocalAuthMode
    ? rows.map((row) => {
        const next = { status, updatedAt: new Date(), stage: status === "verified" || status === "rejected" ? "done" : "validation", ...(status === "verified" ? { verifiedAt: new Date() } : {}) };
        Object.assign(row, next);
        return row;
      })
    : await db.update(landRecords).set({ status, updatedAt: new Date(), stage: status === "verified" || status === "rejected" ? "done" : "validation", ...(status === "verified" ? { verifiedAt: new Date() } : {}) }).where(inArray(landRecords.id, ids)).returning();

  await logAudit({ actor: user.name, action: `Bulk ${action} — ${updated.length} records`, category: "review", details: updated.slice(0, 8).map((r) => r.recordNo).join(", ") + (updated.length > 8 ? "…" : "") });
  await pushNotification({
    type: status === "verified" ? "success" : "info",
    title: `Bulk ${action} completed`,
    body: `${updated.length} records updated by ${user.name}`,
  });

  return Response.json({ ok: true, records: updated.map(toDTO) });
}
