import { eq } from "drizzle-orm";
import { db } from "@/db";
import { landRecords } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { isLocalAuthMode } from "@/lib/auth";
import { localRecord } from "@/lib/local-data";
import { getRecord, logAudit, pushNotification, toDTO } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const stages = ["preprocess", "ocr", "ai", "validation", "done"] as const;

export async function POST(_req: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const data = await getRecord(id);
  if (!data) return Response.json({ error: "Record not found" }, { status: 404 });

  const currentIndex = Math.max(0, stages.indexOf(data.record.stage as (typeof stages)[number]));
  const nextStage = stages[Math.min(stages.length - 1, currentIndex + 1)];
  const updates = { stage: nextStage, status: nextStage === "done" ? "review" : "processing", updatedAt: new Date() };

  if (isLocalAuthMode) {
    const record = localRecord(data.record.id);
    if (!record) return Response.json({ error: "Record not found" }, { status: 404 });
    Object.assign(record, updates, nextStage === "ocr" ? { ocrText: record.ocrText ?? `OCR extracted text for ${record.sourceDoc}` } : {});
    await logAudit({ recordId: record.id, recordNo: record.recordNo, actor: user.name, action: `Pipeline advanced to ${nextStage}`, category: nextStage === "ocr" ? "ocr" : nextStage === "ai" ? "ai" : "preprocess", details: "Automated pipeline step completed" });
    if (nextStage === "done") await pushNotification({ type: "success", title: `${record.recordNo} ready for validation`, body: "OCR and field extraction completed.", recordId: record.id, recordNo: record.recordNo });
    return Response.json({ record: toDTO(record), stage: nextStage });
  }

  const [record] = await db.update(landRecords).set(updates).where(eq(landRecords.id, data.record.id)).returning();
  await logAudit({ recordId: record.id, recordNo: record.recordNo, actor: user.name, action: `Pipeline advanced to ${nextStage}`, category: nextStage === "ocr" ? "ocr" : nextStage === "ai" ? "ai" : "preprocess", details: "Automated pipeline step completed" });
  return Response.json({ record: toDTO(record), stage: nextStage });
}
