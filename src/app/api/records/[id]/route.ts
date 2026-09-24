import { eq } from "drizzle-orm";
import { db } from "@/db";
import { landRecords } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getRecord, logAudit, pushNotification, toDTO } from "@/lib/queries";
import { isLocalAuthMode } from "@/lib/auth";
import { localRecord, removeLocalRecord } from "@/lib/local-data";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const data = await getRecord(id);
  if (!data) return Response.json({ error: "Record not found" }, { status: 404 });
  return Response.json(data);
}

const EDITABLE = ["ownerName", "fatherName", "khasraNo", "village", "district", "state", "areaUnit", "landType", "mutationType", "sourceDoc", "notes", "assignedTo"] as const;

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const data = await getRecord(id);
  if (!data) return Response.json({ error: "Record not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const changed: string[] = [];

  for (const key of EDITABLE) {
    if (key in body && body[key] !== undefined) {
      updates[key] = body[key] === "" ? null : String(body[key]);
      changed.push(key);
    }
  }
  if ("areaValue" in body) {
    updates.areaValue = Number(body.areaValue || 0).toFixed(2);
    changed.push("area");
  }

  /* workflow actions */
  const action = typeof body.action === "string" ? body.action : null;
  if (action) {
    const map: Record<string, { status: string; audit: string; notif: string; type: string }> = {
      verify: { status: "verified", audit: "Record verified", notif: "verified", type: "success" },
      reject: { status: "rejected", audit: "Record rejected", notif: "rejected", type: "error" },
      flag: { status: "flagged", audit: "Record flagged", notif: "flagged for field verification", type: "warning" },
      review: { status: "review", audit: "Sent back to review queue", notif: "returned to review queue", type: "info" },
      process: { status: "processing", audit: "Pipeline re-run requested", notif: "re-queued for processing", type: "info" },
    };
    const m = map[action];
    if (!m) return Response.json({ error: "Unknown action" }, { status: 400 });
    updates.status = m.status;
    updates.stage = action === "verify" || action === "reject" ? "done" : action === "process" ? "preprocess" : "validation";
    if (action === "verify") updates.verifiedAt = new Date();
    await logAudit({ recordId: data.record.id, recordNo: data.record.recordNo, actor: user.name, action: m.audit, category: "review", details: body.reason ? String(body.reason) : undefined });
    await pushNotification({ type: m.type, title: `${data.record.recordNo} ${m.notif}`, body: `By ${user.name} · ${data.record.ownerName} · Khasra ${data.record.khasraNo}`, recordId: data.record.id, recordNo: data.record.recordNo });
  } else if (changed.length) {
    await logAudit({ recordId: data.record.id, recordNo: data.record.recordNo, actor: user.name, action: "Fields corrected", category: "review", details: `Edited: ${changed.join(", ")}` });
  }

  if (body.action === "verify" && data.record.confidence < 60) {
    await pushNotification({ type: "warning", title: "Low-confidence verification", body: `${data.record.recordNo} verified at ${data.record.confidence}% confidence`, recordId: data.record.id, recordNo: data.record.recordNo });
  }

  let updated;
  if (isLocalAuthMode) {
    const local = localRecord(data.record.id);
    if (!local) return Response.json({ error: "Record not found" }, { status: 404 });
    Object.assign(local, updates);
    updated = local;
  } else {
    [updated] = await db.update(landRecords).set(updates).where(eq(landRecords.id, data.record.id)).returning();
  }
  return Response.json({ record: toDTO(updated) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const data = await getRecord(id);
  if (!data) return Response.json({ error: "Record not found" }, { status: 404 });
  if (isLocalAuthMode) removeLocalRecord(data.record.id);
  else await db.delete(landRecords).where(eq(landRecords.id, data.record.id));
  await logAudit({ recordNo: data.record.recordNo, actor: user.name, action: "Record deleted", category: "system", details: `${data.record.ownerName} · ${data.record.village}` });
  await pushNotification({ type: "error", title: `${data.record.recordNo} deleted`, body: `By ${user.name}`, recordNo: data.record.recordNo });
  return Response.json({ ok: true });
}
