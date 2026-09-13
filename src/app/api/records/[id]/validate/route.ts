import { eq } from "drizzle-orm";
import { db } from "@/db";
import { landRecords } from "@/db/schema";
import { getSessionUser, isLocalAuthMode } from "@/lib/auth";
import { localRecord } from "@/lib/local-data";
import { getRecord, logAudit, pushNotification, toDTO } from "@/lib/queries";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

type Check = { key: string; label: string; passed: boolean; detail: string };

function checks(record: { ownerName: string; khasraNo: string; village: string; district: string; areaValue: number; confidence: number; extracted: Record<string, { confidence?: number }> }): Check[] {
  return [
    { key: "required", label: "Required fields", passed: Boolean(record.ownerName && record.khasraNo && record.village && record.district), detail: "Owner, khasra, village and district are present" },
    { key: "area", label: "Area consistency", passed: record.areaValue > 0 && record.areaValue <= 10000, detail: "Area is within the supported parcel range" },
    { key: "confidence", label: "AI confidence threshold", passed: record.confidence >= 60, detail: `Overall confidence is ${record.confidence}%` },
    { key: "extraction", label: "OCR extraction quality", passed: Object.values(record.extracted ?? {}).filter((field) => (field.confidence ?? 0) >= 60).length >= 3, detail: "At least three extracted fields meet the review threshold" },
  ];
}

export async function POST(_req: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const data = await getRecord(id);
  if (!data) return Response.json({ error: "Record not found" }, { status: 404 });
  const result = checks(data.record);
  const passed = result.every((check) => check.passed);
  const status = passed ? "verified" : "review";

  if (isLocalAuthMode) {
    const record = localRecord(data.record.id);
    if (!record) return Response.json({ error: "Record not found" }, { status: 404 });
    Object.assign(record, { status, stage: "done", updatedAt: new Date(), ...(passed ? { verifiedAt: new Date() } : {}) });
    await logAudit({ recordId: record.id, recordNo: record.recordNo, actor: user.name, action: passed ? "Validation passed" : "Validation failed — sent to review", category: "review", details: result.map((check) => `${check.label}: ${check.passed ? "pass" : "fail"}`).join(" · ") });
    await pushNotification({ type: passed ? "success" : "warning", title: `${record.recordNo} validation ${passed ? "passed" : "needs review"}`, body: `Validation engine completed by ${user.name}`, recordId: record.id, recordNo: record.recordNo });
    return Response.json({ passed, checks: result, record: toDTO(record) });
  }

  const [record] = await db.update(landRecords).set({ status, stage: "done", updatedAt: new Date(), ...(passed ? { verifiedAt: new Date() } : {}) }).where(eq(landRecords.id, data.record.id)).returning();
  await logAudit({ recordId: record.id, recordNo: record.recordNo, actor: user.name, action: passed ? "Validation passed" : "Validation failed — sent to review", category: "review", details: result.map((check) => `${check.label}: ${check.passed ? "pass" : "fail"}`).join(" · ") });
  return Response.json({ passed, checks: result, record: toDTO(record) });
}
