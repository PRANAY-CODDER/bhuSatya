import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ ok: true, service: "Bhu Satya ingestion API", version: "2.0", latencyMs: 24, capabilities: ["document-upload", "ocr", "field-extraction", "validation", "audit-events"] });
}
